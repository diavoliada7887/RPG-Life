// RPG Life v6 — resources, Recognition of Self branch, refined daily HUD
(function(){
  // Rename the branch without changing stored keys/data.
  if(branchMeta?.presence) branchMeta.presence.name='Узнавание себя';
  if(practiceBranches?.presence) practiceBranches.presence.name='Узнавание себя';

  state.resources=state.resources||{inspiration:50,calm:50,energy:50};
  save();

  const parseDate=d=>new Date(d+'T12:00:00');
  const dayDiff=(a,b)=>Math.round((parseDate(a)-parseDate(b))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;
  const clamp100=n=>Math.max(0,Math.min(100,Math.round(Number(n)||0)));

  function autoBuffsV6(date){
    const buffs=[];
    const logs=(state.practiceLogs||[]).filter(l=>l.date<=date);
    const todayLogs=logs.filter(l=>l.date===date);

    const morningIds=['train','hof','cold'];
    if(morningIds.every(id=>todayLogs.some(l=>l.practiceId===id))){
      buffs.push({id:'morning-boost',title:'Утренний разгон',note:'Тренировка, Хоф и холод собраны в утренний комплекс.',effects:{energy:20}});
    }

    if(todayLogs.some(l=>l.practiceId==='kitchen-morning')){
      buffs.push({id:'clean-start',title:'Чистый старт',note:'Утро не пришлось отдавать бытовому хвосту.',effects:{inspiration:15}});
    }

    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&dayDiff(date,l.date)>=0&&dayDiff(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){
      const opts=new Set(clothes.options||[]);
      if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x))){
        buffs.push({id:'calm-week',title:'Спокойная неделя',note:'Одежда на неделю полностью подготовлена.',effects:{calm:20}});
      }
    }

    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&dayDiff(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){
      const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0));
      const age=dayDiff(date,prep.date);
      if(days>0&&age<days){
        buffs.push({id:'full-pantry',title:'Кладовая полна, милорд',note:`Обеды заготовлены ещё примерно на ${Math.max(1,days-age)} дн.`,effects:{calm:15}});
      }
    }
    return buffs;
  }

  function resourceValues(date){
    const values={
      inspiration:clamp100(state.resources.inspiration),
      calm:clamp100(state.resources.calm),
      energy:clamp100(state.resources.energy)
    };
    autoBuffsV6(date).forEach(b=>Object.entries(b.effects||{}).forEach(([k,v])=>values[k]=clamp100(values[k]+Number(v||0))));
    return values;
  }

  const resourceMeta={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'}
  };

  function resourcesCard(date){
    const vals=resourceValues(date),buffs=autoBuffsV6(date);
    return `<article class="v2-card v2-span-12 resources-card">
      <div class="v2-row"><div><div class="v2-kicker">Ресурсы</div><h3 class="v2-title">Состояние сейчас</h3></div><button class="ghost" id="editResources">⚙ шкалы</button></div>
      <div class="resource-grid">${Object.entries(resourceMeta).map(([k,m])=>`<div class="resource-item"><div class="resource-line"><span>${m.icon} ${m.name}</span><b>${vals[k]}</b></div><div class="resource-bar"><i style="width:${vals[k]}%"></i></div></div>`).join('')}</div>
      ${buffs.length?`<div class="resource-buffs">${buffs.map(b=>`<span title="${esc(b.note)}">${esc(b.title)}</span>`).join('')}</div>`:''}
    </article>`;
  }

  function statesTopV6(){
    const auto=autoBuffsV6(selectedDate);
    const manual=(state.states||[]).filter(s=>s.title!=='Чистая полоса');
    const all=[...auto.map(x=>({...x,type:'buff',auto:true})),...manual];
    return `<article class="v2-card v2-span-12 states-top"><div class="v2-row"><div><div class="v2-kicker">Бафы и дебафы</div><h3 class="v2-title">Что сейчас действует</h3></div><button class="ghost" id="addState">＋ состояние</button></div><div class="state-stack state-stack-top">${all.map(s=>`<div class="state-chip ${s.type||'buff'} ${s.auto?'auto-buff':''}"><b>${s.type==='debuff'?'⚠':'✦'} ${esc(s.title)}</b><small>${esc(s.note||'')}${s.auto?' · автоматически':''}</small></div>`).join('')||'<div class="empty-v2">Сейчас ничего активного.</div>'}</div></article>`;
  }

  function editResources(){
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Базовое состояние</div><h2>Настроить шкалы</h2></div><button class="close">×</button></div><form id="resourcesForm">
      <div class="v2-sub">Это твоя базовая оценка. Активные бафы временно прибавляются сверху.</div>
      ${Object.entries(resourceMeta).map(([k,m])=>`<label>${m.icon} ${m.name}<input name="${k}" type="range" min="0" max="100" value="${clamp100(state.resources[k])}"><output id="out_${k}">${clamp100(state.resources[k])}</output></label>`).join('')}
      <button class="primary">Сохранить</button>
    </form>`);
    Object.keys(resourceMeta).forEach(k=>{const i=document.querySelector(`[name="${k}"]`),o=document.querySelector(`#out_${k}`);if(i&&o)i.oninput=()=>o.textContent=i.value});
    document.querySelector('#resourcesForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);Object.keys(resourceMeta).forEach(k=>state.resources[k]=clamp100(f.get(k)));save();document.querySelector('#modal').close();render()};
  }

  todayView=function(){return `<div class="v2-wrap"><section class="v2-grid">
    <article class="v2-card v2-span-12 day-head-card"><div class="v2-row"><div><div class="v2-kicker">День персонажа</div><h1 class="v2-title">${fmt(selectedDate)}</h1></div><div class="currency-bar"><div class="currency-pill gold">🪙 <b>${state.wallet.gold}</b></div><div class="currency-pill diamond">💎 <b>${state.wallet.diamonds}</b></div></div></div>${dayStrip()}</article>
    ${resourcesCard(selectedDate)}
    ${statesTopV6()}
    <article class="v2-card v2-span-8"><div class="v2-kicker">Быстрая фиксация</div><h2 class="v2-title">Что произошло?</h2><div class="v2-sub">Область → практика или творческая линия → конкретное событие.</div>${practiceMenus()}</article>
    <article class="v2-card v2-span-4"><div class="v2-kicker">Зафиксировано</div><h3 class="v2-title">Этот день</h3><div class="today-log">${todayLog()}</div></article>
    <article class="v2-card v2-span-12">${workSummary()}</article>
    <article class="v2-card v2-span-7"><div class="v2-kicker">Ритм</div><h3 class="v2-title">Неделя вокруг выбранного дня</h3>${rhythmCard()}</article>
    <article class="v2-card v2-span-5">${bankCard()}</article>
    <article class="v2-card v2-span-7"><div class="v2-row"><div><div class="v2-kicker">Битвы</div><h3 class="v2-title">Активные противники</h3></div><button class="soft" data-go="battles">Арена →</button></div>${state.bosses.map(b=>`<div class="arch-note"><b>${esc(b.title)}</b></div>`).join('')}</article>
  </section></div>`};

  // Make the branch screen language match the new meaning.
  const oldBranchesView=branchesView;
  branchesView=function(){return oldBranchesView().replaceAll('Присутствие','Узнавание себя')};

  const oldBindV6=bind;
  bind=function(){
    oldBindV6();
    document.querySelector('#editResources')?.addEventListener('click',editResources);
  };
  render();
})();