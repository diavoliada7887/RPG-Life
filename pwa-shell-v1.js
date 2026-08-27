// RPG Life — PWA registration and Android install flow.
(function(){
  const installBtn=document.querySelector('#installBtn');
  let deferredPrompt=null;

  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      window.navigator.standalone===true;
  }

  function syncInstallButton(){
    if(!installBtn)return;
    const show=!isStandalone()&&!!deferredPrompt;
    installBtn.classList.toggle('hidden',!show);
    if(show)installBtn.textContent='Установить';
  }

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})
        .then(registration=>registration.update())
        .catch(error=>console.warn('RPG Life: service worker registration failed',error));
    },{once:true});
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    syncInstallButton();
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    syncInstallButton();
  });

  installBtn?.addEventListener('click',async()=>{
    if(!deferredPrompt)return;
    const prompt=deferredPrompt;
    deferredPrompt=null;
    syncInstallButton();
    try{
      await prompt.prompt();
      await prompt.userChoice;
    }catch(error){
      console.warn('RPG Life: install prompt failed',error);
    }
  });

  syncInstallButton();
})();
