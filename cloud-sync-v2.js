// RPG Life cloud sync v2 — multi-device safe, cloud-authoritative when clean
(function(){
  const SUPABASE_URL='https://yujryxybceihzqerhjqk.supabase.co';
  const SUPABASE_KEY='sb_publishable_o4akr1u5oU9a0a54O4Ymeg_V6nmzMte';
  const TABLE='rpg_state';
  const BUCKET='rpg-assets';
  const KEY='rpg-life-v4';
  const DIRTY_KEY='rpg-life-unsynced';
  const CLOUD_STAMP='rpg-life-cloud-stamp';
  const BACKUP_HISTORY='rpg-life-safety-history';
  const EMAIL_KEY='rpg-life-login-email';
  const CHECK_MS=10000;
  const SAVE_DEBOUNCE=450;
  const SIGNED_SECONDS=60*60*24*7;

  if(!window.supabase?.createClient){console.error('Supabase client is not loaded');return}
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.rpgSupabase=sb;

  const $=q=>document.querySelector(q);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nativeSetItem=window.__rpgNativeSetItem||Storage.prototype.setItem;
  let currentUser=null,saving=false,bootstrapping=false,lastCloudAt=localStorage.getItem(CLOUD_STAMP)||'',saveTimer=null,pullTimer=null,lastError='';

  const isDirty=()=>localStorage.getItem(DIRTY_KEY)==='1';
  const setDirty=v=>nativeSetItem.call(localStorage,DIRTY_KEY,v?'1':'0');
  const nowIso=()=>new Date().toISOString();

  function ensureCloudButton(){let b=$('#cloudStatusBtn');if(b)return b;const host=$('.top-actions');if(!host)return null;b=document.createElement('button');b.id='cloudStatusBtn';b.className='cloud-status';b.type='button';b.onclick=openAccountPanel;host.prepend(b);return b}
  function setStatus(kind,text){const b=ensureCloudButton();if(!b)return;b.className='cloud-status '+kind;b.innerHTML=`<span class="cloud-dot"></span><span>${safe(text)}</span>`}
  function showError(e){lastError=String(e?.message||e||'Ошибка синхронизации');setStatus('error','Ошибка облака');console.error(e);if(typeof toast==='function')toast(lastError)}

  function authGate(message=''){
    let gate=$('#cloudAuthGate');if(!gate){gate=document.createElement('div');gate.id='cloudAuthGate';gate.className='cloud-auth-gate';document.body.appendChild(gate)}
    const remembered=localStorage.getItem(EMAIL_KEY)||'';
    gate.innerHTML=`<div class="cloud-auth-card"><div class="cloud-auth-mark">✦</div><div><small>RPG Life · облако</small><h2>Войти в своего персонажа</h2><p>После входа прогресс одинаковый на всех устройствах.</p></div><form id="cloudLoginForm"><label>Email<input name="email" type="email" autocomplete="username" required value="${safe(remembered)}"></label><label>Пароль<input name="password" type="password" autocomplete="current-password" required></label>${message?`<div class="cloud-auth-error">${safe(message)}</div>`:''}<button class="primary">Войти</button></form></div>`;
    $('#cloudLoginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');localStorage.setItem(EMAIL_KEY,email);const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){authGate(error.message);return}currentUser=data.user;gate.remove();await bootstrapUser()};
    setStatus('offline','Нужен вход');
  }
  function hideGate(){$('#cloudAuthGate')?.remove()}

  function backupState(){try{const history=JSON.parse(localStorage.getItem(BACKUP_HISTORY)||'[]');history.unshift({at:nowIso(),state:JSON.parse(JSON.stringify(state))});nativeSetItem.call(localStorage,BACKUP_HISTORY,JSON.stringify(history.slice(0,10)))}catch(e){console.warn('Backup failed',e)}}

  function writeStateLocal(next){window.__rpgInternalStateWrite=true;try{state=next;nativeSetItem.call(localStorage,KEY,JSON.stringify(state))}finally{window.__rpgInternalStateWrite=false}if(typeof render==='function')render()}

  function assetItems(){const out=[];(state?.buffDefinitions||[]).forEach(x=>out.push({item:x,folder:'buffs'}));(state?.bosses||[]).forEach(x=>out.push({item:x,folder:'bosses'}));return out}
  const cleanId=id=>String(id||'asset').replace(/[^a-zA-Z0-9_-]/g,'-');
  async function migrateAssets(){if(!currentUser)return;for(const {item,folder} of assetItems()){if(typeof item.imageData==='string'&&item.imageData.startsWith('data:image/')){const path=`${currentUser.id}/${folder}/${cleanId(item.id)}.png`;const blob=await fetch(item.imageData).then(r=>r.blob());const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:'image/png',upsert:true,cacheControl:'3600'});if(error)throw error;item.imagePath=path;delete item.imageData}}}
  async function hydrateAssets(){if(!currentUser)return;const rows=assetItems().filter(x=>x.item.imagePath);if(!rows.length)return;const paths=[...new Set(rows.map(x=>x.item.imagePath))];const {data,error}=await sb.storage.from(BUCKET).createSignedUrls(paths,SIGNED_SECONDS);if(error){console.warn(error);return}const map=new Map((data||[]).map(x=>[x.path,x.signedUrl||x.signedURL]));rows.forEach(({item})=>{const u=map.get(item.imagePath);if(u)item.imageData=u})}
  function cloudClone(){const copy=JSON.parse(JSON.stringify(state));const strip=arr=>(arr||[]).forEach(x=>{if(x.imagePath)delete x.imageData});strip(copy.buffDefinitions);strip(copy.bosses);return copy}

  async function fetchRemote(){const {data,error}=await sb.from(TABLE).select('state,updated_at').eq('user_id',currentUser.id).maybeSingle();if(error)throw error;return data}

  async function pushCloud(force=false){if(!currentUser||saving||bootstrapping)return;if(!force&&!isDirty())return;saving=true;setStatus('saving','Сохраняю…');try{await migrateAssets();const stamp=nowIso();const snapshot=cloudClone();const {error}=await sb.from(TABLE).upsert({user_id:currentUser.id,state:snapshot,updated_at:stamp},{onConflict:'user_id'});if(error)throw error;lastCloudAt=stamp;nativeSetItem.call(localStorage,CLOUD_STAMP,stamp);setDirty(false);setStatus('ok','Синхронизировано')}catch(e){setDirty(true);showError(e)}finally{saving=false}}

  async function applyRemote(row){if(!row?.state)return;backupState();writeStateLocal(row.state);await hydrateAssets();window.__rpgInternalStateWrite=true;try{nativeSetItem.call(localStorage,KEY,JSON.stringify(state))}finally{window.__rpgInternalStateWrite=false}lastCloudAt=row.updated_at||nowIso();nativeSetItem.call(localStorage,CLOUD_STAMP,lastCloudAt);setDirty(false);if(typeof render==='function')render()}

  async function pullCloud(force=false){if(!currentUser||saving||bootstrapping)return;if(!force&&isDirty()){schedulePush();return}try{const row=await fetchRemote();if(!row)return;if(force||!lastCloudAt||new Date(row.updated_at)>new Date(lastCloudAt)){setStatus('saving','Получаю…');await applyRemote(row)}setStatus('ok','Синхронизировано')}catch(e){showError(e)}}

  function schedulePush(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>pushCloud(false),SAVE_DEBOUNCE)}
  window.addEventListener('rpg-life:local-change',()=>{setDirty(true);setStatus('saving','Есть изменения…');schedulePush()});

  function openAccountPanel(){
    if(!currentUser){authGate();return}
    const last=lastCloudAt?new Date(lastCloudAt).toLocaleString('ru-RU'):'ещё не было';
    const dirtyText=isDirty()?'Есть локальные изменения, ещё не отправлены':'Локальных несохранённых изменений нет';
    const html=`<div class="modal-head"><div><div class="v2-kicker">Облако</div><h2>Синхронизация</h2></div><button class="close">×</button></div><div class="cloud-account"><div class="cloud-account-email">${safe(currentUser.email||'')}</div><div class="cloud-account-row"><span>Последняя синхронизация</span><b>${safe(last)}</b></div><div class="cloud-account-row"><span>Состояние устройства</span><b>${safe(dirtyText)}</b></div>${lastError?`<div class="cloud-auth-error">${safe(lastError)}</div>`:''}<div class="modal-actions"><button class="ghost" id="cloudPullNow">Забрать из облака</button><button class="soft" id="cloudPushNow">Сохранить сейчас</button><button class="danger-soft" id="cloudLogout">Выйти</button></div><div class="cloud-auth-note">Чистое устройство всегда получает более свежую облачную версию. Только реальные несохранённые изменения блокируют автозамену.</div></div>`;
    if(typeof openModal!=='function')return;openModal(html);
    $('#cloudPushNow')?.addEventListener('click',async()=>{await pushCloud(true);$('#modal')?.close()});
    $('#cloudPullNow')?.addEventListener('click',async()=>{if(confirm('Заменить текущую копию данными из облака? Перед заменой будет создана страховка.')){setDirty(false);await pullCloud(true)}$('#modal')?.close()});
    $('#cloudLogout')?.addEventListener('click',async()=>{if(isDirty())await pushCloud(true).catch(()=>{});await sb.auth.signOut();currentUser=null;$('#modal')?.close();authGate()});
  }

  async function bootstrapUser(){if(!currentUser)return authGate();bootstrapping=true;hideGate();setStatus('saving','Подключаю облако…');try{const remote=await fetchRemote();if(isDirty()){bootstrapping=false;await pushCloud(true);return}if(remote?.state)await applyRemote(remote);else{setDirty(true);bootstrapping=false;await pushCloud(true);return}setStatus('ok','Синхронизировано')}catch(e){showError(e)}finally{bootstrapping=false}clearInterval(pullTimer);pullTimer=setInterval(()=>{if(isDirty())pushCloud(false);else pullCloud(false)},CHECK_MS)}

  async function start(){ensureCloudButton();const {data}=await sb.auth.getSession();currentUser=data?.session?.user||null;if(currentUser)await bootstrapUser();else authGate();window.addEventListener('focus',()=>{if(isDirty())pushCloud(false);else pullCloud(false)});window.addEventListener('online',()=>{if(isDirty())pushCloud(false);else pullCloud(false)});window.addEventListener('offline',()=>setStatus('offline','Оффлайн'));sb.auth.onAuthStateChange((event,session)=>{const next=session?.user||null;if(next&&!currentUser){currentUser=next;bootstrapUser()}if(!next&&currentUser){currentUser=null;authGate()}})}
  start();
})();
