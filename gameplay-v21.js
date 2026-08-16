// RPG Life v21 — manual buff activation/rewards + robust calendar cleanup
(function(){
  const localDate21=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  state.buffClaims=state.buffClaims||[];

  function manualActive21(b){return (state.states||[]).some(s=>s.type==='buff'&&(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()))}
  function rewardBuff21(b,date){const key=`${b.id}:${date}`;if(state.buffClaims.some(x=>x.key===key))return;const gold=Math.max(0,Number(b.rewardGold||0)),diamonds=Math.max(0,Number(b.rewardDiamonds||0));state.wallet=state.wallet||{gold:0,diamonds:0};state.wallet.gold=Number(state.wallet.gold||0)+gold;state.wallet.diamonds=Number(state.wallet.diamonds||0)+diamonds;state.buffClaims.push({id:uid(),key,buffId:b.id,date,gold,diamonds})}

  function cleanup21(date){
    const pl=(state.practiceLogs||[]).filter(l=>l.date===date),cl=(state.creativeLogs||[]).filter(l=>l.date===date),al=(state.achievements||[]).filter(a=>a.date===date);if(!pl.length&&!cl.length&&!al.length)return'';
    return `<div class="calendar-cleanup"><div class="v2-row"><div><div class="v2-kicker">Правка дня</div><b>Удалить ошибочную запись</b></div>${pl.length+cl.length>1?`<button class="danger-soft" data-clear-day21="${date}">Очистить события дня</button>`:''}</div>${pl.map(l=>{const p=state.practices.find(x=>x.id===l.practiceId);return `<div><span>${esc(p?.name||'Практика')}</span><button data-del-practice-cal21="${l.id}">×</button></div>`}).join('')}${cl.map(l=>{const line=state.creativeLines.find(x=>x.id===l.lineId);return `<div><span>${esc(line?.title||'Творчество')} · ${esc(l.type||'')}</span><button data-del-creative-cal21="${l.id}">×</button></div>`}).join('')}${al.map(a=>`<div><span>✦ ${esc(a.title)}</span><button data-del-ach21="${a.id}">×</button></div>`).join('')}</div>`;
  }

  yearView=function(){const y=new Date().getFullYear();return `<div class="v2-wrap"><h1 class="v2-title">Карта года · ${y}</h1><div class="months-grid">${Array.from({length:12},(_,m)=>monthHTML(y,m)).join('')}</div><div class="v2-card calendar-detail"><h3>${fmt(selectedDate)}</h3>${todayLog()}${cleanup21(selectedDate)}</div></div>`};

  const bindBefore21=bind;
  bind=function(){
    bindBefore21();
    if(view==='buffs'){
      document.querySelectorAll('.buff-editor-card').forEach(card=>{const edit=card.querySelector('[data-edit-buff20]');if(!edit)return;const b=state.buffDefinitions.find(x=>x.id===edit.dataset.editBuff20);if(!b||b.mode!=='manual'||card.querySelector('[data-toggle-buff21]'))return;const active=manualActive21(b),btn=document.createElement('button');btn.className=active?'ghost':'primary';btn.dataset.toggleBuff21=b.id;btn.textContent=active?'Снять':'Активировать';edit.parentElement.insertBefore(btn,edit)});
    }
    document.querySelectorAll('[data-toggle-buff21]').forEach(btn=>btn.onclick=()=>{const b=state.buffDefinitions.find(x=>x.id===btn.dataset.toggleBuff21);if(!b)return;const active=manualActive21(b);if(active){state.states=(state.states||[]).filter(s=>!(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()))}else{state.states=state.states||[];state.states.push({id:uid(),type:'buff',buffId:b.id,title:b.title,note:b.description||'',strength:null});rewardBuff21(b,localDate21())}save();render()});
    document.querySelectorAll('[data-del-practice-cal21]').forEach(b=>b.onclick=()=>deleteLog(b.dataset.delPracticeCal21));
    document.querySelectorAll('[data-del-creative-cal21]').forEach(b=>b.onclick=()=>{if(confirm('Удалить запись?')){state.creativeLogs=state.creativeLogs.filter(x=>x.id!==b.dataset.delCreativeCal21);save();render()}});
    document.querySelectorAll('[data-del-ach21]').forEach(b=>b.onclick=()=>{if(confirm('Удалить отметку из Памяти и календаря?')){state.achievements=state.achievements.filter(x=>x.id!==b.dataset.delAch21);save();render()}});
    document.querySelectorAll('[data-clear-day21]').forEach(b=>b.onclick=()=>{if(!confirm('Удалить все обычные и творческие записи этого дня?'))return;const d=b.dataset.clearDay21;(state.practiceLogs||[]).filter(l=>l.date===d).forEach(l=>{const reward=Math.max(0,Number(l.rewardGoldGranted||0));if(reward)state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-reward);bankRemoveByRef(l.id)});state.practiceLogs=state.practiceLogs.filter(l=>l.date!==d);state.creativeLogs=state.creativeLogs.filter(l=>l.date!==d);save();render()});
  };
  render();
})();
