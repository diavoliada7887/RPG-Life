// RPG Life cloud sync — EMERGENCY FREEZE 2026-08-17
// Intentionally disabled while recovering local snapshots.
(function(){
  try{
    const host=document.querySelector('.top-actions');
    if(host&&!document.querySelector('#cloudStatusBtn')){
      const b=document.createElement('button');
      b.id='cloudStatusBtn';b.className='cloud-status offline';b.type='button';
      b.innerHTML='<span class="cloud-dot"></span><span>Облако отключено</span>';
      b.title='Синхронизация временно отключена для восстановления данных';
      host.prepend(b);
    }
  }catch(e){console.warn('Cloud freeze UI',e)}
})();
