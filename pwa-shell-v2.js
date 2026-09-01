// RPG Life — hardened PWA registration/install flow for Android.
(function(){
  const installBtn=document.querySelector('#installBtn');
  let deferredPrompt=null;

  function standalone(){
    return !!(
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      window.navigator.standalone===true
    );
  }

  function explainInstall(){
    if(typeof openModal==='function'){
      openModal(`<div class="modal-head"><div><div class="v2-kicker">RPG Life</div><h2>Установить как приложение</h2></div><button class="close">×</button></div>
        <div class="v2-sub" style="line-height:1.55">
          Сейчас RPG Life открыт как обычная вкладка браузера. Поэтому ярлык может плодить новые вкладки.<br><br>
          Открой меню браузера и выбери именно <b>«Установить приложение»</b> / <b>«Install app»</b>, а не «Добавить ярлык».
          После установки приложение откроется в отдельном окне без вкладок.
        </div>`);
    }else{
      alert('Открой меню браузера и выбери «Установить приложение», а не «Добавить ярлык».');
    }
  }

  function syncButton(){
    if(!installBtn)return;
    if(standalone()){
      installBtn.classList.add('hidden');
      return;
    }
    installBtn.classList.remove('hidden');
    installBtn.textContent='📲 Установить';
    installBtn.title=deferredPrompt?'Установить RPG Life как приложение':'Проверить установку RPG Life';
  }

  async function registerSW(){
    if(!('serviceWorker' in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register('/RPG-Life/sw.js',{
        scope:'/RPG-Life/',
        updateViaCache:'none'
      });
      await registration.update();
      window.rpgServiceWorkerReady=true;
    }catch(error){
      console.warn('RPG Life: service worker registration failed',error);
    }
  }

  registerSW();

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    syncButton();
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    syncButton();
  });

  installBtn?.addEventListener('click',async()=>{
    if(standalone())return;
    if(!deferredPrompt){
      explainInstall();
      return;
    }
    const prompt=deferredPrompt;
    deferredPrompt=null;
    try{
      await prompt.prompt();
      await prompt.userChoice;
    }catch(error){
      console.warn('RPG Life: install prompt failed',error);
    }
    syncButton();
  });

  window.addEventListener('pageshow',syncButton);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncButton()});
  syncButton();
})();
