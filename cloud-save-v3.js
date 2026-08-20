// RPG Life — robust explicit cloud save guard.
// Keeps the manual "last Save wins" model, but prevents an Android/network request from leaving the button stuck forever.
(function(){
  const SUPABASE_URL='https://yujryxybceihzqerhjqk.supabase.co';
  const SUPABASE_KEY='sb_publishable_o4akr1u5oU9a0a54O4Ymeg_V6nmzMte';
  const TABLE='rpg_state';
  const BUCKET='rpg-assets';
  const STATE_KEY='rpg-life-v4';
  const CLOUD_STAMP='rpg-life-cloud-stamp';
  const DIRTY_KEY='rpg-life-unsynced';
  const DIRTY_AT_KEY='rpg-life-unsynced-at';
  const ASSET_HASHES_KEY='rpg-life-asset-hashes-v1';
  const REQUEST_TIMEOUT=18000;

  let sb45=null;
  let saving45=false;

  const button=()=>document.querySelector('#cloudSaveNowBtn');
  const toast45=text=>{if(typeof toast==='function')toast(text);else console.log(text)};
  const paint45=kind=>{
    const b=button();if(!b)return;
    b.disabled=kind==='saving';
    if(kind==='saving')b.textContent='💾 Сохраняю…';
    else if(kind==='saved')b.textContent='✓ Сохранено';
    else b.textContent='💾 Сохранить';
  };
  const timeout45=(promise,label,ms=REQUEST_TIMEOUT)=>new Promise((resolve,reject)=>{
    const id=setTimeout(()=>reject(new Error(`${label}: облако не ответило за ${Math.round(ms/1000)} сек.`)),ms);
    Promise.resolve(promise).then(v=>{clearTimeout(id);resolve(v)},err=>{clearTimeout(id);reject(err)});
  });

  async function client45(){
    if(sb45)return sb45;
    if(!window.supabase?.createClient)throw new Error('Модуль облачного хранилища ещё не загрузился. Попробуй ещё раз через пару секунд.');
    sb45=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return sb45;
  }

  function assetItems45(snapshot){
    const list=[];
    (snapshot?.buffDefinitions||[]).forEach(item=>list.push({item,folder:'buffs'}));
    (snapshot?.bosses||[]).forEach(item=>list.push({item,folder:'bosses'}));
    return list;
  }
  const clean45=id=>String(id||'asset').replace(/[^a-zA-Z0-9_-]/g,'-');
  function quickHash45(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+':'+text.length}
  function hashes45(){try{return JSON.parse(localStorage.getItem(ASSET_HASHES_KEY)||'{}')}catch{return {}}}
  function dataInfo45(dataUrl){const m=String(dataUrl||'').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);if(!m)return null;const type=m[1].toLowerCase();return{type,ext:type.includes('jpeg')?'jpg':type.includes('webp')?'webp':'png'}}
  function dataBlob45(dataUrl,type){
    const comma=String(dataUrl).indexOf(',');
    if(comma<0)throw new Error('Повреждённая картинка в локальном сейве');
    const bin=atob(String(dataUrl).slice(comma+1)),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new Blob([bytes],{type});
  }

  async function prepare45(source,user,c){
    const next=JSON.parse(JSON.stringify(source||{})),hashes=hashes45();let changed=false;
    for(const {item,folder} of assetItems45(next)){
      const key=`${folder}:${clean45(item?.id)}`,info=dataInfo45(item?.imageData);
      if(info){
        const path=`${user.id}/${folder}/${clean45(item.id)}.${info.ext}`,hash=quickHash45(item.imageData);
        if(hashes[key]!==hash){
          const blob=dataBlob45(item.imageData,info.type);
          const result=await timeout45(c.storage.from(BUCKET).upload(path,blob,{contentType:info.type,upsert:true,cacheControl:'3600'}),'Загрузка картинки');
          if(result?.error)throw result.error;
          hashes[key]=hash;changed=true;
        }
        item.imagePath=path;delete item.imageData;
      }else if(item?.imagePath&&item.imageData===''){
        try{await timeout45(c.storage.from(BUCKET).remove([item.imagePath]),'Удаление картинки',10000)}catch(err){console.warn(err)}
        delete item.imagePath;delete item.imageData;if(key in hashes){delete hashes[key];changed=true}
      }else if(item?.imagePath){delete item.imageData}
    }
    if(changed)localStorage.setItem(ASSET_HASHES_KEY,JSON.stringify(hashes));
    return next;
  }

  async function robustSave45(){
    if(saving45)return false;
    if(navigator.onLine===false){toast45('Сейчас офлайн. Локально всё сохранено; облако не трогаю.');return false}
    const raw=localStorage.getItem(STATE_KEY);
    if(!raw)throw new Error('Нет локальной копии персонажа');
    let local;try{local=JSON.parse(raw)}catch{throw new Error('Локальный сейв повреждён')}

    const c=await client45();
    const sessionResult=await timeout45(c.auth.getSession(),'Проверка входа',10000);
    const user=sessionResult?.data?.session?.user||null;
    if(!user){
      toast45('Нужно войти в Хранилище. После входа нажми «Сохранить» ещё раз.');
      if(typeof window.rpgCloudOpen==='function')window.rpgCloudOpen();
      return false;
    }

    saving45=true;paint45('saving');
    try{
      const snapshot=await prepare45(local,user,c);
      const stamp=new Date().toISOString();
      const result=await timeout45(c.from(TABLE).upsert({user_id:user.id,state:snapshot,updated_at:stamp},{onConflict:'user_id'}),'Сохранение персонажа');
      if(result?.error)throw result.error;

      localStorage.setItem(CLOUD_STAMP,stamp);
      // If something changed locally while the request was in flight, do not lie that the newer state is in cloud.
      if(localStorage.getItem(STATE_KEY)===raw){
        localStorage.removeItem(DIRTY_KEY);localStorage.removeItem(DIRTY_AT_KEY);paint45('saved');
        toast45('Сохранено. Эта версия теперь главная в облаке.');
      }else{
        paint45('dirty');
        toast45('Сейв отправлен, но пока он летел появилась новая правка. Нажми «Сохранить» ещё раз.');
      }
      return true;
    }catch(err){
      paint45('dirty');
      toast45(`${err?.message||String(err)} Локально всё сохранено.`);
      return false;
    }finally{saving45=false}
  }

  // Capture before cloud-manual-v2's old target listener, so a stalled request cannot own the button forever.
  document.addEventListener('click',e=>{
    const top=e.target.closest?.('#cloudSaveNowBtn');
    if(top){e.preventDefault();e.stopImmediatePropagation();robustSave45();return}
    const panel=e.target.closest?.('#manualCloudPush');
    if(panel){
      e.preventDefault();e.stopImmediatePropagation();
      if(!confirm('Сделать текущую версию этого устройства главной и перезаписать облачную копию?'))return;
      robustSave45().then(ok=>{if(ok)document.querySelector('#modal')?.close()});
    }
  },true);

  window.rpgCloudSaveNow=robustSave45;
})();
