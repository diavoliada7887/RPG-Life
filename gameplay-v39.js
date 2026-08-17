// RPG Life v39 — state shape guard after cloud snapshots
(function(){
  function ensureStateShape39(){
    if(!state||typeof state!=='object')state={};
    const arrays=['practices','practiceLogs','creativeLines','creativeLogs','creativePractices','projects','states','bosses','campaigns','rewards','achievements','rewardPurchases','currencyLedger','gryzliki','buffDefinitions','buffClaims'];
    arrays.forEach(k=>{if(!Array.isArray(state[k]))state[k]=[]});
    const objects=['dayMemories','practiceChecklistDrafts'];
    objects.forEach(k=>{if(!state[k]||typeof state[k]!=='object'||Array.isArray(state[k]))state[k]={}});
    if(!state.wallet||typeof state.wallet!=='object')state.wallet={gold:0,diamonds:0};
    if(!Number.isFinite(Number(state.wallet.gold)))state.wallet.gold=0;
    if(!Number.isFinite(Number(state.wallet.diamonds)))state.wallet.diamonds=0;
    (state.practices||[]).forEach(p=>{if(!p.practiceType)p.practiceType='standard';if(!Array.isArray(p.checkItems))p.checkItems=[]});
    return state;
  }

  const renderBefore39=render;
  render=function(){ensureStateShape39();return renderBefore39()};

  const todayBefore39=todayView;
  todayView=function(){ensureStateShape39();return todayBefore39()};

  const yearBefore39=yearView;
  yearView=function(){ensureStateShape39();return yearBefore39()};

  window.rpgEnsureStateShape=ensureStateShape39;
  ensureStateShape39();
})();
