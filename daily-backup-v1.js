// RPG Life — one independent cloud safety snapshot per day.
// It NEVER changes the authoritative rpg_state save. Backups live as JSON files in Storage.
(function(){
  const SUPABASE_URL='https://yujryxybceihzqerhjqk.supabase.co';
  const SUPABASE_KEY='sb_publishable_o4akr1u5oU9a0a54O4Ymeg_V6nmzMte';
  const BUCKET='rpg-assets';
  const STATE_KEY='rpg-life-v4';
  const MARKER='rpg-life-daily-backup-v1';
  const AT_KEY='rpg-life-daily-backup-at-v1';
  const TARGET_HOUR=22;
  let sb44=null,timer44=null,running44=false;
  const localDate44=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const isoNow44=()=>new Date().toISOString();

  function state44(){const raw=localStorage.getItem(STATE_KEY);if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}
  async function lib44(){
    if(window.supabase?.createClient)return window.supabase;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
    if(!window.supabase?.createClient)throw new Error('Supabase client unavailable');
    return window.supabase;
  }
  async function client44(){if(sb44)return sb44;const lib=await lib44();sb44=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb44}

  async function makeBackup44(reason='scheduled',force=false){
    if(running44||navigator.onLine===false)return false;
    const date=localDate44();if(!force&&localStorage.getItem(MARKER)===date)return true;
    const snapshot=state44();if(!snapshot)return false;
    running44=true;
    try{
      const c=await client44();const {data:{session}}=await c.auth.getSession();const user=session?.user;if(!user)return false;
      const payload={version:1,kind:'daily-safety-backup',createdAt:isoNow44(),localDate:date,reason,state:snapshot};
      const body=new Blob([JSON.stringify(payload)],{type:'application/json'});
      const path=`${user.id}/backups/${date}.json`;
      const {error}=await c.storage.from(BUCKET).upload(path,body,{contentType:'application/json',upsert:true,cacheControl:'0'});
      if(error)throw error;
      localStorage.setItem(MARKER,date);localStorage.setItem(AT_KEY,payload.createdAt);
      decorateBackupStatus44();
      return true;
    }catch(err){console.warn('Daily safety backup failed',err);return false}
    finally{running44=false}
  }

  function msUntilTarget44(){
    const now=new Date(),target=new Date(now);target.setHours(TARGET_HOUR,30,0,0);if(target<=now)target.setDate(target.getDate()+1);return target-now;
  }
  function schedule44(){clearTimeout(timer44);timer44=setTimeout(async()=>{await makeBackup44('end-of-day',true);schedule44()},msUntilTarget44())}
  async function catchUp44(){
    if(localStorage.getItem(MARKER)===localDate44())return;
    // First opening of the day gives us a safety copy immediately. If the app is still open at 22:30,
    // the same daily file is overwritten with the end-of-day state.
    await makeBackup44('daily-open');
  }
  function decorateBackupStatus44(){
    const modal=document.querySelector('#modal[open]');if(!modal||modal.querySelector('.daily-backup-status44'))return;
    const head=modal.querySelector('.modal-head');if(!head)return;
    const at=localStorage.getItem(AT_KEY),date=localStorage.getItem(MARKER);
    if(!at&&!date)return;
    const row=document.createElement('div');row.className='daily-backup-status44 v2-sub';row.textContent=`Страховочный бэкап: ${date||new Date(at).toLocaleString('ru-RU')}`;head.insertAdjacentElement('afterend',row);
  }
  const observer=new MutationObserver(decorateBackupStatus44);
  function start44(){observer.observe(document.querySelector('#modal')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});catchUp44();schedule44();window.addEventListener('online',catchUp44);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')catchUp44()});setInterval(catchUp44,60*60*1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start44,{once:true});else start44();
  window.rpgMakeDailySafetyBackup=()=>makeBackup44('manual-debug');
})();
