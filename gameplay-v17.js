// RPG Life v17 — quiet practices stay visible in the day log + gold reward per completion
(function(){
  const resourceMeta={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  const signed=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  const coin=()=>'<span class="currency-icon coin-icon" aria-label="золото">G</span>';

  (state.practices||[]).forEach(p=>{if(p.rewardGold===undefined)p.rewardGold=0});
  (state.practiceLogs||[]).forEach(l=>{if(l.rewardGoldGranted===undefined)l.rewardGoldGranted=0});
  save();

  function variantsText17(p){return (p.variants||[]).map(v=>`${v.name}|${v.kcal||0}`).join('; ')}
  function practiceForm17(p={},primaryBranch='health'){
    const branches=p.branches||{[primaryBranch]:10},r=p.rhythm||{type:'timesWeek',value:1},fx=p.resourceEffects||{};
    return `<div class="modal-head"><div><div class="v2-kicker">Настройки практики</div><h2>${p.id?'Изменить':'Добавить'}</h2></div><button class="close">×</button></div><form id="practiceFormV17">
      <label>Название<input name="name" required value="${esc(p.name||'')}"></label>
      <div class="form-section"><b>Награда за выполнение</b><label class="practice-gold-field"><span>${coin()} Золото</span><input name="rewardGold" type="number" min="0" step="1" value="${Math.max(0,Number(p.rewardGold||0))}"></label></div>
      <div class="form-section"><b>Влияние на ветки</b>${Object.entries(practiceBranches).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input type="number" min="0" max="100" name="weight_${k}" value="${branches[k]||0}"></div>`).join('')}</div>
      <div class="form-section"><b>Влияние на ресурсы</b>${Object.entries(resourceMeta).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input type="number" min="-20" max="20" step="1" name="resource_${k}" value="${Number(fx[k]||0)}"></div>`).join('')}</div>
      <label>Эффект действует, дней<input name="resourceEffectDays" type="number" min="1" max="365" step="1" value="${Math.max(1,Number(p.resourceEffectDays||1))}"></label>
      <label>Желательный ритм<select name="rhythmType"><option value="timesWeek" ${r.type==='timesWeek'?'selected':''}>N раз в неделю</option><option value="weeklyAmount" ${r.type==='weeklyAmount'?'selected':''}>Количество за неделю</option><option value="daily" ${r.type==='daily'?'selected':''}>Ежедневно</option><option value="everyDays" ${r.type==='everyDays'?'selected':''}>Раз в N дней</option><option value="soft" ${r.type==='soft'?'selected':''}>Без жёсткой частоты</option></select></label>
      <div class="form-grid"><label>Число<input name="rhythmValue" type="number" min="0" value="${r.value??''}"></label><label>Единица<input name="unit" value="${esc(r.unit||'')}"></label></div>
      <label>Показатели<input name="metrics" value="${esc((p.metrics||[]).join('; '))}"></label>
      <label>Варианты дневной записи и расход<input name="variants" value="${esc(variantsText17(p))}" placeholder="Интервалка|200; Ноги|150"></label>
      ${p.id==='steps'?`<div class="form-grid"><label>Шагов в правиле<input name="stepAmount" type="number" value="${p.calorieRule?.amount||10000}"></label><label>ккал за это количество<input name="stepKcal" type="number" value="${p.calorieRule?.kcal||0}"></label></div>`:''}
      <label class="quiet-practice-toggle"><input type="checkbox" name="hideFromTimeline" ${p.hideFromTimeline?'checked':''}><span><b>Не отмечать в глобальном календаре и неделе</b><small>В «Зафиксировано» практика всё равно остаётся.</small></span></label>
      <div class="modal-actions"><button class="primary">Сохранить</button>${p.id?`<button type="button" class="danger-soft" data-delete-practice-v17="${p.id}">Удалить</button>`:''}</div>
    </form>`;
  }

  openPracticeEditor=function(id,branch){
    const p=id?state.practices.find(x=>x.id===id):null;
    openModal(practiceForm17(p||{},branch));
    const form=document.querySelector('#practiceFormV17');
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
      Object.assign(target,{name:String(f.get('name')||'').trim(),rewardGold:Math.max(0,Math.round(Number(f.get('rewardGold'))||0)),branches,rhythm,metrics:split(f.get('metrics')),variants,resourceEffects,resourceEffectDays:Math.max(1,Math.min(365,Number(f.get('resourceEffectDays'))||1)),hideFromTimeline:f.get('hideFromTimeline')==='on'});
      if(target.id==='steps')target.calorieRule={amount:Number(f.get('stepAmount'))||10000,kcal:Number(f.get('stepKcal'))||0};
      if(!p)state.practices.push(target);
      save();document.querySelector('#modal').close();render();
    };
    document.querySelector('[data-delete-practice-v17]')?.addEventListener('click',()=>{if(confirm('Удалить практику?')){state.practices=state.practices.filter(x=>x.id!==p.id);save();document.querySelector('#modal').close();render()}});
  };

  // Keep Hof's text-series metric behavior while adding gold rewards.
  logPractice=function(id,logId=null){
    const p=state.practices.find(x=>x.id===id),existing=logId?state.practiceLogs.find(x=>x.id===logId):null;if(!p)return;
    openModal(`<div class="modal-head"><div><div class="v2-kicker">${fmt(selectedDate)}</div><h2>${esc(p.name)}</h2>${Number(p.rewardGold||0)?`<div class="practice-log-reward">За выполнение: ${coin()} <b>${Number(p.rewardGold)}</b></div>`:''}</div><button class="close">×</button></div><form id="logFormV17">${(p.variants||[]).length?`<fieldset class="option-field"><legend>Что именно?</legend><div class="option-grid">${p.variants.map(v=>`<label><input type="checkbox" name="opt" value="${esc(v.name)}" ${(existing?.options||[]).includes(v.name)?'checked':''}><span>${esc(v.name)}${v.kcal?` · ${v.kcal} ккал`:''}</span></label>`).join('')}</div></fieldset>`:''}${(p.metrics||[]).map((m,i)=>{const type=p.metricTypes?.[m]==='text'?'text':'number';return `<label>${esc(m)}<input type="${type}" ${type==='number'?'step="0.1"':''} name="m${i}" value="${esc(existing?.metrics?.[m]??'')}" ${type==='text'?'placeholder="например 60,90,90"':''}></label>`}).join('')}<label>Заметка<input name="note" value="${esc(existing?.note||'')}"></label><button class="primary">Сохранить</button></form>`);
    document.querySelector('#logFormV17').onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.currentTarget),metrics={};
      (p.metrics||[]).forEach((m,i)=>{const raw=f.get('m'+i);if(raw!=='')metrics[m]=p.metricTypes?.[m]==='text'?String(raw).trim():Number(raw)});
      const data={practiceId:id,date:selectedDate,metrics,options:f.getAll('opt'),note:f.get('note')||''};
      data.amount=p.rhythm?.type==='weeklyAmount'?Number(Object.values(metrics)[0]||0):null;data.kcal=practiceKcal(p,data);
      if(existing){
        bankRemoveByRef(existing.id);Object.assign(existing,data);if(data.kcal)bankAdd(data.kcal,`${p.name}: расход`,data.date,'practice',existing.id);
      }else{
        const reward=Math.max(0,Math.round(Number(p.rewardGold||0))),row={id:uid(),...data,rewardGoldGranted:reward};
        state.practiceLogs.push(row);if(data.kcal)bankAdd(data.kcal,`${p.name}: расход`,data.date,'practice',row.id);
        if(reward)state.wallet.gold=Number(state.wallet.gold||0)+reward;
      }
      save();document.querySelector('#modal').close();render();
    };
  };

  // "Зафиксировано" must show every practice done on the selected day, including quiet ones.
  todayLog=function(){
    const pLogs=(state.practiceLogs||[]).filter(l=>l.date===selectedDate).map(l=>{
      const p=state.practices.find(x=>x.id===l.practiceId),quiet=!!p?.hideFromTimeline,reward=Number(l.rewardGoldGranted||0);
      return `<div class="today-event ${quiet?'quiet-today-event':''}"><span>${branchMeta[Object.keys(p?.branches||{})[0]]?.icon||'•'}</span><div class="today-event-main"><b>${esc(p?.name||'Практика')}${quiet?' <em class="quiet-mark">тихо</em>':''}</b><small>${esc(logDetails(l))}${reward?` · +${reward} золота`:''}</small></div><div class="event-actions"><button data-edit-log="${l.id}">✎</button><button data-delete-log="${l.id}">×</button></div></div>`;
    });
    const cLogs=creativeForDate(selectedDate).map(l=>{const line=state.creativeLines.find(x=>x.id===l.lineId);return `<div class="today-event creative-event"><span>✒</span><div class="today-event-main"><b>${esc(line?.title||'Творчество')} · ${esc(l.type)}</b><small>${esc([l.amount?`${l.amount} ${l.unit||''}`:'',l.significance==='breakthrough'?'ПРОРЫВ':'',l.note||''].filter(Boolean).join(' · '))}</small></div><div class="event-actions"><button data-edit-creative="${l.id}">✎</button><button data-delete-creative="${l.id}">×</button></div></div>`});
    return [...pLogs,...cLogs].join('')||'<div class="empty-v2">Этот день пока не описан.</div>';
  };

  deleteLog=function(id){
    if(!confirm('Удалить запись?'))return;
    const l=state.practiceLogs.find(x=>x.id===id);if(!l)return;
    const reward=Math.max(0,Number(l.rewardGoldGranted||0));
    if(reward)state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-reward);
    bankRemoveByRef(id);state.practiceLogs=state.practiceLogs.filter(x=>x.id!==id);save();render();
  };

  // Add reward amount to the practice menu for quick visibility.
  const prevMenus=practiceMenus;
  practiceMenus=function(){
    let html=prevMenus();
    (state.practices||[]).forEach(p=>{
      const reward=Number(p.rewardGold||0);if(!reward)return;
      const safe=esc(p.name),needle=`<b>${safe}</b>`;
      html=html.replace(needle,`<b>${safe}</b><span class="practice-menu-reward">${coin()} ${reward}</span>`);
    });
    return html;
  };

  render();
})();