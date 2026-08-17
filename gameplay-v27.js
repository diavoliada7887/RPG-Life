// RPG Life v27 — buff timing, rolling Slim buff, currency milestones, calmer home flow
(function(){
  const DAY=86400000;
  const localDate27=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const parse27=d=>new Date(d+'T12:00:00');
  const iso27=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const shift27=(date,n)=>{const d=parse27(date);d.setDate(d.getDate()+n);return iso27(d)};
  const age27=(date,start)=>Math.floor((parse27(date)-parse27(start))/DAY);
  const resources27={inspiration:{name:'Вдохновение',icon:'✦'},calm:{name:'Спокойствие',icon:'☾'},energy:{name:'Энергия',icon:'⚡'},recognition:{name:'Узнавание',icon:'◈'}};

  state.buffDefinitions=state.buffDefinitions||[];
  state.currencyLedger=state.currencyLedger||[];
  state.currencyMilestones=state.currencyMilestones||{};

  function ensureRules27(){
    let changed=false;
    const clean=state.buffDefinitions.find(b=>b.id==='buff-clean-start'||String(b.title||'').trim().toLowerCase()==='чистый старт');
    if(clean&&Number(clean.startOffsetDays)!==1){clean.startOffsetDays=1;changed=true}
    const pretty=state.buffDefinitions.find(b=>b.id==='buff-pretty'||String(b.title||'').trim().toLowerCase()==='красотка');
    if(pretty&&pretty.startOffsetDays===undefined){pretty.startOffsetDays=0;changed=true}
    state.buffDefinitions.forEach(b=>{if(b.startOffsetDays===undefined){b.startOffsetDays=0;changed=true}});
    if(!state.buffDefinitions.some(b=>b.id==='buff-slim'||String(b.title||'').trim().toLowerCase()==='стройняшка')){
      state.buffDefinitions.push({id:'buff-slim',title:'Стройняшка',description:'За последние 7 дней накоплен дефицит не меньше 1200 ккал. Баф скользит вместе с окном недели и держится до четырёх дней после последнего подходящего окна.',mode:'auto',customRule:'slimWeek',practiceIds:[],windowDays:7,startOffsetDays:0,durationDays:4,resourceEffects:{},rewardGold:0,rewardDiamonds:0,imageData:''});changed=true;
    }
    return changed;
  }

  function rollingDeficit27(date){
    let sum=0;
    for(let i=0;i<7;i++){
      const d=shift27(date,-i),delta=typeof dayBankDelta==='function'?dayBankDelta(d):null;
      if(delta!==null&&Number.isFinite(Number(delta)))sum+=Number(delta);
    }
    return Math.round(sum);
  }
  function slimAnchor27(date){
    for(let back=0;back<4;back++){
      const d=shift27(date,-back);
      if(rollingDeficit27(d)>=1200)return d;
    }
    return null;
  }

  function latest27(pid,date,days){return [...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date&&age27(date,l.date)>=0&&age27(date,l.date)<days).sort((a,b)=>b.date.localeCompare(a.date))[0]||null}
  function buffActive27(b,date){
    if(b.customRule==='slimWeek')return !!slimAnchor27(date);
    const offset=Math.max(0,Number(b.startOffsetDays||0)),triggerDate=shift27(date,-offset);
    if(b.customRule==='mealPrepStock'){
      const pid=(b.practiceIds||[])[0]||'meal-prep',log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=triggerDate).sort((a,z)=>z.date.localeCompare(a.date))[0];if(!log)return false;
      const days=Math.max(0,Number(log.metrics?.['Дней запаса']||0)),age=age27(triggerDate,log.date);return days>0&&age>=0&&age<days;
    }
    if(b.customRule==='clothesWeek'){
      const pid=(b.practiceIds||[])[0]||'clothes-week',log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=triggerDate&&age27(triggerDate,l.date)>=0&&age27(triggerDate,l.date)<7).sort((a,z)=>z.date.localeCompare(a.date))[0];if(!log)return false;
      const opts=new Set(log.options||[]);return ['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x));
    }
    if(b.mode==='manual'){
      const s=[...(state.states||[])].reverse().find(x=>x.type==='buff'&&(x.buffId===b.id||String(x.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));if(!s)return false;
      const started=s.date||localDate27();return age27(date,started)>=offset;
    }
    const ids=b.practiceIds||[];if(!ids.length)return false;
    const days=Math.max(1,Number(b.windowDays||1)),hit=id=>!!latest27(id,triggerDate,days);
    return b.mode==='any'?ids.some(hit):ids.every(hit);
  }
  function effect27(b){const bits=[];Object.entries(resources27).forEach(([k,m])=>{const n=Number(b.resourceEffects?.[k]||0);if(n)bits.push(`${m.icon} ${m.name} ${n>0?'+':''}${n}`)});if(Number(b.rewardGold||0))bits.push(`+${Number(b.rewardGold)} G`);if(Number(b.rewardDiamonds||0))bits.push(`+${Number(b.rewardDiamonds)} D`);return bits.join(' · ')}
  function thumb27(b){return `<span class="active-buff-thumb27">${b.imageData?`<img src="${b.imageData}" alt="">`:'✦'}</span>`}

  function ledgerPush27(key,title,gold,diamonds,date=localDate27()){
    if(state.currencyLedger.some(x=>x.ledgerKey===key))return false;
    state.wallet=state.wallet||{gold:0,diamonds:0};
    state.wallet.gold=Number(state.wallet.gold||0)+Number(gold||0);state.wallet.diamonds=Number(state.wallet.diamonds||0)+Number(diamonds||0);
    state.currencyLedger.push({id:uid(),ledgerKey:key,date,at:new Date().toISOString(),kind:'deficit',sourceId:'calbank',title,gold:Number(gold||0),diamonds:Number(diamonds||0)});return true;
  }
  function settleDeficitMilestones27(){
    if(typeof bankBurned!=='function')return false;
    const total=Math.max(0,Math.floor(bankBurned())),goldLevel=Math.floor(total/1000),diamondLevel=Math.floor(total/7000);let changed=false;
    let g=Math.max(0,Number(state.currencyMilestones.deficitGold1000||0));
    while(g<goldLevel){g++;changed=ledgerPush27(`deficit-gold:${g}`,`Дефицит · ${g*1000} ккал`,50,0)||changed}state.currencyMilestones.deficitGold1000=Math.max(g,goldLevel);
    let d=Math.max(0,Number(state.currencyMilestones.deficitDiamond7000||0));
    while(d<diamondLevel){d++;changed=ledgerPush27(`deficit-diamond:${d}`,`Дефицит · ${d*7000} ккал`,0,1)||changed}state.currencyMilestones.deficitDiamond7000=Math.max(d,diamondLevel);
    return changed;
  }

  function historyWeek27(){
    const cutoff=shift27(localDate27(),-6),rows=[...(state.currencyLedger||[])].filter(x=>(x.date||'')>=cutoff&&(x.date||'')<=localDate27()).sort((a,b)=>String(b.at||b.date||'').localeCompare(String(a.at||a.date||'')));
    return `<details class="currency-history26 currency-history27"><summary><span>🪙 История начислений · 7 дней</span><small>${rows.length?`${rows.length} записей`:'пока пусто'}</small><i>▾</i></summary><div class="currency-ledger26">${rows.map(x=>`<div class="currency-ledger-row26"><span><b>${esc(x.title||'Начисление')}</b><small>${x.date?fmt(x.date):''}</small></span><span>${Number(x.gold||0)?`<strong class="ledger-gold26">+${Number(x.gold)} G</strong>`:''}${Number(x.diamonds||0)?` <strong class="ledger-diamond26">+${Number(x.diamonds)} D</strong>`:''}</span></div>`).join('')||'<div class="v2-sub">За последнюю неделю начислений не было.</div>'}</div></details>`;
  }
  function ledgerForDay27(date){
    const rows=[...(state.currencyLedger||[])].filter(x=>x.date===date).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));if(!rows.length)return'';
    return `<div class="calendar-ledger27"><small>Начисления</small>${rows.map(x=>`<div><span>🪙 ${esc(x.title||'Начисление')}</span><b>${Number(x.gold||0)?`+${Number(x.gold)} G`:''}${Number(x.diamonds||0)?`${Number(x.gold||0)?' · ':''}+${Number(x.diamonds)} D`:''}</b></div>`).join('')}</div>`;
  }

  function states27(){return `<article class="v2-card v2-span-12 states-top"><div class="v2-row"><div><div class="v2-kicker">Состояния</div><h3 class="v2-title">Состояние персонажа</h3></div><button class="ghost" id="addState">＋ состояние</button></div><div class="state-stack state-stack-top">${(state.states||[]).map(s=>`<div class="state-chip ${s.type}"><b>${s.type==='buff'?'✦':'⚠'} ${esc(s.title)}</b><small>${esc(s.note||'')}</small></div>`).join('')||'<div class="empty-v2">Сейчас ничего дополнительного.</div>'}</div></article>`}
  function activeBuffs27(date){
    const active=(state.buffDefinitions||[]).filter(b=>buffActive27(b,date));
    return `<article class="v2-card v2-span-12 active-buffs27"><div class="v2-row"><div><div class="v2-kicker">Действующие бафы</div><h3 class="v2-title">Что сейчас помогает</h3></div><button class="icon-button23" data-go="buffs">✦</button></div><div class="active-buffs-grid27">${active.map(b=>`<button data-go="buffs">${thumb27(b)}<span><b>${esc(b.title)}</b><small>${b.customRule==='slimWeek'?`7 дней: ${rollingDeficit27(date).toLocaleString('ru-RU')} ккал${slimAnchor27(date)!==date?' · держится хвост бафа':''}`:esc(effect27(b)||((Number(b.startOffsetDays)||0)?'действует со следующего дня':'действует сегодня'))}</small></span></button>`).join('')||'<div class="v2-sub">Сейчас ни один баф не активен.</div>'}</div></article>`;
  }
  function work27(){const bosses=(state.bosses||[]).filter(b=>!b.victoryConfirmed);return `<article class="v2-card v2-span-12 work-card23"><div class="v2-row"><div><div class="v2-kicker">Работа</div><h3 class="v2-title">Проекты и боссы</h3></div><button class="icon-button23" data-go="battles">⚔</button></div><div class="work-boss-strip23">${bosses.length?bosses.map(b=>`<button data-go="battles">${b.imageData?`<img src="${b.imageData}" alt="">`:'<span class="work-boss-empty23">⚔</span>'}<b>${esc(b.title)}</b></button>`).join(''):'<span class="v2-sub">Сейчас активных битв нет.</span>'}</div></article>`}

  // Home: money/history -> calendar -> states -> active buffs -> practices -> work -> rhythm + calorie bank.
  todayView=function(){return `<div class="v2-wrap"><section class="v2-grid">
    <article class="v2-card v2-span-12 money-head27"><div class="v2-row"><div><div class="v2-kicker">Ресурсы персонажа</div><h1 class="v2-title">Сегодня</h1></div><div class="currency-bar"><div class="currency-pill gold"><span class="currency-icon coin-icon">G</span><b>${Number(state.wallet?.gold||0)}</b></div><div class="currency-pill diamond"><span class="currency-icon diamond-icon">D</span><b>${Number(state.wallet?.diamonds||0)}</b></div></div></div>${historyWeek27()}</article>
    <article class="v2-card v2-span-12 calendar-head27"><div class="v2-kicker">Календарь</div><h3 class="v2-title">${fmt(selectedDate)}</h3>${dayStrip()}</article>
    ${states27()}${activeBuffs27(selectedDate)}
    <article class="v2-card v2-span-8 quick-card23"><h2 class="v2-title">Быстрая фиксация</h2>${practiceMenus()}</article>
    <article class="v2-card v2-span-4"><div class="v2-kicker">Зафиксировано</div><h3 class="v2-title">Этот день</h3><div class="today-log">${todayLog()}</div>${ledgerForDay27(selectedDate)}</article>
    ${work27()}
    <article class="v2-card v2-span-7 rhythm-card23"><details><summary><div><div class="v2-kicker">Ритм</div><h3 class="v2-title">Неделя вокруг выбранного дня</h3></div><span>▾</span></summary><div class="rhythm-body23">${rhythmCard()}</div></details></article>
    <article class="v2-card v2-span-5">${bankCard()}</article>
  </section></div>`};

  // Add currency events to the selected calendar day.
  const yearBefore27=yearView;
  yearView=function(){let html=yearBefore27();const ledger=ledgerForDay27(selectedDate);if(!ledger)return html;const needle='<div class="today-log">'+todayLog()+'</div>';return html.includes(needle)?html.replace(needle,needle+ledger):html};

  // Extend the existing buff editor without forking it again.
  let editor27={id:null,before:new Set()};
  function decorateEditor27(id){
    const form=document.querySelector('#buffForm23');if(!form||form.querySelector('#buffTiming27'))return;
    editor27={id:id||null,before:new Set((state.buffDefinitions||[]).map(b=>b.id))};
    const b=id?state.buffDefinitions.find(x=>x.id===id):null,offset=Math.max(0,Number(b?.startOffsetDays||0));
    const target=form.querySelector('input[name="windowDays"]')?.closest('label');if(!target)return;
    const label=document.createElement('label');label.id='buffTiming27';label.innerHTML=`Когда начинает действовать<select name="startOffsetDays"><option value="0" ${offset===0?'selected':''}>В этот же день</option><option value="1" ${offset===1?'selected':''}>Со следующего дня</option></select><small>Например: «Красотка» — сегодня, «Чистый старт» — завтра.</small>`;target.before(label);
    form.addEventListener('submit',()=>{
      const value=Math.max(0,Math.min(1,Number(new FormData(form).get('startOffsetDays'))||0));
      if(editor27.id){const x=state.buffDefinitions.find(z=>z.id===editor27.id);if(x)x.startOffsetDays=value}
      setTimeout(()=>{if(!editor27.id){const x=[...(state.buffDefinitions||[])].reverse().find(z=>!editor27.before.has(z.id));if(x)x.startOffsetDays=value}save();},0);
    },true);
  }
  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-buff23]');if(edit)setTimeout(()=>decorateEditor27(edit.dataset.editBuff23),0);
    if(e.target.closest('#addBuff23'))setTimeout(()=>decorateEditor27(null),0);
  });

  function decorateBuffPage27(){
    document.querySelectorAll('[data-edit-buff23]').forEach(btn=>{const b=state.buffDefinitions.find(x=>x.id===btn.dataset.editBuff23);if(!b)return;const card=btn.closest('.buff-card23'),p=card?.querySelector('.buff-rule-details23 p');if(p&&!p.dataset.timing27){p.dataset.timing27='1';p.textContent+=Number(b.startOffsetDays||0)===1?' · начинает действовать на следующий день':' · действует с этого дня'}});
  }

  const renderBefore27=render;
  render=function(){let changed=ensureRules27();changed=settleDeficitMilestones27()||changed;if(changed)save();const out=renderBefore27();decorateBuffPage27();return out};

  if(ensureRules27()|settleDeficitMilestones27())save();
  render();
})();