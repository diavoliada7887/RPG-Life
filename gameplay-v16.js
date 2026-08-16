// RPG Life v16 — robust practice editor + derived resources
(function(){
  const resourceMeta={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  const signed=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  const parseDate=d=>new Date(d+'T12:00:00');
  const ageDays=(date,start)=>Math.floor((parseDate(date)-parseDate(start))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;

  state.resources={inspiration:0,calm:0,energy:0,recognition:0};
  (state.practices||[]).forEach(p=>{
    p.resourceEffects=p.resourceEffects||{};
    if(p.resourceEffectDays===undefined)p.resourceEffectDays=1;
    if(p.hideFromTimeline===undefined)p.hideFromTimeline=false;
    if(/^макияж$/i.test(String(p.name||'').trim())&&p.resourceEffects.recognition===undefined)p.resourceEffects.recognition=1;
  });
  save();

  function activePracticeEffects(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0},sources=[];
    (state.practiceLogs||[]).forEach(l=>{
      if(l.date>date)return;
      const p=state.practices.find(x=>x.id===l.practiceId);if(!p)return;
      const days=Math.max(1,Number(p.resourceEffectDays||1));
      const age=ageDays(date,l.date);
      if(age<0||age>=days)return;
      let used=false;
      Object.keys(out).forEach(k=>{const n=Number(p.resourceEffects?.[k]||0);if(n){out[k]+=n;used=true}});
      if(used)sources.push({name:p.name,remaining:Math.max(1,days-age)});
    });
    return {out,sources};
  }

  function buffEffects(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0},logs=(state.practiceLogs||[]).filter(l=>l.date<=date),todayLogs=logs.filter(l=>l.date===date);
    if(['train','hof','cold'].every(id=>todayLogs.some(l=>l.practiceId===id)))out.energy+=5;
    if(todayLogs.some(l=>l.practiceId==='kitchen-morning'))out.inspiration+=4;
    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&ageDays(date,l.date)>=0&&ageDays(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){const opts=new Set(clothes.options||[]);if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x)))out.calm+=5}
    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&ageDays(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0)),age=ageDays(date,prep.date);if(days>0&&age<days)out.calm+=4}
    if((state.states||[]).some(s=>s.type==='buff'&&String(s.title||'').trim().toLowerCase()==='красотка'))out.recognition+=4;
    return out;
  }

  function derivedValues(date){
    const p=activePracticeEffects(date),b=buffEffects(date),out={};
    Object.keys(resourceMeta).forEach(k=>out[k]=signed(p.out[k]+b[k]));
    return {out,p,b};
  }
  const pos=n=>((signed(n)+20)/40)*100;
  const klass=v=>v>6?'high':v<-6?'low':'mid';
  function resourcesCardV16(date){
    const x=derivedValues(date);
    return `<article class="v2-card v2-span-12 resources-card signed-resources"><div class="v2-row"><div><div class="v2-kicker">Ресурсы</div><h3 class="v2-title">Состояние сейчас</h3></div><small class="v2-sub">сумма действующих эффектов</small></div><div class="resource-grid resource-grid-v7">${Object.entries(resourceMeta).map(([k,m])=>{const v=x.out[k],p=x.p.out[k],b=x.b[k];return `<div class="resource-item"><div class="resource-line"><span>${m.icon} ${m.name}</span><b class="resource-number ${klass(v)}">${v>0?'+':''}${v}</b></div><div class="signed-bar"><span class="zero-mark"></span><i class="resource-dot" style="left:${pos(v)}%"></i></div><small>−20 <em>0</em> +20</small>${p||b?`<div class="resource-delta">${p?`практики ${p>0?'+':''}${p}`:''}${p&&b?' · ':''}${b?`бафы ${b>0?'+':''}${b}`:''}</div>`:''}</div>`}).join('')}</div>${x.p.sources.length?`<div class="resource-buffs active-effect-list">${x.p.sources.map(s=>`<span>${esc(s.name)} · ещё ${s.remaining} дн.</span>`).join('')}</div>`:''}</article>`;
  }

  function variantsText(p){return (p.variants||[]).map(v=>`${v.name}|${v.kcal||0}`).join('; ')}
  function practiceFormV16(p={},primaryBranch='health'){
    const branches=p.branches||{[primaryBranch]:10},r=p.rhythm||{type:'timesWeek',value:1},fx=p.resourceEffects||{};
    return `<div class="modal-head"><div><div class="v2-kicker">Настройки практики</div><h2>${p.id?'Изменить':'Добавить'}</h2></div><button class="close">×</button></div><form id="practiceFormV16">
      <label>Название<input name="name" required value="${esc(p.name||'')}"></label>
      <div class="form-section"><b>Влияние на ветки</b>${Object.entries(practiceBranches).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input type="number" min="0" max="100" name="weight_${k}" value="${branches[k]||0}"></div>`).join('')}</div>
      <div class="form-section"><b>Влияние на ресурсы</b>${Object.entries(resourceMeta).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input type="number" min="-20" max="20" step="1" name="resource_${k}" value="${Number(fx[k]||0)}"></div>`).join('')}</div>
      <label>Эффект действует, дней<input name="resourceEffectDays" type="number" min="1" max="365" step="1" value="${Math.max(1,Number(p.resourceEffectDays||1))}"><small>Например: макияж — 1, покраска волос — 30.</small></label>
      <label>Желательный ритм<select name="rhythmType"><option value="timesWeek" ${r.type==='timesWeek'?'selected':''}>N раз в неделю</option><option value="weeklyAmount" ${r.type==='weeklyAmount'?'selected':''}>Количество за неделю</option><option value="daily" ${r.type==='daily'?'selected':''}>Ежедневно</option><option value="everyDays" ${r.type==='everyDays'?'selected':''}>Раз в N дней</option><option value="soft" ${r.type==='soft'?'selected':''}>Без жёсткой частоты</option></select></label>
      <div class="form-grid"><label>Число<input name="rhythmValue" type="number" min="0" value="${r.value??''}"></label><label>Единица<input name="unit" value="${esc(r.unit||'')}"></label></div>
      <label>Показатели<input name="metrics" value="${esc((p.metrics||[]).join('; '))}"></label>
      <label>Варианты дневной записи и расход<input name="variants" value="${esc(variantsText(p))}" placeholder="Интервалка|200; Ноги|150"></label>
      ${p.id==='steps'?`<div class="form-grid"><label>Шагов в правиле<input name="stepAmount" type="number" value="${p.calorieRule?.amount||10000}"></label><label>ккал за это количество<input name="stepKcal" type="number" value="${p.calorieRule?.kcal||0}"></label></div>`:''}
      <label class="quiet-practice-toggle"><input type="checkbox" name="hideFromTimeline" ${p.hideFromTimeline?'checked':''}><span><b>Не отмечать в глобальном календаре и неделе</b><small>Практика всё равно влияет на ресурсы и бафы.</small></span></label>
      <div class="modal-actions"><button class="primary">Сохранить</button>${p.id?`<button type="button" class="danger-soft" data-delete-practice-v16="${p.id}">Удалить</button>`:''}</div>
    </form>`;
  }

  openPracticeEditor=function(id,branch){
    const p=id?state.practices.find(x=>x.id===id):null;
    openModal(practiceFormV16(p||{},branch));
    const form=document.querySelector('#practiceFormV16');
    form.onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(form),target=p||{id:uid()},branches={},resourceEffects={};
      Object.keys(practiceBranches).forEach(k=>{const v=Number(f.get('weight_'+k))||0;if(v>0)branches[k]=clamp(v)});
      Object.keys(resourceMeta).forEach(k=>{const v=signed(f.get('resource_'+k));if(v)resourceEffects[k]=v});
      const type=f.get('rhythmType'),val=Number(f.get('rhythmValue'))||null,rhythm={type};
      if(['timesWeek','everyDays'].includes(type))rhythm.value=val||1;
      if(type==='weeklyAmount'){rhythm.value=val||1;rhythm.unit=f.get('unit')||'ед.'}
      const split=v=>String(v||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean);
      const variants=split(f.get('variants')).map(x=>{const [name,kcal]=x.split('|');return{name:name.trim(),kcal:Number(kcal)||0}});
      Object.assign(target,{name:String(f.get('name')||'').trim(),branches,rhythm,metrics:split(f.get('metrics')),variants,resourceEffects,resourceEffectDays:Math.max(1,Math.min(365,Number(f.get('resourceEffectDays'))||1)),hideFromTimeline:f.get('hideFromTimeline')==='on'});
      if(target.id==='steps')target.calorieRule={amount:Number(f.get('stepAmount'))||10000,kcal:Number(f.get('stepKcal'))||0};
      if(!p)state.practices.push(target);
      save();
      document.querySelector('#modal').close();
      render();
    };
    document.querySelector('[data-delete-practice-v16]')?.addEventListener('click',()=>{if(confirm('Удалить практику?')){state.practices=state.practices.filter(x=>x.id!==p.id);save();document.querySelector('#modal').close();render()}});
  };

  const prevToday=todayView;
  todayView=function(){
    let html=prevToday();
    html=html.replace(/<article class="v2-card v2-span-12 resources-card[\s\S]*?<\/article>/,resourcesCardV16(selectedDate));
    return html;
  };

  render();
})();