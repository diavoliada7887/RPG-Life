// RPG Life v48 — pin buff artwork to repository assets, never expiring cloud URLs.
(function(){
  const MIGRATION='buff-local-assets-v48';

  function localBuffAsset48(buff){
    const text=`${buff?.id||''} ${buff?.title||''} ${buff?.description||''}`.toLowerCase();
    if(/кладов|запас|еда|припас|милорд/.test(text))return 'assets/rpg/dwarf_supplier_01.png';
    if(/искател|поиск|исслед|хроник|знан/.test(text))return 'assets/rpg/elf_chronist_01.png';
    if(/дебаф|устал|хаос|гремлин/.test(text))return 'assets/rpg/gremlin_debuff_01.png';
    return 'assets/rpg/spirit_buff_01.png';
  }

  state.assetMigrations=state.assetMigrations&&typeof state.assetMigrations==='object'?state.assetMigrations:{};
  if(!state.assetMigrations[MIGRATION]){
    (state.buffDefinitions||[]).forEach(buff=>{
      buff.imageData=localBuffAsset48(buff);
      if('imagePath' in buff)delete buff.imagePath;
      if('imageUrl' in buff)delete buff.imageUrl;
    });
    state.assetMigrations[MIGRATION]=new Date().toISOString();
    save();
  }

  function healBuffImages48(){
    document.querySelectorAll('.buff-card23 img,.active-buff-thumb27 img').forEach(img=>{
      if(img.dataset.localFallback48)return;
      img.addEventListener('error',()=>{
        if(img.dataset.localFallback48)return;
        img.dataset.localFallback48='1';
        const card=img.closest('.buff-card23');
        const title=card?.querySelector('h3')?.textContent||'';
        img.src=localBuffAsset48({title});
      },{once:true});
    });
  }

  const renderBefore48=render;
  render=function(){
    const out=renderBefore48();
    requestAnimationFrame(healBuffImages48);
    return out;
  };

  window.rpgLocalBuffAsset48=localBuffAsset48;
  requestAnimationFrame(healBuffImages48);
})();