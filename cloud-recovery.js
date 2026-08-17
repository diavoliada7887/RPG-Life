// RPG Life cloud recovery guard — backup history + visible diagnostics
(function(){
  const BACKUP_KEY='rpg-life-safety-backup';
  const HISTORY_KEY='rpg-life-safety-history';
  const ERROR_KEY='rpg-life-cloud-last-error';
  const MAX_BACKUPS=12;

  const nativeError=console.error.bind(console);
  console.error=function(...args){
    try{
      const text=args.map(x=>x instanceof Error?(x.stack||x.message):typeof x==='string'?x:JSON.stringify(x)).join(' ');
      if(text && !text.includes('DevTools')) localStorage.setItem(ERROR_KEY,JSON.stringify({at:new Date().toISOString(),text:text.slice(0,1800)}));
    }catch{}
    nativeError(...args);
  };

  function parse(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
  function signature(b){
    if(!b)return'';
    return [b.at,(b.practiceLogs||[]).length,(b.creativeLogs||[]).length,(b.achievements||[]).length,(b.currencyLedger||[]).length].join('|');
  }
  function archiveCurrentBackup(){
    const b=parse(BACKUP_KEY,null);if(!b)return;
    const history=parse(HISTORY_KEY,[]);
    const sig=signature(b);
    if(history.some(x=>signature(x)===sig))return;
    history.unshift(b);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,MAX_BACKUPS)));
  }
  archiveCurrentBackup();
  let lastBackupRaw=localStorage.getItem(BACKUP_KEY)||'';
  setInterval(()=>{
    const raw=localStorage.getItem(BACKUP_KEY)||'';
    if(raw!==lastBackupRaw){lastBackupRaw=raw;archiveCurrentBackup()}
  },300);

  function allBackups(){
    archiveCurrentBackup();
    return parse(HISTORY_KEY,[]).filter(Boolean);
  }
  function count(b){return (b.practiceLogs||[]).length+(b.creativeLogs||[]).length+(b.achievements||[]).length+(b.currencyLedger||[]).length}
  function fmt(iso){try{return new Date(iso).toLocaleString('ru-RU')}catch{return iso||'—'}}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function mergeById(current,backup){
    const map=new Map((current||[]).map(x=>[x.id||JSON.stringify(x),x]));
    (backup||[]).forEach(x=>{const k=x.id||JSON.stringify(x);if(!map.has(k))map.set(k,x)});
    return [...map.values()];
  }
  function restoreBackup(b){
    if(!b)return;
    state.practiceLogs=mergeById(state.practiceLogs,b.practiceLogs);
    state.creativeLogs=mergeById(state.creativeLogs,b.creativeLogs);
    state.achievements=mergeById(state.achievements,b.achievements);
    state.currencyLedger=mergeById(state.currencyLedger,b.currencyLedger);
    if(typeof save==='function')save();
    if(typeof render==='function')render();
  }

  function decoratePanel(){
    const modal=document.querySelector('#modal');
    const account=modal?.querySelector('.cloud-account');
    if(!account||account.querySelector('#cloudRecoveryBox'))return;
    const backups=allBackups();
    const err=parse(ERROR_KEY,null);
    const box=document.createElement('div');box.id='cloudRecoveryBox';box.className='cloud-recovery-box';
    const rows=backups.slice(0,6).map((b,i)=>`<div class="cloud-recovery-row"><span><b>${esc(fmt(b.at))}</b><small>${count(b)} записей · практики ${(b.practiceLogs||[]).length} · творчество ${(b.creativeLogs||[]).length}</small></span><button type="button" class="ghost" data-restore-backup="${i}" ${count(b)?'':'disabled'}>Вернуть записи</button></div>`).join('');
    box.innerHTML=`<div class="cloud-recovery-title"><b>Страховочные копии</b><small>Не заменяют текущие данные, а добавляют недостающие записи.</small></div>${rows||'<div class="cloud-auth-note">Страховочных копий пока нет.</div>'}${err?`<details class="cloud-error-details"><summary>Последняя ошибка облака</summary><code>${esc(err.text||'')}</code><small>${esc(fmt(err.at))}</small></details>`:''}`;
    account.appendChild(box);
    box.querySelectorAll('[data-restore-backup]').forEach(btn=>btn.onclick=()=>{
      const b=backups[Number(btn.dataset.restoreBackup)];
      if(!b||!count(b))return;
      if(confirm(`Добавить недостающие записи из страховки ${fmt(b.at)}? Текущие записи не удалятся.`)){
        restoreBackup(b);
        modal.close();
        if(typeof toast==='function')toast('Записи из страховки восстановлены');
      }
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#cloudStatusBtn'))setTimeout(decoratePanel,0);
  },true);
})();
