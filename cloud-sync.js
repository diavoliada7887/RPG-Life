// RPG Life cloud sync — Supabase Auth + rpg_state + private Storage
(function(){
  const SUPABASE_URL='https://yujryxybceihzqerhjqk.supabase.co';
  const SUPABASE_KEY='sb_publishable_o4akr1u5oU9a0a54O4Ymeg_V6nmzMte';
  const TABLE='rpg_state';
  const BUCKET='rpg-assets';
  const CLOUD_STAMP='rpg-life-cloud-stamp';
  const EMAIL_KEY='rpg-life-login-email';
  const CHECK_MS=12000;
  const SAVE_DEBOUNCE=900;
  const SIGNED_SECONDS=60*60*24*7;

  if(!window.supabase?.createClient){
    console.error('Supabase client is not loaded');
    return;
  }
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  window.rpgSupabase=sb;

  let currentUser=null;
  let lastObserved='';
  let lastCloudAt=localStorage.getItem(CLOUD_STAMP)||'';
  let dirty=false;
  let saving=false;
  let saveTimer=null;
  let pullTimer=null;
  let bootstrapping=false;
  const hydratedItems=new WeakSet();

  const $=q=>document.querySelector(q);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localIso=()=>new Date().toISOString();

  function ensureCloudButton(){
    let b=$('#cloudStatusBtn');
    if(b)return b;
    const host=$('.top-actions');
    if(!host)return null;
    b=document.createElement('button');
    b.id='cloudStatusBtn';b.className='cloud-status';b.type='button';
    b.onclick=openAccountPanel;
    host.prepend(b);
    return b;
  }
  function setStatus(kind,text){
    const b=ensureCloudButton();if(!b)return;
    b.className='cloud-status '+kind;b.innerHTML=`<span class="cloud-dot"></span><span>${safe(text)}</span>`;
  }
  function showError(message){setStatus('error','Ошибка облака');console.error(message);if(typeof toast==='function')toast(String(message||'Ошибка синхронизации'))}

  function authGate(message=''){
    let gate=$('#cloudAuthGate');
    if(!gate){
      gate=document.createElement('div');gate.id='cloudAuthGate';gate.className='cloud-auth-gate';document.body.appendChild(gate);
    }
    const remembered=localStorage.getItem(EMAIL_KEY)||'';
    gate.innerHTML=`<div class="cloud-auth-card"><div class="cloud-auth-mark">✦</div><div><small>RPG Life · облако</small><h2>Войти в своего персонажа</h2><p>После входа прогресс и картинки будут одинаковыми на всех устройствах.</p></div><form id="cloudLoginForm"><label>Email<input name="email" type="email" autocomplete="username" required value="${safe(remembered)}"></label><label>Пароль<input name="password" type="password" autocomplete="current-password" required></label>${message?`<div class="cloud-auth-error">${safe(message)}</div>`:''}<button class="primary">Войти</button></form><div class="cloud-auth-note">Локальная копия остаётся на устройстве даже без сети.</div></div>`;
    $('#cloudLoginForm').onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
      localStorage.setItem(EMAIL_KEY,email);setStatus('saving','Входим…');
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error){authGate(error.message);setStatus('error','Не вошли');return}
      currentUser=data.user;gate.remove();await bootstrapUser();
    };
    setStatus('offline','Нужен вход');
  }
  function hideGate(){ $('#cloudAuthGate')?.remove(); }

  function openAccountPanel(){
    if(!currentUser){authGate();return}
    const last=lastCloudAt?new Date(lastCloudAt).toLocaleString('ru-RU'):'ещё не было';
    const html=`<div class="modal-head"><div><div class="v2-kicker">Облако</div><h2>Синхронизация</h2></div><button class="close">×</button></div><div class="cloud-account"><div class="cloud-account-email">${safe(currentUser.email||'')}</div><div class="cloud-account-row"><span>Последняя синхронизация</span><b>${safe(last)}</b></div><div class="modal-actions"><button class="ghost" id="cloudPullNow">Забрать из облака</button><button class="soft" id="cloudPushNow">Сохранить сейчас</button><button class="danger-soft" id="cloudLogout">Выйти</button></div></div>`;
    if(typeof openModal==='function')openModal(html);else return;
    $('#cloudPushNow')?.addEventListener('click',async()=>{await pushCloud(true);$('#modal')?.close()});
    $('#cloudPullNow')?.addEventListener('click',async()=>{await pullCloud(true);$('#modal')?.close()});
    $('#cloudLogout')?.addEventListener('click',async()=>{await pushCloud(true).catch(()=>{});await sb.auth.signOut();currentUser=null;$('#modal')?.close();authGate()});
  }

  function assetItems(){
    const list=[];
    (state?.buffDefinitions||[]).forEach(x=>list.push({item:x,folder:'buffs'}));
    (state?.bosses||[]).forEach(x=>list.push({item:x,folder:'bosses'}));
    return list;
  }
  function dataUrlToBlob(dataUrl){return fetch(dataUrl).then(r=>r.blob())}
  function cleanId(id){return String(id||'asset').replace(/[^a-zA-Z0-9_-]/g,'-')}

  async function hydrateAssets(){
    if(!currentUser)return;
    const rows=assetItems().filter(x=>x.item.imagePath);
    if(!rows.length)return;
    const paths=[...new Set(rows.map(x=>x.item.imagePath))];
    const {data,error}=await sb.storage.from(BUCKET).createSignedUrls(paths,SIGNED_SECONDS);
    if(error){console.warn('Signed URLs:',error);return}
    const map=new Map((data||[]).map(x=>[x.path,x.signedUrl||x.signedURL]));
    rows.forEach(({item})=>{const url=map.get(item.imagePath);if(url)item.imageData=url;hydratedItems.add(item)});
  }

  async function migrateAssets(){
    if(!currentUser)return false;
    let changed=false;
    for(const {item,folder} of assetItems()){
      // A hydrated image was deliberately removed in the editor.
      if(item.imagePath&&item.imageData===''&&hydratedItems.has(item)){
        const old=item.imagePath;
        const {error}=await sb.storage.from(BUCKET).remove([old]);
        if(error)throw error;
        delete item.imagePath;changed=true;continue;
      }
      if(typeof item.imageData==='string'&&item.imageData.startsWith('data:image/png')){
        const path=`${currentUser.id}/${folder}/${cleanId(item.id)}.png`;
        const blob=await dataUrlToBlob(item.imageData);
        const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:'image/png',upsert:true,cacheControl:'3600'});
        if(error)throw error;
        item.imagePath=path;
        const {data:signed,error:signErr}=await sb.storage.from(BUCKET).createSignedUrl(path,SIGNED_SECONDS);
        if(signErr)throw signErr;
        item.imageData=signed?.signedUrl||signed?.signedURL||'';
        hydratedItems.add(item);changed=true;
      }
    }
    if(changed){
      localStorage.setItem(KEY,JSON.stringify(state));
      lastObserved=localStorage.getItem(KEY)||'';
      if(typeof render==='function')render();
    }
    return changed;
  }

  function cloudClone(){
    const copy=JSON.parse(JSON.stringify(state));
    const strip=arr=>(arr||[]).forEach(x=>{if(x.imagePath)delete x.imageData});
    strip(copy.buffDefinitions);strip(copy.bosses);
    return copy;
  }

  async function pushCloud(force=false){
    if(!currentUser||saving||bootstrapping)return;
    if(!dirty&&!force)return;
    saving=true;setStatus('saving','Сохраняю…');
    try{
      await migrateAssets();
      const stamp=localIso();
      const {error}=await sb.from(TABLE).upsert({user_id:currentUser.id,state:cloudClone(),updated_at:stamp},{onConflict:'user_id'});
      if(error)throw error;
      lastCloudAt=stamp;localStorage.setItem(CLOUD_STAMP,stamp);dirty=false;
      lastObserved=localStorage.getItem(KEY)||'';
      setStatus('ok','Синхронизировано');
    }catch(e){dirty=true;showError(e.message||e)}finally{saving=false}
  }

  async function fetchRemote(){
    const {data,error}=await sb.from(TABLE).select('state,updated_at').eq('user_id',currentUser.id).maybeSingle();
    if(error)throw error;return data;
  }

  async function applyRemote(row){
    if(!row?.state)return false;
    state=row.state;
    await hydrateAssets();
    localStorage.setItem(KEY,JSON.stringify(state));
    lastObserved=localStorage.getItem(KEY)||'';
    lastCloudAt=row.updated_at||localIso();localStorage.setItem(CLOUD_STAMP,lastCloudAt);
    dirty=false;
    if(typeof render==='function')render();
    return true;
  }

  async function pullCloud(force=false){
    if(!currentUser||bootstrapping||saving)return;
    try{
      const row=await fetchRemote();if(!row)return;
      if(force||(!dirty&&(!lastCloudAt||new Date(row.updated_at)>new Date(lastCloudAt)))){
        setStatus('saving','Получаю…');await applyRemote(row);setStatus('ok','Синхронизировано');
      }
    }catch(e){showError(e.message||e)}
  }

  function watchLocal(){
    const raw=localStorage.getItem(KEY)||'';
    if(raw===lastObserved)return;
    lastObserved=raw;dirty=true;setStatus('saving','Есть изменения…');
    clearTimeout(saveTimer);saveTimer=setTimeout(()=>pushCloud(),SAVE_DEBOUNCE);
  }

  async function bootstrapUser(){
    if(!currentUser)return authGate();
    bootstrapping=true;hideGate();setStatus('saving','Подключаю облако…');
    try{
      const remote=await fetchRemote();
      if(remote?.state){
        await applyRemote(remote);
        // Old cloud rows may still contain base64 artwork. Move it once.
        const moved=await migrateAssets();if(moved){dirty=true}
      }else{
        await migrateAssets();dirty=true;
      }
      bootstrapping=false;
      await pushCloud(!remote);
      setStatus('ok','Синхронизировано');
    }catch(e){bootstrapping=false;showError(e.message||e)}
    lastObserved=localStorage.getItem(KEY)||'';
    clearInterval(pullTimer);pullTimer=setInterval(()=>pullCloud(false),CHECK_MS);
  }

  async function start(){
    ensureCloudButton();
    lastObserved=localStorage.getItem(KEY)||'';
    const {data}=await sb.auth.getSession();
    currentUser=data?.session?.user||null;
    if(currentUser)await bootstrapUser();else authGate();
    setInterval(watchLocal,700);
    window.addEventListener('focus',()=>pullCloud(false));
    window.addEventListener('online',()=>{setStatus('saving','Связь вернулась…');dirty=true;pushCloud(true)});
    window.addEventListener('offline',()=>setStatus('offline','Оффлайн'));
    sb.auth.onAuthStateChange((event,session)=>{
      const next=session?.user||null;
      if(next&&!currentUser){currentUser=next;bootstrapUser()}
      if(!next&&currentUser){currentUser=null;authGate()}
    });
  }

  start();
})();