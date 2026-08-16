// RPG Life v24 — creativity uses the same Practice engine as the rest of life
(function(){
  state.practices=state.practices||[];
  state.creativeLines=state.creativeLines||[];

  const lineById24=id=>state.creativeLines.find(x=>x.id===id);
  const creativePractices24=lineId=>(state.practices||[]).filter(p=>p.creativeLineId===lineId);
  const allCreativePractices24=()=>(state.practices||[]).filter(p=>p.creativeLineId);

  // Seed a small, deliberately low-pressure starting set. These are floors, not obligations.
  const seeds24=[
    {id:'creative-sentir-morning',creativeLineId:'sentir',name:'Утреннее письмо',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Слов','Минут'],variants:[],resourceEffects:{inspiration:3},resourceEffectDays:1},
    {id:'creative-sentir-world',creativeLineId:'sentir',name:'Разработка Сентира',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Обдумывание',kcal:0},{name:'Миростроение',kcal:0},{name:'Структура',kcal:0},{name:'Сцена',kcal:0},{name:'Исследование',kcal:0}],resourceEffects:{inspiration:3},resourceEffectDays:1},
    {id:'creative-sentir-material',creativeLineId:'sentir',name:'Сбор материала',branches:{creative:15},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Чтение',kcal:0},{name:'Исследование',kcal:0},{name:'Референсы',kcal:0},{name:'Заметки',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1},
    {id:'creative-music-practice',creativeLineId:'music',name:'Музыкальная практика',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Вокал',kcal:0},{name:'Гитара',kcal:0},{name:'Слух',kcal:0},{name:'Техника',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1},
    {id:'creative-music-making',creativeLineId:'music',name:'Создание музыки',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Текст',kcal:0},{name:'Мелодия',kcal:0},{name:'Аранжировка',kcal:0},{name:'Запись',kcal:0}],resourceEffects:{inspiration:4},resourceEffectDays:1},
    {id:'creative-painting-practice',creativeLineId:'painting',name:'Живописная практика',branches:{creative:15},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Практика',kcal:0},{name:'Этюд',kcal:0},{name:'Картина',kcal:0},{name:'Исследование',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1},
    {id:'creative-calligraphy-practice',creativeLineId:'calligraphy',name:'Каллиграфическая практика',branches:{creative:15},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Практика',kcal:0},{name:'Композиция',kcal:0},{name:'Эксперимент',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1}
  ];
  seeds24.forEach(seed=>{
    if(!(state.practices||[]).some(p=>p.id===seed.id || (p.creativeLineId===seed.creativeLineId&&String(p.name||'').trim().toLowerCase()===seed.name.toLowerCase()))) state.practices.push(seed);
  });
  // Old creativePractices remain only as legacy data; the UI no longer creates or reads them as a separate system.
  save();

  function creativePracticeEditor24(lineId,id=null){
    const line=lineById24(lineId);if(!line)return;
    const p=id?state.practices.find(x=>x.id===id):null;
    const r=p?.rhythm||{type:'timesWeek',value:1};
    const variants=(p?.variants||[]).map(v=>v.name).join(', ');
    openModal(`<div class="modal-head"><div><div class="v2-kicker">${esc(line.title)}</div><h2>${p?'Изменить практику':'Новая практика'}</h2></div><button class="close">×</button></div><form id="creativePracticeForm24"><label>Название<input name="name" required value="${esc(p?.name||'')}"></label><label>Мягкий минимум<select name="rhythmType"><option value="timesWeek" ${r.type==='timesWeek'?'selected':''}>раз в неделю</option><option value="weeklyAmount" ${r.type==='weeklyAmount'?'selected':''}>объём за неделю</option><option value="daily" ${r.type==='daily'?'selected':''}>ежедневно</option><option value="soft" ${r.type==='soft'?'selected':''}>без минимума</option></select></label><div class="form-grid"><label>Минимум<input name="rhythmValue" type="number" min="1" value="${Math.max(1,Number(r.value||1))}"></label><label>Единица для объёма<input name="rhythmUnit" value="${esc(r.unit||'')}"></label></div><label>Варианты через запятую<input name="variants" value="${esc(variants)}" placeholder="Практика, исследование, набросок"></label><label>Метрики через запятую<input name="metrics" value="${esc((p?.metrics||['Минут']).join(', '))}" placeholder="Минут, Слов"></label><div class="form-grid"><label>Вдохновение<input name="inspiration" type="number" min="0" max="20" value="${Number(p?.resourceEffects?.inspiration||2)}"></label><label>Вес в Творчестве<input name="weight" type="number" min="1" max="100" value="${Number(p?.branches?.creative||15)}"></label></div><div class="modal-actions">${p?'<button type="button" class="danger-soft" id="deleteCreativePractice24">Удалить</button>':''}<button class="primary">Сохранить</button></div></form>`);
    const form=document.querySelector('#creativePracticeForm24');
    form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),type=f.get('rhythmType')||'timesWeek';const rhythm=type==='soft'?{type:'soft'}:type==='daily'?{type:'daily'}:{type,value:Math.max(1,Number(f.get('rhythmValue'))||1),...(type==='weeklyAmount'?{unit:String(f.get('rhythmUnit')||'').trim()}: {})};const target=p||{id:uid()};Object.assign(target,{creativeLineId:lineId,name:String(f.get('name')||'').trim(),branches:{...(target.branches||{}),creative:Math.max(1,Number(f.get('weight'))||15)},rhythm,metrics:String(f.get('metrics')||'').split(',').map(x=>x.trim()).filter(Boolean),variants:String(f.get('variants')||'').split(',').map(x=>x.trim()).filter(Boolean).map(name=>({name,kcal:0})),resourceEffects:{...(target.resourceEffects||{}),inspiration:Math.max(0,Number(f.get('inspiration'))||0)},resourceEffectDays:1});if(!p)state.practices.push(target);save();document.querySelector('#modal').close();render()};
    document.querySelector('#deleteCreativePractice24')?.addEventListener('click',()=>{if(confirm('Удалить эту практику? Старые записи останутся в истории.')){state.practices=state.practices.filter(x=>x.id!==p.id);save();document.querySelector('#modal').close();render()}});
  }

  practiceMenus=function(){
    const normal=Object.entries(practiceBranches).map(([k,m])=>{const ps=branchPractices(k);return `<details class="activity-menu"><summary><span>${m.icon}</span><b>${m.name}</b><small>${ps.length} практик</small></summary><div class="activity-menu-body">${ps.map(p=>`<div class="activity-option"><button class="activity-log" data-practice="${p.id}"><b>${esc(p.name)}</b><small>${rhythmLabel(p.rhythm)}</small></button><button class="activity-edit" data-edit-practice="${p.id}">⚙</button></div>`).join('')||'<div class="empty-v2">Пока пусто.</div>'}<button class="add-inside" data-add-practice="${k}">＋ добавить практику</button></div></details>`}).join('');
    const creative=`<details class="activity-menu creative-menu creative-practices24"><summary><span>✒</span><b>Творчество</b><small>${allCreativePractices24().length} практик</small></summary><div class="activity-menu-body creative-lines24">${state.creativeLines.map(line=>{const ps=creativePractices24(line.id);return `<details class="creative-line24"><summary><b>${esc(line.title)}</b><small>${ps.length} практик</small><span>▾</span></summary><div>${ps.map(p=>`<div class="activity-option"><button class="activity-log" data-practice="${p.id}"><b>${esc(p.name)}</b><small>${rhythmLabel(p.rhythm)}</small></button><button class="activity-edit" data-edit-creative-practice24="${p.id}" data-line24="${line.id}">⚙</button></div>`).join('')||'<div class="empty-v2">Пока пусто.</div>'}<button class="add-inside" data-add-creative-practice24="${line.id}">＋ добавить практику</button></div></details>`}).join('')}<button class="add-inside" id="addCreativeLine">＋ добавить линию</button></div></details>`;
    return `<div class="activity-menus">${normal}${creative}</div>`;
  };

  rhythmCard=function(){
    const dates=weekDates(selectedDate);
    const rows=(state.practices||[]).filter(p=>p.rhythm?.type!=='soft').map(p=>{const logs=(state.practiceLogs||[]).filter(l=>dates.includes(l.date)&&l.practiceId===p.id);let value='';if(p.rhythm.type==='weeklyAmount'){const metric=p.metrics?.[0];const sum=logs.reduce((n,l)=>n+Number((metric&&l.metrics?.[metric])||l.amount||0),0);value=`${sum.toLocaleString('ru-RU')} / ${Number(p.rhythm.value).toLocaleString('ru-RU')} ${p.rhythm.unit||''}`}else if(p.rhythm.type==='timesWeek')value=`${new Set(logs.map(l=>l.date)).size} / ${p.rhythm.value}`;else if(p.rhythm.type==='daily')value=`${new Set(logs.map(l=>l.date)).size} / 7`;else{const last=[...(state.practiceLogs||[])].filter(l=>l.practiceId===p.id&&l.date<=selectedDate).sort((a,b)=>b.date.localeCompare(a.date))[0];value=last?`последний раз ${fmt(last.date)}`:'ещё не отмечено'}const line=p.creativeLineId?lineById24(p.creativeLineId):null;return `<div class="rhythm-row"><div><b>${line?`${esc(line.title)} · `:''}${esc(p.name)}</b><small>${rhythmLabel(p.rhythm)}</small></div><strong>${value}</strong></div>`}).join('');
    return rows||'<div class="empty-v2">Пока нет ритмов.</div>';
  };

  const oldTodayLog24=todayLog;
  todayLog=function(){
    // Generic practice logs already include new creative practices. Keep old creativeLogs visible for backwards compatibility.
    return oldTodayLog24();
  };

  branchesView=function(){
    return `<div class="v2-wrap"><div class="v2-kicker">Ветки жизни</div><h1 class="v2-title">Настройки мира персонажа</h1><div class="branch-list">${Object.entries(branchMeta).map(([k,m])=>{
      if(k==='work')return `<article class="branch-tile"><h3>${m.icon} ${m.name}</h3><div class="project-tags">${state.projects.map(p=>`<span>${esc(p.title)}</span>`).join('')}</div></article>`;
      if(k==='creative')return `<article class="branch-tile creative-branch24"><header><div><h3>${m.icon} ${m.name}</h3><small>Линии → обычные практики</small></div><button class="soft" id="addCreativeLine2">＋ линия</button></header><div class="creative-settings24">${state.creativeLines.map(line=>{const ps=creativePractices24(line.id);return `<section><div class="creative-settings-head24"><button class="practice-tag editable" data-edit-line="${line.id}">${esc(line.title)}</button><button class="soft" data-add-creative-practice24="${line.id}">＋ практика</button></div><div class="practice-tags">${ps.map(p=>`<button class="practice-tag editable" data-edit-creative-practice24="${p.id}" data-line24="${line.id}">${esc(p.name)} · ${rhythmLabel(p.rhythm)}</button>`).join('')||'<span class="practice-tag">пока пусто</span>'}</div></section>`}).join('')}</div></article>`;
      return `<article class="branch-tile"><header><div><h3>${m.icon} ${m.name}</h3></div><button class="soft" data-add-practice="${k}">＋</button></header><div class="practice-tags">${branchPractices(k).map(p=>`<button class="practice-tag editable" data-edit-practice="${p.id}">${esc(p.name)} · ${p.branches[k]} · ${rhythmLabel(p.rhythm)}</button>`).join('')||'<span class="practice-tag">пока пусто</span>'}</div></article>`;
    }).join('')}</div></div>`;
  };

  const bind24=bind;
  bind=function(){
    bind24();
    document.querySelectorAll('[data-add-creative-practice24]').forEach(x=>x.onclick=()=>creativePracticeEditor24(x.dataset.addCreativePractice24));
    document.querySelectorAll('[data-edit-creative-practice24]').forEach(x=>x.onclick=()=>creativePracticeEditor24(x.dataset.line24,x.dataset.editCreativePractice24));
  };

  render();
})();