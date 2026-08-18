// RPG Life — manual cloud access only. No background sync, timers or Storage monkey-patching.
(function(){
  const SUPABASE_URL='https://yujryxybceihzqerhjqk.supabase.co';
  const SUPABASE_KEY='sb_publishable_o4akr1u5oU9a0a54O4Ymeg_V6nmzMte';
  const TABLE='rpg_state';
  const STATE_KEY='rpg-life-v4';
  const EMAIL_KEY='rpg-life-login-email';
  const MANUAL_BACKUP_KEY='rpg-life-manual-backup';
  let sb=null;
  let loadingClient=null;

  const $=q=>document.querySelector(q);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function addButton(){
    if($('#cloudManualBtn'))return;
    const host=$('.top-actions');
    if(!host)return;
    const btn=document.createElement('button');
    btn.id='cloudManualBtn';
    btn.className='ghost';
    btn.type='button';
    btn.textContent='☁ Хранилище';
    btn.title='Войти и вручную загрузить сохранение';
    btn.addEventListener('click',openCloud);
    host.prepend(btn);
  }

  function toastSafe(text){
    if(typeof toast==='function')toast(text);
    else alert(text);
  }

  function openHtml(html){
    if(typeof openModal==='function')openModal(html);
    else alert('Не удалось открыть окно хранилища');
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

  function loginPanel(message=''){
    const remembered=localStorage.getItem(EMAIL_KEY)||'';
    openHtml(`<div class="modal-head"><div><div class="v2-kicker">RPG Life</div><h2>Хранилище персонажа</h2></div><button class="close">×</button></div>
      <p>Здесь нет автосинхронизации. Вход только даёт вручную забрать сохранённого персонажа из облака.</p>
      <form id="manualCloudLogin">
        <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(remembered)}"></label>
        <label>Пароль<input name="password" type="password" autocomplete="current-password" required></label>
        ${message?`<div class="cloud-manual-error">${esc(message)}</div>`:''}
        <div class="modal-actions"><button class="primary">Войти</button></div>
      </form>`);
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
        if(!data?.user)throw new Error('Вход не подтверждён');
        showCloudSnapshot();
      }catch(err){
        loginPanel(err?.message||String(err));
      }
    };
  }

  async function fetchSnapshot(){
    const c=await client();
    const {data:{session}}=await c.auth.getSession();
    if(!session?.user)return {needsLogin:true};
    const {data,error}=await c.from(TABLE).select('state,updated_at').eq('user_id',session.user.id).maybeSingle();
    if(error)throw error;
    return {row:data,user:session.user};
  }

  async function showCloudSnapshot(){
    try{
      const result=await fetchSnapshot();
      if(result.needsLogin)return loginPanel();
      const {row,user}=result;
      if(!row?.state){
        openHtml(`<div class="modal-head"><div><div class="v2-kicker">Хранилище</div><h2>Сохранения нет</h2></div><button class="close">×</button></div><p>Для ${esc(user.email||'этого аккаунта')} облачный снимок не найден.</p>`);
        return;
      }
      const when=row.updated_at?new Date(row.updated_at).toLocaleString('ru-RU'):'дата неизвестна';
      const practices=(row.state.practiceLogs||[]).length;
      const creative=(row.state.creativeLogs||[]).length;
      const achievements=(row.state.achievements||[]).length;
      openHtml(`<div class="modal-head"><div><div class="v2-kicker">Хранилище</div><h2>Персонаж найден</h2></div><button class="close">×</button></div>
        <p><b>${esc(user.email||'')}</b></p>
        <div class="v2-card"><small>Снимок</small><h3>${esc(when)}</h3><p>${practices} записей практик · ${creative} творчества · ${achievements} достижений</p></div>
        <p><small>Загрузка заменит текущую локальную копию. Перед заменой я сохраню её отдельной страховочной копией.</small></p>
        <div class="modal-actions"><button class="primary" id="manualCloudRestore">Загрузить этого персонажа</button><button class="ghost" id="manualCloudLogout">Выйти</button></div>`);
      $('#manualCloudRestore').onclick=()=>restoreSnapshot(row);
      $('#manualCloudLogout').onclick=async()=>{const c=await client();await c.auth.signOut();$('#modal')?.close();toastSafe('Вышли из хранилища')};
    }catch(err){
      openHtml(`<div class="modal-head"><h2>Хранилище недоступно</h2><button class="close">×</button></div><p>${esc(err?.message||String(err))}</p><p><small>Локальная RPG при этом продолжает работать.</small></p>`);
    }
  }

  function restoreSnapshot(row){
    if(!row?.state)return;
    if(!confirm('Загрузить персонажа из хранилища и заменить текущую локальную копию?'))return;
    try{
      const current=localStorage.getItem(STATE_KEY);
      if(current)localStorage.setItem(MANUAL_BACKUP_KEY,JSON.stringify({at:new Date().toISOString(),state:JSON.parse(current)}));
    }catch{}
    localStorage.setItem(STATE_KEY,JSON.stringify(row.state));
    localStorage.setItem('rpg-life-cloud-stamp',row.updated_at||new Date().toISOString());
    location.reload();
  }

  async function openCloud(){
    const btn=$('#cloudManualBtn');
    if(btn){btn.disabled=true;btn.textContent='☁ Подключаю…'}
    try{
      const c=await client();
      const {data:{session}}=await c.auth.getSession();
      if(session?.user)await showCloudSnapshot(); else loginPanel();
    }catch(err){
      openHtml(`<div class="modal-head"><h2>Не удалось подключить хранилище</h2><button class="close">×</button></div><p>${esc(err?.message||String(err))}</p><p><small>Сама RPG работает локально и от облака не зависит.</small></p>`);
    }finally{
      if(btn){btn.disabled=false;btn.textContent='☁ Хранилище'}
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton,{once:true});else addButton();
})();
