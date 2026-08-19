// RPG Life — explicit authoritative cloud saves.
// Every gameplay edit is still saved locally immediately.
// Cloud is changed ONLY when the user presses Save. The last explicit Save wins.
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
  const ASSET_HASHES_KEY='rpg-life-asset-hashes-v1';
  const SIGNED_SECONDS=60*60*24*7;

  let sb=null;
  let loadingClient=null;
  let currentUser=null;
  let saving=false;
  let internalWrite=false;
  let pendingSaveAfterLogin=false;

  const nativeSetItem=Storage.prototype.setItem;
  const nativeRemoveItem=Storage.prototype.removeItem;
  const $=q=>document.querySelector(q);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isoNow=()=>new Date().toISOString();

  function toastSafe(text){
    if(typeof toast==='function')toast(text);
    else console.log(text);
  }

  function openHtml(html){
    if(typeof openModal==='function')openModal(html);
    else alert('Не удалось открыть окно хранилища');
  }

  function hasDirty(){return localStorage.getItem(DIRTY_KEY)==='1'}
  function dirtyAt(){return localStorage.getItem(DIRTY_AT_KEY)||''}

  function storageButton(){
    let btn=$('#cloudManualBtn');
    if(btn)return btn;
    const host=$('.top-actions');
    if(!host)return null;
    btn=document.createElement('button');
    btn.id='cloudManualBtn';
    btn.className='ghost';
    btn.type='button';
    btn.textContent='☁ Хранилище';
    btn.title='Вход, облачная копия и восстановление';
    btn.addEventListener('click',openCloud);
    host.prepend(btn);
    return btn;
  }

  function saveButton(){
    let btn=$('#cloudSaveNowBtn');
    if(btn)return btn;
    const host=$('.top-actions');
    if(!host)return null;
    btn=document.createElement('button');
    btn.id='cloudSaveNowBtn';
    btn.className='soft';
    btn.type='button';
    btn.addEventListener('click',saveNowFromTop);
    const quick=$('#quickAddBtn');
    if(quick)host.insertBefore(btn,quick);else host.appendChild(btn);
    paintSaveButton();
    return btn;
  }

  function paintSaveButton(kind=''){
    const btn=$('#cloudSaveNowBtn');
    if(!btn)return;
    if(kind==='saving'){
      btn.disabled=true;
      btn.textContent='💾 Сохраняю…';
      btn.title='Отправляю эту локальную версию в облако';
      return;
    }
    btn.disabled=false;
    if(kind==='saved'||!hasDirty()){
      btn.textContent='✓ Сохранено';
      btn.title='Облачная копия совпадает с последним ручным сохранением этого устройства';
    }else{
      btn.textContent='💾 Сохранить';
      btn.title='Сделать версию на этом устройстве главной облачной версией';
    }
  }

  function markDirty(){
    if(internalWrite)return;
    nativeSetItem.call(localStorage,DIRTY_KEY,'1');
    nativeSetItem.call(localStorage,DIRTY_AT_KEY,isoNow());
    paintSaveButton();
  }

  // Only RPG state edits mark the manual cloud save as stale.
  Storage.prototype.setItem=function(key,value){
    nativeSetItem.call(this,key,value);
    if(this===localStorage&&key===STATE_KEY&&!internalWrite)markDirty();
  };

  function loadSupabase(){
    if(window.supabase?.createClient)return Promise.resolve(window.supabase);
    if(loadingClient)return loadingClient;
    loadingClient=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async=true;
      script.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error('Клиент хранилища не загрузился'));
      script.onerror=()=>reject(new Error('Не удалось загрузить модуль хранилища. Локальная RPG продолжает работать.'));
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
          hashes[key]=hash;
          hashesChanged=true;
        }
        item.imagePath=path;
        delete item.imageData;
      }else if(item?.imagePath&&item.imageData===''){
        const {error}=await c.storage.from(BUCKET).remove([item.imagePath]);
        if(error)console.warn('Cloud image removal failed',error);
        delete item.imagePath;
        delete item.imageData;
        if(key in hashes){delete hashes[key];hashesChanged=true}
      }else if(item?.imagePath){
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
    }finally{internalWrite=false}
    try{
      if(typeof state!=='undefined')state=snapshot;
      if(typeof render==='function')render();
    }catch(err){
      console.warn('Live render after cloud restore failed, reloading instead',err);
      location.reload();
    }
    paintSaveButton('saved');
  }

  async function applyRemote(row){
    if(!row?.state)return false;
    backupLocal();
    const hydrated=await hydrateSnapshotAssets(row.state);
    writeRemoteLocal(hydrated,row.updated_at||isoNow());
    return true;
  }

  async function forceSave(){
    if(saving)return false;
    const user=currentUser||await sessionUser().catch(()=>null);
    if(!user)return false;
    const localSnapshot=stateFromLocal();
    if(!localSnapshot)throw new Error('Нет локальной копии персонажа');
    saving=true;
    paintSaveButton('saving');
    try{
      // Deliberately no conflict check and no merge: the explicit Save button is authoritative.
      const snapshot=await prepareSnapshotForCloud(localSnapshot);
      const stamp=isoNow();
      const c=await client();
      const {error}=await c.from(TABLE).upsert({user_id:user.id,state:snapshot,updated_at:stamp},{onConflict:'user_id'});
      if(error)throw error;
      nativeSetItem.call(localStorage,CLOUD_STAMP,stamp);
      nativeRemoveItem.call(localStorage,DIRTY_KEY);
      nativeRemoveItem.call(localStorage,DIRTY_AT_KEY);
      paintSaveButton('saved');
      return true;
    }finally{
      saving=false;
      if(hasDirty())paintSaveButton();
    }
  }

  async function saveNowFromTop(){
    if(navigator.onLine===false){toastSafe('Сейчас офлайн. Локально всё сохранено; облако не трогаю.');return}
    try{
      const user=currentUser||await sessionUser();
      if(!user){pendingSaveAfterLogin=true;loginPanel('Войди один раз — после входа сразу сохраню эту версию.');return}
      const ok=await forceSave();
      if(ok)toastSafe('Сохранено. Эта версия теперь главная в облаке.');
    }catch(err){
      paintSaveButton();
      toastSafe(err?.message||String(err));
    }
  }

  function loginPanel(message=''){
    const remembered=localStorage.getItem(EMAIL_KEY)||'';
    openHtml(`<div class="modal-head"><div><div class="v2-kicker">RPG Life</div><h2>Хранилище персонажа</h2></div><button class="close">×</button></div>
      <p>На устройстве всё сохраняется автоматически. Облако меняется только по кнопке <b>«Сохранить»</b>.</p>
      <form id="manualCloudLogin">
        <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(remembered)}"></label>
        <label>Пароль<input name="password" type="password" autocomplete="current-password" required></label>
        ${message?`<div class="cloud-manual-error">${esc(message)}</div>`:''}
        <div class="modal-actions"><button class="primary">Войти</button></div>
      </form>
      <p><small>Вход сам по себе ничего не выгружает и ничего не забирает из облака.</small></p>`);
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
        if(pendingSaveAfterLogin){
          pendingSaveAfterLogin=false;
          const ok=await forceSave();
          $('#modal')?.close();
          if(ok)toastSafe('Сохранено. Эта версия теперь главная в облаке.');
        }else{
          await showCloudPanel();
        }
      }catch(err){loginPanel(err?.message||String(err))}
    };
  }

  function snapshotStats(snapshot){
    const bosses=(snapshot?.bosses||[]).filter(b=>!b.victoryConfirmed);
    return {
      practices:(snapshot?.practiceLogs||[]).length,
      creative:(snapshot?.creativeLogs||[]).length,
      achievements:(snapshot?.achievements||[]).length,
      images:assetItems(snapshot).filter(x=>x.item?.imagePath||dataUrlInfo(x.item?.imageData)).length,
      bosses:bosses.length,
      sleeping:bosses.filter(b=>b.status==='sleeping').length
    };
  }

  function statLine(s){
    return `${s.practices} практик · ${s.creative} творчества · ${s.bosses} боссов (${s.sleeping} спят) · ${s.achievements} достижений · ${s.images} картинок`;
  }

  async function showCloudPanel(){
    try{
      const user=currentUser||await sessionUser();
      if(!user)return loginPanel();
      const row=await fetchRemote();
      const local=stateFromLocal();
      const ls=snapshotStats(local),rs=snapshotStats(row?.state);
      const cloudWhen=row?.updated_at?new Date(row.updated_at).toLocaleString('ru-RU'):'снимка ещё нет';
      const localWhen=dirtyAt()?new Date(dirtyAt()).toLocaleString('ru-RU'):'после последнего ручного сохранения не менялась';
      openHtml(`<div class="modal-head"><div><div class="v2-kicker">Хранилище</div><h2>Ручной сейв</h2></div><button class="close">×</button></div>
        <p><b>${esc(user.email||'')}</b></p>
        <div class="cloud-manual-error" style="border-color:#d7c7ff;background:#faf7ff;color:inherit"><b>Правило простое:</b> устройство, на котором нажали «Сохранить» последним, становится главной облачной версией. Никакого автоматического объединения.</div>
        <div class="v2-card"><small>На этом устройстве</small><h3>${hasDirty()?'Есть изменения после последнего сейва':'Совпадает с последним ручным сейвом'}</h3><p>${esc(statLine(ls))}</p><small>Последняя локальная правка: ${esc(localWhen)}</small></div>
        <div class="v2-card"><small>В облаке</small><h3>${esc(cloudWhen)}</h3><p>${esc(statLine(rs))}</p></div>
        <div class="modal-actions">
          ${row?.state?'<button class="ghost" id="manualCloudRestore">Забрать из облака</button>':''}
          <button class="primary" id="manualCloudPush">Сохранить это устройство</button>
          <button class="danger-soft" id="manualCloudLogout">Выйти</button>
        </div>`);

      $('#manualCloudRestore')?.addEventListener('click',async()=>{
        if(!confirm('Забрать облачную версию и заменить ею текущую локальную копию? Перед заменой сохраню страховочную копию локально.'))return;
        const button=$('#manualCloudRestore');if(button){button.disabled=true;button.textContent='Загружаю…'}
        try{
          await applyRemote(row);
          $('#modal')?.close();
          toastSafe('Облачная версия загружена на это устройство');
        }catch(err){
          if(button){button.disabled=false;button.textContent='Забрать из облака'}
          toastSafe(err?.message||String(err));
        }
      });

      $('#manualCloudPush')?.addEventListener('click',async()=>{
        if(!confirm('Сделать текущую версию этого устройства главной и перезаписать облачную копию?'))return;
        const button=$('#manualCloudPush');if(button){button.disabled=true;button.textContent='Сохраняю…'}
        try{
          const ok=await forceSave();
          if(ok){$('#modal')?.close();toastSafe('Сохранено. Эта версия теперь главная в облаке.')}
        }catch(err){
          if(button){button.disabled=false;button.textContent='Сохранить это устройство'}
          toastSafe(err?.message||String(err));
        }
      });

      $('#manualCloudLogout')?.addEventListener('click',async()=>{
        const c=await client();
        await c.auth.signOut();
        currentUser=null;
        $('#modal')?.close();
        toastSafe('Вышли из хранилища. Локальные данные на месте.');
      });
    }catch(err){
      openHtml(`<div class="modal-head"><h2>Хранилище недоступно</h2><button class="close">×</button></div><p>${esc(err?.message||String(err))}</p><p><small>Локальная RPG при этом продолжает работать.</small></p>`);
    }
  }

  async function openCloud(){
    const btn=storageButton();
    if(btn)btn.disabled=true;
    try{
      const user=currentUser||await sessionUser();
      if(user)await showCloudPanel();else loginPanel();
    }catch(err){
      openHtml(`<div class="modal-head"><h2>Не удалось подключить хранилище</h2><button class="close">×</button></div><p>${esc(err?.message||String(err))}</p><p><small>Сама RPG работает локально и от облака не зависит.</small></p>`);
    }finally{if(btn)btn.disabled=false}
  }

  async function start(){
    storageButton();
    saveButton();
    paintSaveButton();
    try{currentUser=await sessionUser()}catch(err){console.warn('Cloud bootstrap failed',err)}
    window.addEventListener('online',()=>paintSaveButton());
    window.addEventListener('offline',()=>toastSafe('Оффлайн: локально всё сохраняется, облако ждёт кнопку «Сохранить».'));
  }

  window.rpgCloudSaveNow=forceSave;
  window.rpgCloudOpen=openCloud;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
