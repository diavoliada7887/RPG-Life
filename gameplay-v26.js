// RPG Life v26 — unified buff rewards + visible currency history
(function(){
  const clone26=x=>JSON.parse(JSON.stringify(x));
  const localDate26=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const parse26=d=>new Date(d+'T12:00:00');
  const age26=(date,start)=>Math.floor((parse26(date)-parse26(start))/86400000);
  const stamp26=()=>new Date().toISOString();

  function ensureCurrency26(){
    state.wallet=state.wallet||{gold:0,diamonds:0};
    state.buffClaims=state.buffClaims||[];
    state.currencyLedger=state.currencyLedger||[];
    let changed=false;

    // Older versions already changed the wallet but had no human-readable history.
    // Backfill those claims into the ledger without touching balances again.
    state.buffClaims.forEach(c=>{
      const gold=Math.max(0,Number(c.gold||0)),diamonds=Math.max(0,Number(c.diamonds||0));
      if(!gold&&!diamonds)return;
      const ledgerKey=`legacy-claim:${c.id||c.key}`;
      if(state.currencyLedger.some(x=>x.ledgerKey===ledgerKey))return;
      const b=(state.buffDefinitions||[]).find(x=>x.id===c.buffId);
      state.currencyLedger.push({id:uid(),ledgerKey,date:c.date||localDate26(),at:c.at||`${c.date||localDate26()}T12:00:00`,kind:'buff',sourceId:c.buffId||'',title:`Баф · ${b?.title||'награда'}`,gold,diamonds,backfilled:true});
      changed=true;
    });
    return changed;
  }

  function latestEligible26(pid,date,days){
    return [...(state.practiceLogs||[])]
      .filter(l=>l.practiceId===pid&&l.date<=date&&age26(date,l.date)>=0&&age26(date,l.date)<days)
      .sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
  }

  function activation26(b,date){
    if(b.customRule==='mealPrepStock'){
      const pid=(b.practiceIds||[])[0]||'meal-prep';
      const log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date).sort((a,z)=>z.date.localeCompare(a.date))[0];
      if(!log)return null;
      const days=Math.max(0,Number(log.metrics?.['Дней запаса']||0)),age=age26(date,log.date);
      if(!(days>0&&age>=0&&age<days))return null;
      return {signature:`mealPrepStock:${log.id||log.date}`,date:log.date};
    }
    if(b.customRule==='clothesWeek'){
      const pid=(b.practiceIds||[])[0]||'clothes-week';
      const log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date&&age26(date,l.date)>=0&&age26(date,l.date)<7).sort((a,z)=>z.date.localeCompare(a.date))[0];
      if(!log)return null;
      const opts=new Set(log.options||[]);
      if(!['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x)))return null;
      return {signature:`clothesWeek:${log.id||log.date}`,date:log.date};
    }
    if(b.mode==='manual'){
      const s=[...(state.states||[])].reverse().find(x=>x.type==='buff'&&(x.buffId===b.id||String(x.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));
      return s?{signature:`manual:${s.id||b.id}`,date:s.date||date}:null;
    }

    const ids=b.practiceIds||[];if(!ids.length)return null;
    const days=Math.max(1,Number(b.windowDays||1));
    if(b.mode==='any'){
      const hits=ids.map(id=>latestEligible26(id,date,days)).filter(Boolean).sort((a,z)=>z.date.localeCompare(a.date));
      const log=hits[0];return log?{signature:`any:${log.id||`${log.practiceId}:${log.date}`}`,date:log.date}:null;
    }
    const hits=ids.map(id=>latestEligible26(id,date,days));
    if(hits.some(x=>!x))return null;
    const signature=hits.map(x=>x.id||`${x.practiceId}:${x.date}`).sort().join('|');
    const rewardDate=hits.map(x=>x.date).sort().slice(-1)[0]||date;
    return {signature:`all:${signature}`,date:rewardDate};
  }

  function awardBuff26(b,activation){
    const gold=Math.max(0,Math.round(Number(b.rewardGold||0))),diamonds=Math.max(0,Math.round(Number(b.rewardDiamonds||0)));
    if(!gold&&!diamonds)return false;
    const key=`reward:${b.id}:${activation.signature}`;
    if((state.buffClaims||[]).some(x=>x.key===key||x.rewardKey===key))return false;

    state.wallet.gold=Number(state.wallet.gold||0)+gold;
    state.wallet.diamonds=Number(state.wallet.diamonds||0)+diamonds;
    const at=stamp26();
    const claim={id:uid(),key,rewardKey:key,buffId:b.id,date:activation.date||localDate26(),at,gold,diamonds,signature:activation.signature};
    state.buffClaims.push(claim);
    state.currencyLedger.push({id:uid(),ledgerKey:`claim:${claim.id}`,date:claim.date,at,kind:'buff',sourceId:b.id,title:`Баф · ${b.title}`,gold,diamonds});
    return true;
  }

  function settleBuffRewards26(){
    const date=localDate26();let changed=false;
    (state.buffDefinitions||[]).forEach(b=>{const activation=activation26(b,date);if(activation&&awardBuff26(b,activation))changed=true});
    return changed;
  }

  function history26(){
    const rows=[...(state.currencyLedger||[])].sort((a,b)=>String(b.at||b.date||'').localeCompare(String(a.at||a.date||'')));
    const list=rows.slice(0,30).map(x=>{
      const amounts=[];if(Number(x.gold||0))amounts.push(`<strong class="ledger-gold26">+${Number(x.gold)} G</strong>`);if(Number(x.diamonds||0))amounts.push(`<strong class="ledger-diamond26">+${Number(x.diamonds)} D</strong>`);
      const date=x.date?fmt(x.date):'';
      return `<div class="currency-ledger-row26"><span><b>${esc(x.title||'Начисление')}</b><small>${esc(date)}</small></span><span>${amounts.join(' ')}</span></div>`;
    }).join('');
    return `<details class="currency-history26"><summary><span>🪙 История начислений</span><small>${rows.length?`${rows.length} записей`:'пока пусто'}</small><i>▾</i></summary><div class="currency-ledger26">${list||'<div class="v2-sub">Здесь появятся награды за бафы и другие игровые события.</div>'}</div></details>`;
  }

  ensureCurrency26();
  settleBuffRewards26();
  save();

  const todayBefore26=todayView;
  todayView=function(){
    const html=todayBefore26();
    const marker='</article><article class="v2-card v2-span-8 quick-card23">';
    return html.includes(marker)?html.replace(marker,`${history26()}</article><article class="v2-card v2-span-8 quick-card23">`):html;
  };

  const renderBefore26=render;
  render=function(){
    const changed=ensureCurrency26()|settleBuffRewards26();
    if(changed)save();
    return renderBefore26();
  };

  render();
})();