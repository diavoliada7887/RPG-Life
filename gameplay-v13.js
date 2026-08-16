// RPG Life v13 — quiet practices + resource effects
(function(){
  const resourceMeta13={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  const signed13=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));

  // One-time migration for the practice already created as "Макияж · Узнавание +1".
  (state.practices||[]).forEach(p=>{
    p.resourceEffects=p.resourceEffects||{};
    if(/^макияж$/i.test(String(p.name||'').trim()) && p.resourceEffects.recognition===undefined){
      const legacy=Number(p.branches?.presence||0);
      p.resourceEffects.recognition=legacy>0&&legacy<=5?legacy:1;
    }
    if(p.hideFromTimeline===undefined) p.hideFromTimeline=false;
  });
  save();

  const visiblePractice=p=>!p?.hideFromTimeline;
  logsForDate=function(date){return (state.practiceLogs||[]).filter(x=>x.date===date&&visiblePractice(state.practices.find(p=>p.id===x.practiceId)))};

  function practiceDelta(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0};
    (state.practiceLogs||[]).filter(l=>l.date===date).forEach(l=>{
      const p=state.practices.find(x=>x.id===l.practiceId);
      if(!p)return;
      Object.keys(out).forEach(k=>out[k]+=Number(p.resourceEffects?.[k]||0));
    });
    return out;
  }

  // Existing resource renderer already knows buffs. Temporarily feed it practice deltas while rendering.
  const todayBeforeV13=todayView;
  todayView=function(){
    state.resources=state.resources||{};
    const original={};Object.keys(resourceMeta13).forEach(k=>original[k]=Number(state.resources[k]||0));
    const delta=practiceDelta(selectedDate);
    Object.keys(resourceMeta13).forEach(k=>state.resources[k]=signed13(original[k]+delta[k]));
    let html;
    try{html=todayBeforeV13()}finally{Object.keys(resourceMeta13).forEach(k=>state.resources[k]=original[k])}
    return html;
  };

  // Hidden practices do not occupy the weekly rhythm card.
  const rhythmBeforeV13=rhythmCard;
  rhythmCard=function(){
    const hidden=(state.practices||[]).filter(p=>p.hideFromTimeline);
    if(!hidden.length)return rhythmBeforeV13();
    const saved=hidden.map(p=>[p,p.rhythm]);
    hidden.forEach(p=>p.rhythm={type:'soft'});
    let html=rhythmBeforeV13();
    saved.forEach(([p,r])=>p.rhythm=r);
    // soft practices are excluded by the original renderer; defensive cleanup not needed.
    return html;
  };

  function variantsText13(p){return (p.variants||[]).map(v=>`${v.name}|${v.kcal||0}`).join('; ')}
  function practiceForm13(p={},primaryBranch='health'){
    const branches=p.branches||{[primaryBranch]:10},r=p.rhythm||{type:'timesWeek',value:1},fx=p.resourceEffects||{};
    return `<div class="modal-head"><div><div class="v2-kicker">Настройки практики</div><h2>${p.id?'Изменить':'Добавить'}</h2></div><button class="close">×</button></div><form id="practiceForm13">
      <label>Название<input name="name" required value="${esc(p.name||'')}"></label>
      <div class="form-section"><b>Влияние на ветки</b>${Object.entries(practiceBranches).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input type="number" min="0" max="100" name="weight_${k}" value="${branches[k]||0}"></div>`).join('')}</div>
      <div class="form-section"><b>Влияние на ресурсы за выполнение</b><small class="v2-sub">От −20 до +20. Это действует в день, когда практика отмечена.</small>${Object.entries(resourceMeta13).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input type="number" min="-20" max="20" step="1" name="resource_${k}" value="${Number(fx[k]||0)}"></div>`).join('')}</div>
      <label>Желательный ритм<select name="rhythmType"><option value="timesWeek" ${r.type==='timesWeek'?'selected':''}>N раз в неделю</option><option value="weeklyAmount" ${r.type==='weeklyAmount'?'selected':''}>Количество за неделю</option><option value="daily" ${r.type==='daily'?'selected':''}>Ежедневно</option><option value="everyDays" ${r.type==='everyDays'?'selected':''}>Раз в N дней</option><option value="soft" ${r.type==='soft'?'selected':''}>Без жёсткой частоты</option></select></label>
      <div class="form-grid"><label>Число<input name="rhythmValue" type="number" min="0" value="${r.value??''}"></label><label>Единица<input name="unit" value="${esc(r.unit||'')}"></label></div>
      <label>Показатели<input name="metrics" value="${esc((p.metrics||[]).join('; '))}"></label>
      <label>Варианты дневной записи и расход<input name="variants" value="${esc(variantsText13(p))}" placeholder="Интервалка|200; Ноги|150"></label>
      ${p.id==='steps'?`<div class="form-grid"><label>Шагов в правиле<input name="stepAmount" type="number" value="${p.calorieRule?.amount||10000}"></label><label>ккал за это количество<input name="stepKcal" type="number" value="${p.calorieRule?.kcal||0}"></label></div>`:''}
      <label class="quiet-practice-toggle"><input type="checkbox" name="hideFromTimeline" ${p.hideFromTimeline?'checked':''}> <span><b>Не отмечать в глобальном календаре и неделе</b><small>Практика всё равно работает на ресурсы и бафы.</small></span></label>
      <div class="modal-actions"><button class="primary">Сохранить</button>${p.id?`<button type="button" class="danger-soft" data-delete-practice13="${p.id}">Удалить</button>`:''}</div>
    </form>`;
  }

  openPracticeEditor=function(id,branch){
    const p=id?state.practices.find(x=>x.id===id):null;
    openModal(practiceForm13(p||{},branch));
    document.querySelector('#practiceForm13').onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.currentTarget),old=p||{id:uid()},branches={},resourceEffects={};
      Object.keys(practiceBranches).forEach(k=>{const v=Number(f.get('weight_'+k))||0;if(v>0)branches[k]=clamp(v)});
      Object.keys(resourceMeta13).forEach(k=>{const v=signed13(f.get('resource_'+k));if(v!==0)resourceEffects[k]=v});
      const type=f.get('rhythmType'),val=Number(f.get('rhythmValue'))||null,rhythm={type};
      if(['timesWeek','everyDays'].includes(type))rhythm.value=val||1;
      if(type==='weeklyAmount'){rhythm.value=val||1;rhythm.unit=f.get('unit')||'ед.'}
      const split=v=>String(v||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean);
      const variants=split(f.get('variants')).map(x=>{const [name,kcal]=x.split('|');return{name:name.trim(),kcal:Number(kcal)||0}});
      Object.assign(old,{name:f.get('name'),branches,rhythm,metrics:split(f.get('metrics')),variants,resourceEffects,hideFromTimeline:f.get('hideFromTimeline')==='on'});
      if(old.id==='steps')old.calorieRule={amount:Number(f.get('stepAmount'))||10000,kcal:Number(f.get('stepKcal'))||0};
      if(!p)state.practices.push(old);save();document.querySelector('#modal').close();render();
    };
    document.querySelector('[data-delete-practice13]')?.addEventListener('click',()=>{if(confirm('Удалить практику?')){state.practices=state.practices.filter(x=>x.id!==p.id);save();document.querySelector('#modal').close();render()}});
  };

  // Show quiet status in practice menus so it is obvious why it disappears from history.
  const menuBeforeV13=practiceMenus;
  practiceMenus=function(){
    let html=menuBeforeV13();
    (state.practices||[]).filter(p=>p.hideFromTimeline).forEach(p=>{
      const safe=esc(p.name);
      html=html.replace(`<b>${safe}</b><small>${rhythmLabel(p.rhythm)}</small>`,`<b>${safe}</b><small>тихая практика · ${rhythmLabel(p.rhythm)}</small>`);
    });
    return html;
  };

  render();
})();