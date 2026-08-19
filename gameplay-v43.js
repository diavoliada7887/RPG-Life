// RPG Life v43 — data cleanup: Revitonica belongs to Presence, not Health.
(function(){
  let changed=false;
  (state.practices||[]).forEach(p=>{
    const isRevitonica=p.id==='revitonica'||String(p.name||'').trim().toLowerCase()==='ревитоника';
    if(!isRevitonica)return;
    p.branches=p.branches||{};
    if(Object.prototype.hasOwnProperty.call(p.branches,'health')){
      delete p.branches.health;
      changed=true;
    }
    if(!Number(p.branches.presence||0)){
      p.branches.presence=30;
      changed=true;
    }
  });
  if(changed){save();render()}
})();
