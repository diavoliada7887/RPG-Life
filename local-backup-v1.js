// RPG Life — explicit local backup download before major updates.
(function(){
  const STATE_KEY='rpg-life-v4';

  function escBackup(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function pad(n){return String(n).padStart(2,'0')}
  function stampForFile(){
    const d=new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }
  function toastBackup(text){if(typeof toast==='function')toast(text);else console.log(text)}

  function downloadLocalBackup(){
    const raw=localStorage.getItem(STATE_KEY);
    if(!raw){toastBackup('Локальная копия персонажа пока пуста');return}
    let snapshot;
    try{snapshot=JSON.parse(raw)}catch{toastBackup('Не удалось прочитать локальную копию');return}

    const payload={
      kind:'rpg-life-local-backup',
      version:1,
      exportedAt:new Date().toISOString(),
      state:snapshot
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`RPG-Life-backup_${stampForFile()}.json`;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    toastBackup('Страховочная копия скачана');
  }

  function addBackupCard(){
    if(typeof view!=='undefined'&&view!=='today')return;
    const wrap=document.querySelector('#app .v2-wrap');
    if(!wrap||document.querySelector('#localBackupCardV1'))return;
    const card=document.createElement('article');
    card.id='localBackupCardV1';
    card.className='v2-card';
    card.style.marginTop='14px';
    card.innerHTML=`<div class="v2-row" style="align-items:center;gap:12px;flex-wrap:wrap"><div style="min-width:0;flex:1"><div class="v2-kicker">Страховочная копия</div><h3 class="v2-title" style="margin-bottom:4px">Забрать персонажа на устройство</h3><div class="v2-sub">Перед большим обновлением можно скачать весь текущий локальный прогресс одним JSON-файлом.</div></div><button class="soft" id="downloadLocalBackupV1" type="button" style="white-space:nowrap">⬇ Скачать копию</button></div>`;
    wrap.appendChild(card);
    document.querySelector('#downloadLocalBackupV1')?.addEventListener('click',downloadLocalBackup);
  }

  const renderBeforeBackup=typeof render==='function'?render:null;
  if(renderBeforeBackup){
    render=function(){
      const result=renderBeforeBackup();
      requestAnimationFrame(addBackupCard);
      return result;
    };
  }

  window.rpgDownloadLocalBackup=downloadLocalBackup;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(addBackupCard),{once:true});
  else requestAnimationFrame(addBackupCard);
})();
