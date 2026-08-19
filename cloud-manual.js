// RPG Life — safe local-first cloud sync.
// Local saves are immediate. Cloud upload happens only after a real local change
// and only after 2 quiet minutes. Login/focus never pushes local state by itself.
(function(){
  const SUPABASE_URL='https://yujryxybceihzqerhjqk.supabase.co';
  const SUPABASE_KEY='sb_publishable_o4akr1u5oU9a0a54O4Ymeg_V6nmzMte';
  const TABLE='rpg_state';
  const BUCKET='rpg-assets';
  const STATE_KEY='rpg-life-v4';
  const EMAIL_KEY='rpg-life-login-email';
  const BACKUP_KEY='rpg-life-manual-backup';
  const CLOUD_STAMP='rpg-life-cloud-stamp';
  const DIRTY_KEY='rpg-life-unsynced';
  const DIRTY_AT_KEY='rpg-life-unsynced-at';
  const CONFLICT_KEY='rpg-life-sync-conflict';
  const ASSET_HASHES_KEY='rpg-life-asset-hashes-v1';
  const PUSH_DELAY=2*60*1000;
  const PULL_INTERVAL=30*1000;
  const SIGNED_SECONDS=60*60*24*7;

  let sb=null;
  let loadingClient=null;
  let currentUser=null;
  let pushTimer=null;
  let pullTimer=null;
  let saving=false;
  let pulling=false;
  let internalWrite=false;
  let localRevision=0;
  const nativeSetItem=Storage.prototype.setItem;
  const nativeRemoveItem=Storage.prototype.removeItem;

  const $=q=>document.querySelector(q);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isoNow=()=>new Date().toISOString();
  const isNewer=(a,b)=>Boolean(a&&(!b||new Date(a)>new Date(b)));

  function toastSafe(text){
    if(typeof toast==='function')toast(text);
    else console.log(text);
  }

  function openHtml(html){
    if(typeof openModal==='function')openModal(html);
    else alert('Не удалось открыть окно хранилища');
  }

  function cloudButton(){
    let btn=$('#cloudManualBtn');
    if(btn)return btn;
    const host=$('.top-actions');
    if(!host)return null;
    btn=document.createElement('button');
    btn.id='cloudManualBtn';
    btn.className='ghost';
    btn.type='button';
    btn.addEventListener('click',openCloud);
    host.prepend(btn);
    return btn;
  }

  function setStatus(kind,text,title=''){
    const btn=cloudButton();
    if(!btn)return;
    btn.dataset.cloudState=kind;
    btn.textContent=`☁ ${text}`;
    btn.title=title||text;
  }

  function hasDirty(){return localStorage.getItem(DIRTY_KEY)==='1'}
  function userIsEditing(){
    const tag=document.activeElement?.tagName;
    return Boolean(document.querySelector('dialog[open]')||tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT');
  }
  function dirtyAt(){return localStorage.getItem(DIRTY_AT_KEY)||''}

  function markDirty(){
    if(internalWrite)return;
    localRevision++;
    nativeSetItem.call(localStorage,DIRTY_KEY,'1');
    nativeSetItem.call(localStorage,DIRTY_AT_KEY,isoNow());
    nativeRemoveItem.call(localStorage,CONFLICT_KEY);
    setStatus('dirty','Изменения…','Локально сохранено. В облако уйдёт через 2 минуты после последнего изменения.');
    schedulePush();
  }

  // Catch only the actual RPG state key. Auth, UI preferences and sync metadata
  // never count as character changes and can never trigger an upload.
  Storage.prototype.setItem=function(key,value){
    nativeSetItem.call(this,key,value);
    if(this===localStorage&&key===STATE_KEY&&!internalWrite)markDirty();
  };

  function schedulePush(){
    clearTimeout(pushTimer);
    if(!hasDirty())return;
    const at=dirtyAt();
    const age=at?Date.now()-new Date(at).getTime():0;
    const wait=Math.max(0,PUSH_DELAY-Math.max(0,age));
    pushTimer=setTimeout(()=>pushLocal(false),wait);
  }

  function loadSupabase(){
    if(window.supabase?.createClient)return Promise.resolve(window.supabase);
    if(loadingClient)return loadingClient;
    loadingClient=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async=true;
      script.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error('Клиент хранилища не загрузился'));
      script.onerror=()=>reject(new Error('Не удалось загрузить модуль хранилища. RPG продолжает работать локально.'));
      document.head.appendChild(script);
    });
    return loadingClient;
  }

  async function client(){
    if(sb)return sb;
    const lib=await loadSupabase();
    sb=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  async function sessionUser(){
    const c=await client();
    const {data:{session}}=await c.auth.getSession();
    currentUser=session?.user||null;
    return currentUser;
  }

  async function fetchRemote(){
    const user=currentUser||await sessionUser();
    if(!user)return null;
    const c=await client();
    const {data,error}=await c.from(TABLE).select('state,updated_at').eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    return data||null;
  }

  function stateFromLocal(){
    const raw=localStorage.getItem(STATE_KEY);
    if(!raw)return null;
    try{return JSON.parse(raw)}catch{return null}
  }

  function assetItems(snapshot){
    const list=[];
    (snapshot?.buffDefinitions||[]).forEach(item=>list.push({item,folder:'buffs'}));
    (snapshot?.bosses||[]).forEach(item=>list.push({item,folder:'bosses'}));
    return list;
  }

  function cleanId(id){return String(id||'asset').replace(/[^a-zA-Z0-9_-]/g,'-')}
  function quickHash(text){
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(36)+':'+text.length;
  }
  function assetHashes(){try{return JSON.parse(localStorage.getItem(ASSET_HASHES_KEY)||'{}')}catch{return {}}}
  function dataUrlInfo(dataUrl){
    const m=String(dataUrl||'').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if(!m)return null;
    const type=m[1].toLowerCase();
    const ext=type.includes('jpeg')?'jpg':type.includes('webp')?'webp':'png';
    return {type,ext};
  }

  async function prepareSnapshotForCloud(source){
    const next=JSON.parse(JSON.stringify(source||{}));
    const c=await client();
    const hashes=assetHashes();
    let hashesChanged=false;
    for(const {item,folder} of assetItems(next)){
      const key=`${folder}:${cleanId(item?.id)}`;
      const info=dataUrlInfo(item?.imageData);
      if(info){
        const path=`${currentUser.id}/${folder}/${cleanId(item.id)}.${info.ext}`;
        const hash=quickHash(item.imageData);
        if(hashes[key]!==hash){
          const blob=await fetch(item.imageData).then(r=>r.blob());
          const {error}=await c.storage.from(BUCKET).upload(path,blob,{contentType:info.type,upsert:true,cacheControl:'3600'});
          if(error)throw error;
          hashes[key]=hash;hashesChanged=true;
        }
        item.imagePath=path;
        delete item.imageData;
      }else if(item?.imagePath&&item.imageData===''){
        // Explicit removal of a hydrated custom image: remove the cloud object too.
        const {error}=await c.storage.from(BUCKET).remove([item.imagePath]);
        if(error)console.warn('Cloud image removal failed',error);
        delete item.imagePath;delete item.imageData;
        if(key in hashes){delete hashes[key];hashesChanged=true}
      }else if(item?.imagePath){
        // Signed URLs are device-local and expire; only the stable storage path belongs in cloud JSON.
        delete item.imageData;
      }
    }
    if(hashesChanged)nativeSetItem.call(localStorage,ASSET_HASHES_KEY,JSON.stringify(hashes));
    return next;
  }

  async function hydrateSnapshotAssets(snapshot){
    const next=JSON.parse(JSON.stringify(snapshot||{}));
    const items=assetItems(next).map(x=>x.item).filter(item=>item?.imagePath);
    if(!items.length)return next;
    const paths=[...new Set(items.map(item=>item.imagePath).filter(Boolean))];
    if(!paths.length)return next;
    const c=await client();
    const {data,error}=await c.storage.from(BUCKET).createSignedUrls(paths,SIGNED_SECONDS);
    if(error)throw error;
    const urls=new Map((data||[]).map(row=>[row.path,row.signedUrl||row.signedURL]));
    items.forEach(item=>{const url=urls.get(item.imagePath);if(url)item.imageData=url});
    return next;
  }

  function backupLocal(){
    try{
      const current=stateFromLocal();
      if(current)nativeSetItem.call(localStorage,BACKUP_KEY,JSON.stringify({at:isoNow(),state:current}));
    }catch(err){console.warn('Cloud backup failed',err)}
  }

  function writeRemoteLocal(snapshot,stamp){
    internalWrite=true;
    try{
      nativeSetItem.call(localStorage,STATE_KEY,JSON.stringify(snapshot));
      nativeSetItem.call(localStorage,CLOUD_STAMP,stamp||isoNow());
      nativeRemoveItem.call(localStorage,DIRTY_KEY);
      nativeRemoveItem.call(localStorage,DIRTY_AT_KEY);
      nativeRemoveItem.call(localStorage,CONFLICT_KEY);
    }finally{internalWrite=false}

    try{
      if(typeof state!=='undefined')state=snapshot;
      if(typeof render==='function')render();
    }catch(err){
      console.warn('Live render after cloud pull failed, reloading instead',err);
      location.reload();
    }
  }

  async function applyRemote(row,{manual=false}={}){
    if(!row?.state)return false;
    if(hasDirty()&&!manual)return false;
    backupLocal();
    const hydrated=await hydrateSnapshotAssets(row.state);
    writeRemoteLocal(hydrated,row.updated_at||isoNow());
    setStatus('ok','Синхронизировано','На устройстве актуальная облачная версия.');
    return true;
  }

  async function pushLocal(force=false){
    clearTimeout(pushTimer);
    if(saving)return false;
    const user=currentUser||await sessionUser().catch(()=>null);
    if(!user){setStatus('offline','Нужен вход','Локальная копия сохранена. Войдите в хранилище для синхронизации.');return false}
    if(!force&&!hasDirty())return false;

    const localSnapshot=stateFromLocal();
    if(!localSnapshot){setStatus('error','Нет локальной копии');return false}

    saving=true;
    const revisionAtStart=localRevision;
    const rawAtStart=localStorage.getItem(STATE_KEY)||'';
    setStatus('saving','Сохраняю…','Отправляю локальные изменения в облако.');
    try{
      const remote=await fetchRemote();
      const baseline=localStorage.getItem(CLOUD_STAMP)||'';
      if(!force&&remote?.updated_at&&(!baseline||isNewer(remote.updated_at,baseline))){
        nativeSetItem.call(localStorage,CONFLICT_KEY,remote.updated_at);
        setStatus('conflict','Есть новая версия','Облако изменилось на другом устройстве. Автозагрузка остановлена, чтобы ничего не перезаписать.');
        toastSafe('Облако изменилось на другом устройстве — ничего не перезаписываю. Открой «Хранилище».');
        return false;
      }

      const snapshot=await prepareSnapshotForCloud(localSnapshot);
      const stamp=isoNow();
      const c=await client();
      const {error}=await c.from(TABLE).upsert({user_id:user.id,state:snapshot,updated_at:stamp},{onConflict:'user_id'});
      if(error)throw error;
      nativeSetItem.call(localStorage,CLOUD_STAMP,stamp);
      nativeRemoveItem.call(localStorage,CONFLICT_KEY);

      const unchanged=localRevision===revisionAtStart&&(localStorage.getItem(STATE_KEY)||'')===rawAtStart;
      if(unchanged){
        nativeRemoveItem.call(localStorage,DIRTY_KEY);
        nativeRemoveItem.call(localStorage,DIRTY_AT_KEY);
        setStatus('ok','Синхронизировано','Локальные изменения сохранены в облаке.');
      }else{
        setStatus('dirty','Изменения…','Пока шло сохранение, появились новые изменения. Они уйдут отдельной версией через 2 минуты.');
        schedulePush();
      }
      return true;
    }catch(err){
      setStatus('error','Ошибка облака',err?.message||String(err));
      console.error('Cloud push failed',err);
      schedulePush();
      return false;
    }finally{saving=false}
  }

  async function pullIfNew(){
    if(pulling||saving||hasDirty()||userIsEditing())return false;
    const user=currentUser||await sessionUser().catch(()=>null);
    if(!user)return false;
    pulling=true;
    try{
      const row=await fetchRemote();
      if(!row?.state)return false;
      const baseline=localStorage.getItem(CLOUD_STAMP)||'';
      if(!baseline){
        setStatus('choice','Есть облачная версия','Для первого объединения выберите версию вручную в «Хранилище».');
        return false;
      }
      if(row.updated_at&&isNewer(row.updated_at,baseline)){
        setStatus('saving','Получаю…','На другом устройстве появилась более новая версия.');
        await applyRemote(row);
        return true;
      }
      setStatus('ok','Синхронизировано','На устройстве актуальная облачная версия.');
      return false;
    }catch(err){
      console.error('Cloud pull failed',err);
      setStatus('error','Ошибка облака',err?.message||String(err));
      return false;
    }finally{pulling=false}
  }

  function loginPanel(message=''){
    const remembered=localStorage.getItem(EMAIL_KEY)||'';
    openHtml(`<div class="modal-head"><div><div class="v2-kicker">RPG Life</div><h2>Хранилище персонажа</h2></div><button class="close">×</button></div>
      <p>Локально всё сохраняется сразу. В облако изменения уходят через 2 минуты тишины после последней правки.</p>
      <form id="manualCloudLogin">
        <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(remembered)}"></label>
        <label>Пароль<input name="password" type="password" autocomplete="current-password" required></label>
        ${message?`<div class="cloud-manual-error">${esc(message)}</div>`:''}
        <div class="modal-actions"><button class="primary">Войти</button></div>
      </form>
      <p><small>Сам вход ничего не выгружает и не может перезаписать облако.</small></p>`);
    $('#manualCloudLogin').onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget);
      const email=String(f.get('email')||'').trim();
      const password=String(f.get('password')||'');
      localStorage.setItem(EMAIL_KEY,email);
      const submit=e.currentTarget.querySelector('button[type="submit"],button.primary');
      if(submit){submit.disabled=true;submit.textContent='Входим…'}
      try{
        const c=await client();
        const {data,error}=await c.auth.signInWithPassword({email,password});
        if(error)throw error;
        currentUser=data?.user||null;
        if(!currentUser)throw new Error('Вход не подтверждён');
        await afterLogin();
        await showCloudPanel();
      }catch(err){loginPanel(err?.message||String(err))}
    };
  }

  function snapshotStats(snapshot){
    return {
      practices:(snapshot?.practiceLogs||[]).length,
      creative:(snapshot?.creativeLogs||[]).length,
      achievements:(snapshot?.achievements||[]).length,
      images:assetItems(snapshot).filter(x=>x.item?.imagePath||dataUrlInfo(x.item?.imageData)).length
    };
  }

  async function showCloudPanel(){
    try{
      const user=currentUser||await sessionUser();
      if(!user)return loginPanel();
      const row=await fetchRemote();
      const local=stateFromLocal();
      const ls=snapshotStats(local),rs=snapshotStats(row?.state);
      const cloudWhen=row?.updated_at?new Date(row.updated_at).toLocaleString('ru-RU'):'снимка ещё нет';
      const localWhen=dirtyAt()?new Date(dirtyAt()).toLocaleString('ru-RU'):'нет ожидающих изменений';
      const conflict=localStorage.getItem(CONFLICT_KEY);
      openHtml(`<div class="modal-head"><div><div class="v2-kicker">Хранилище</div><h2>Синхронизация</h2></div><button class="close">×</button></div>
        <p><b>${esc(user.email||'')}</b></p>
        ${conflict?'<div class="cloud-manual-error"><b>Обе версии менялись.</b> Автозагрузка остановлена — выбери, какую оставить.</div>':''}
        <div class="v2-card"><small>На этом устройстве</small><h3>${hasDirty()?'Есть несохранённые в облако изменения':'Локальная копия сохранена'}</h3><p>${ls.practices} практик · ${ls.creative} творчества · ${ls.achievements} достижений · ${ls.images} картинок</p><small>Последняя локальная правка: ${esc(localWhen)}</small></div>
        <div class="v2-card"><small>В облаке</small><h3>${esc(cloudWhen)}</h3><p>${rs.practices} практик · ${rs.creative} творчества · ${rs.achievements} достижений · ${rs.images} картинок</p></div>
        <p><small>Обычный режим ничего не спрашивает: после правки ждёт 2 минуты и сохраняет. Если облако успело измениться на другом устройстве, автозагрузка стопорится вместо перезаписи.</small></p>
        <div class="modal-actions">
          ${row?.state?'<button class="ghost" id="manualCloudRestore">Забрать из облака</button>':''}
          <button class="soft" id="manualCloudPush">Сохранить это устройство сейчас</button>
          <button class="danger-soft" id="manualCloudLogout">Выйти</button>
        </div>`);

      $('#manualCloudRestore')?.addEventListener('click',async()=>{
        if(!confirm('Забрать облачную версию и заменить текущую локальную копию? Перед заменой сделаю страховочную копию.'))return;
        const button=$('#manualCloudRestore');if(button){button.disabled=true;button.textContent='Загружаю…'}
        try{await applyRemote(row,{manual:true});$('#modal')?.close();toastSafe('Облачная версия загружена')}
        catch(err){if(button){button.disabled=false;button.textContent='Забрать из облака'}toastSafe(err?.message||String(err))}
      });

      $('#manualCloudPush')?.addEventListener('click',async()=>{
        const warning=row?.updated_at&&isNewer(row.updated_at,localStorage.getItem(CLOUD_STAMP)||'')
          ?'В облаке есть версия, которую это устройство ещё не получало. Сохранить текущую локальную копию поверх неё?'
          :'Сохранить текущую локальную копию в облако прямо сейчас?';
        if(!confirm(warning))return;
        const button=$('#manualCloudPush');if(button){button.disabled=true;button.textContent='Сохраняю…'}
        const ok=await pushLocal(true);
        if(ok){$('#modal')?.close();toastSafe('Текущая версия сохранена в облако')}
        else if(button){button.disabled=false;button.textContent='Сохранить это устройство сейчас'}
      });

      $('#manualCloudLogout')?.addEventListener('click',async()=>{
        const c=await client();await c.auth.signOut();currentUser=null;clearInterval(pullTimer);$('#modal')?.close();setStatus('offline','Нужен вход','Локальные данные продолжают сохраняться на устройстве.');toastSafe('Вышли из хранилища');
      });
    }catch(err){
      openHtml(`<div class="modal-head"><h2>Хранилище недоступно</h2><button class="close">×</button></div><p>${esc(err?.message||String(err))}</p><p><small>Локальная RPG при этом продолжает работать.</small></p>`);
    }
  }

  async function openCloud(){
    const btn=cloudButton();
    if(btn){btn.disabled=true}
    try{
      const user=currentUser||await sessionUser();
      if(user)await showCloudPanel();else loginPanel();
    }catch(err){
      openHtml(`<div class="modal-head"><h2>Не удалось подключить хранилище</h2><button class="close">×</button></div><p>${esc(err?.message||String(err))}</p><p><small>Сама RPG работает локально и от облака не зависит.</small></p>`);
    }finally{if(btn)btn.disabled=false}
  }

  async function afterLogin(){
    clearInterval(pullTimer);
    pullTimer=setInterval(()=>{if(document.visibilityState==='visible')pullIfNew()},PULL_INTERVAL);
    if(hasDirty()){
      setStatus('dirty','Изменения…','Есть локальные изменения. Вход их не отправляет; действует обычная двухминутная задержка.');
      schedulePush();
    }else{
      await pullIfNew();
    }
  }

  async function start(){
    cloudButton();
    if(hasDirty())setStatus('dirty','Изменения…','Локальные изменения ждут безопасной выгрузки.');
    else setStatus('offline','Хранилище','Облако подключится в фоне, если вход уже сохранён.');

    try{
      currentUser=await sessionUser();
      if(currentUser)await afterLogin();
      else setStatus('offline','Нужен вход','Локальные данные сохраняются независимо от облака.');
    }catch(err){
      console.warn('Cloud bootstrap failed',err);
      setStatus('error','Облако недоступно','Локальная RPG продолжает работать.');
    }

    window.addEventListener('focus',()=>pullIfNew());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullIfNew()});
    window.addEventListener('online',()=>{if(hasDirty())schedulePush();else pullIfNew()});
    window.addEventListener('offline',()=>setStatus('offline','Оффлайн','Изменения остаются локально и никуда не пропадут.'));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
