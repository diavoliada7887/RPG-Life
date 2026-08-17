// Marks real user-time local state changes synchronously.
// Loaded immediately after app.js and ignores startup migrations until window.load.
(function(){
  const KEY='rpg-life-v4';
  const DIRTY_KEY='rpg-life-unsynced';
  const nativeSetItem=Storage.prototype.setItem;
  window.__rpgNativeSetItem=nativeSetItem;
  window.__rpgSyncBooting=true;
  window.__rpgInternalStateWrite=false;

  Storage.prototype.setItem=function(key,value){
    nativeSetItem.call(this,key,value);
    if(this===localStorage&&key===KEY&&!window.__rpgInternalStateWrite&&!window.__rpgSyncBooting){
      nativeSetItem.call(localStorage,DIRTY_KEY,'1');
      window.dispatchEvent(new CustomEvent('rpg-life:local-change'));
    }
  };

  window.addEventListener('load',()=>{window.__rpgSyncBooting=false},{once:true});
})();
