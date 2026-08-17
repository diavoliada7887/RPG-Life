// RPG Life v28 — rewards follow the same-day / next-day buff timing rule
(function(){
  const DAY=86400000;
  const localDate28=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const parse28=d=>new Date(d+'T12:00:00');
  const iso28=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const shift28=(date,n)=>{const d=parse28(date);d.setDate(d.getDate()+n);return iso28(d)};
  const age28=(date,start)=>Math.floor((parse28(date)-parse28(start))/DAY);

  state.wallet=state.wallet||{gold:0,diamonds:0};
  state.buffClaims=state.buffClaims||[];
  state.currencyLedger=state.currencyLedger||[];

  function backfill28(){let changed=false;(state.buffClaims||[]).forEach(c=>{const gold=Math.max(0,Number(c.gold||0)),diamonds=Math.max(0,Number(c.diamonds||0));if(!gold&&!diamonds)return;const key=`legacy-claim:${c.id||c.key}`;if(state.currencyLedger.some(x=>x.ledgerKey===key||x.ledgerKey===`claim:${c.id}`))return;const b=(state.buffDefinitions||[]).find(x=>x.id===c.buffId);state.currencyLedger.push({id:uid(),ledgerKey:key,date:c.date||localDate28(),at:c.at||`${c.date||localDate28()}T12:00:00`,kind:'buff',sourceId:c.buffId||'',title:`Баф · ${b?.title||'награда'}`,gold,diamonds,backfilled:true});changed=true});return changed}
  function latest28(pid,date,days){return [...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date&&age28(date,l.date)>=0&&age28(date,l.date)<days).sort((a,b)=>b.date.localeCompare(a.date))[0]||null}
  function activation28(b,date){
    if(b.customRule==='slimWeek')return null;
    const offset=Math.max(0,Number(b.startOffsetDays||0)),triggerDate=shift28(date,-offset);
    if(b.customRule==='mealPrepStock'){
      const pid=(b.practiceIds||[])[0]||'meal-prep',log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=triggerDate).sort((a,z)=>z.date.localeCompare(a.date))[0];if(!log)return null;const days=Math.max(0,Number(log.metrics?.['Дней запаса']||0)),age=age28(triggerDate,log.date);if(!(days>0&&age>=0&&age<days))return null;return {signature:`mealPrepStock:${log.id||log.date}`,date};
    }
    if(b.customRule==='clothesWeek'){
      const pid=(b.practiceIds||[])[0]||'clothes-week',log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=triggerDate&&age28(triggerDate,l.date)>=0&&age28(triggerDate,l.date)<7).sort((a,z)=>z.date.localeCompare(a.date))[0];if(!log)return null;const opts=new Set(log.options||[]);if(!['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x)))return null;return {signature:`clothesWeek:${log.id||log.date}`,date};
    }
    if(b.mode==='manual'){
      const s=[...(state.states||[])].reverse().find(x=>x.type==='buff'&&(x.buffId===b.id||String(x.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));if(!s)return null;const started=s.date||date;if(age28(date,started)<offset)return null;return {signature:`manual:${s.id||b.id}`,date};
    }
    const ids=b.practiceIds||[];if(!ids.length)return null;const days=Math.max(1,Number(b.windowDays||1));
    if(b.mode==='any'){const hits=ids.map(id=>latest28(id,triggerDate,days)).filter(Boolean).sort((a,z)=>z.date.localeCompare(a.date));const log=hits[0];return log?{signature:`any:${log.id||`${log.practiceId}:${log.date}`}`,date}:null}
    const hits=ids.map(id=>latest28(id,triggerDate,days));if(hits.some(x=>!x))return null;return {signature:`all:${hits.map(x=>x.id||`${x.practiceId}:${x.date}`).sort().join('|')}`,date};
  }
  function award28(b,a){const gold=Math.max(0,Math.round(Number(b.rewardGold||0))),diamonds=Math.max(0,Math.round(Number(b.rewardDiamonds||0)));if(!gold&&!diamonds)return false;const key=`reward:${b.id}:${a.signature}`;if(state.buffClaims.some(x=>x.key===key||x.rewardKey===key))return false;state.wallet.gold=Number(state.wallet.gold||0)+gold;state.wallet.diamonds=Number(state.wallet.diamonds||0)+diamonds;const at=new Date().toISOString(),claim={id:uid(),key,rewardKey:key,buffId:b.id,date:a.date||localDate28(),at,gold,diamonds,signature:a.signature};state.buffClaims.push(claim);state.currencyLedger.push({id:uid(),ledgerKey:`claim:${claim.id}`,date:claim.date,at,kind:'buff',sourceId:b.id,title:`Баф · ${b.title}`,gold,diamonds});return true}
  function settle28(){const date=localDate28();let changed=backfill28();(state.buffDefinitions||[]).forEach(b=>{const a=activation28(b,date);if(a&&award28(b,a))changed=true});return changed}
  const renderBefore28=render;
  render=function(){if(settle28())save();return renderBefore28()};
  if(settle28())save();
  render();
})();