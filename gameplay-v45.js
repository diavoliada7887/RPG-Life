// RPG Life v45 — mobile Year repair + practice gold restored + seven House resources.
(function(){
  const HOUSE45={
    health:{name:'Дом Тела',short:'Тело',icon:'◆'},
    presence:{name:'Дом Присутствия',short:'Присутствие',icon:'✧'},
    work:{name:'Кузница Дела',short:'Дело',icon:'⚙'},
    creative:{name:'Башня Творчества',short:'Творчество',icon:'✦'},
    study:{name:'Обсерватория Знания',short:'Знание',icon:'◇'},
    publicity:{name:'Маяк',short:'Публичность',icon:'◉'},
    infrastructure:{name:'Усадьба',short:'Усадьба',icon:'▣'}
  };
  const TEMP45={inspiration:{name:'Вдохновение',icon:'✦'},calm:{name:'Спокойствие',icon:'☾'},energy:{name:'Энергия',icon:'⚡'},recognition:{name:'Узнавание',icon:'◈'}};

  state.wallet=state.wallet||{gold:0,diamonds:0};
  state.houseResources=state.houseResources&&typeof state.houseResources==='object'&&!Array.isArray(state.houseResources)?state.houseResources:{};
  state.houseResourceLedger=Array.isArray(state.houseResourceLedger)?state.houseResourceLedger:[];
  Object.keys(HOUSE45).forEach(k=>{if(!Number.isFinite(Number(state.houseResources[k])))state.houseResources[k]=0});

  const safeNum45=(n,min=0,max=9999)=>Math.max(min,Math.min(max,Math.round(Number(n)||0)));
  const split45=v=>String(v||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean);
  const signed45=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  const gold45=()=>'<img class="currency-img35 currency-gold35" src="assets/currency-gold.png" alt="золото">';

  function order45(p){
    return Object.entries(p?.branches||{}).filter(([k,v])=>HOUSE45[k]&&Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1])).map(([k])=>k);
  }
  function primary45(p){return p?.housePrimary&&HOUSE45[p.housePrimary]?p.housePrimary:order45(p)[0]||'health'}
  function secondary45(p){
    if(p?.houseSecondary&&HOUSE45[p.houseSecondary]&&p.houseSecondary!==primary45(p))return p.houseSecondary;
    return order45(p).find(k=>k!==primary45(p))||'';
  }
  function houseOptions45(selected='',empty=false){
    return (empty?'<option value="">Нет</option>':'')+Object.entries(HOUSE45).map(([k,m])=>`<option value="${k}" ${selected===k?'selected':''}>${esc(m.name)}</option>`).join('');
  }
  function variantsText45(p){return (p?.variants||[]).map(v=>`${v.name}|${v.kcal||0}`).join('; ')}
  function configuredRewardMap45(p){
    const main=primary45(p),second=secondary45(p);
    if(p?.houseResourceRewards&&typeof p.houseResourceRewards==='object'&&!Array.isArray(p.houseResourceRewards)){
      const out={};
      [main,second].filter(Boolean).forEach(k=>{out[k]=safeNum45(p.houseResourceRewards[k],0,999)});
      return out;
    }
    const out={[main]:1};if(second)out[second]=1;return out;
  }

  openPracticeEditor=function(id,branch){
    const p=id?(state.practices||[]).find(x=>x.id===id):null;
    const main=p?primary45(p):(HOUSE45[branch]?branch:'health'),second=p?secondary45(p):'';
    const r=p?.rhythm||{type:'timesWeek',value:1},fx=p?.resourceEffects||{},type=p?.practiceType||'standard',houseRewards=configuredRewardMap45(p||{housePrimary:main,houseSecondary:second});
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Практика</div><h2>${p?'Изменить':'Добавить'}</h2></div><button class="close">×</button></div><form id="practiceFormV45">
      <label>Название<input name="name" required value="${esc(p?.name||'')}"></label>
      <label>Тип практики<select name="practiceType"><option value="standard" ${type!=='checklist'?'selected':''}>Обычная</option><option value="checklist" ${type==='checklist'?'selected':''}>Составная · галочки</option></select></label>
      <label class="check-items-setting45">Пункты составной практики<input name="checkItems" value="${esc((p?.checkItems||[]).join('; '))}" placeholder="пункт 1; пункт 2; пункт 3"></label>

      <section class="house-editor44 reward-editor45"><div><b>Награда за выполнение</b><small>Обычное золото Сокровищницы. Старые записи не пересчитываются.</small></div><label class="practice-gold-field45"><span>${gold45()} Золото</span><input name="rewardGold" type="number" min="0" step="1" value="${Math.max(0,Number(p?.rewardGold||0))}"></label></section>

      <section class="house-editor44"><div><b>Что это строит</b><small>Практика принадлежит основному Дому и, при желании, ещё одному.</small></div><label>Основной Дом<select name="housePrimary" id="housePrimary45">${houseOptions45(main)}</select></label><label>Дополнительный Дом <small>необязательно</small><select name="houseSecondary" id="houseSecondary45">${houseOptions45(second,true)}</select></label></section>

      <section class="house-editor44 house-resource-editor45"><div><b>Ресурсы владений</b><small>Количество задаёшь сама. Доступны только ресурсы Домов, к которым относится практика.</small></div>${Object.entries(HOUSE45).map(([k,m])=>`<label class="house-resource-row45" data-house-resource-row45="${k}"><span><b>${m.icon}</b> ${esc(m.name)}</span><input name="houseResource_${k}" type="number" min="0" max="999" step="1" value="${safeNum45(houseRewards[k],0,999)}"></label>`).join('')}</section>

      <section class="house-editor44 resource-editor44"><div><b>Состояние после действия</b><small>Это временная погода персонажа, отдельно от строительных ресурсов.</small></div>${Object.entries(TEMP45).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input name="resource_${k}" type="number" min="-20" max="20" step="1" value="${Number(fx[k]||0)}"></div>`).join('')}<label>Эффект действует, дней<input name="resourceEffectDays" type="number" min="1" max="365" value="${Math.max(1,Number(p?.resourceEffectDays||1))}"></label></section>

      <label>Желательный ритм<select name="rhythmType"><option value="timesWeek" ${r.type==='timesWeek'?'selected':''}>N раз в неделю</option><option value="weeklyAmount" ${r.type==='weeklyAmount'?'selected':''}>Количество за неделю</option><option value="daily" ${r.type==='daily'?'selected':''}>Ежедневно</option><option value="everyDays" ${r.type==='everyDays'?'selected':''}>Раз в N дней</option><option value="soft" ${r.type==='soft'?'selected':''}>Без жёсткой частоты</option></select></label>
      <div class="form-grid"><label>Число<input name="rhythmValue" type="number" min="0" value="${r.value??''}"></label><label>Единица<input name="unit" value="${esc(r.unit||'')}"></label></div>
      <label>Показатели<input name="metrics" value="${esc((p?.metrics||[]).join('; '))}"></label>
      <label>Варианты дневной записи и расход<input name="variants" value="${esc(variantsText45(p))}" placeholder="Интервалка|200; Ноги|150"></label>
      ${p?.id==='steps'?`<div class="form-grid"><label>Шагов в правиле<input name="stepAmount" type="number" value="${p.calorieRule?.amount||10000}"></label><label>ккал за это количество<input name="stepKcal" type="number" value="${p.calorieRule?.kcal||0}"></label></div>`:''}
      <label class="quiet-practice-toggle"><input type="checkbox" name="hideFromTimeline" ${p?.hideFromTimeline?'checked':''}><span><b>Не отмечать в глобальном календаре и неделе</b><small>Практика всё равно даёт ресурс и строит Дом.</small></span></label>
      <div class="modal-actions"><button class="primary">Сохранить</button>${p?`<button type="button" class="danger-soft" id="deletePracticeV45">Удалить</button>`:''}</div>
    </form>`);

    const form=document.querySelector('#practiceFormV45'),mainSel=document.querySelector('#housePrimary45'),secondSel=document.querySelector('#houseSecondary45');
    const refreshResourceRows=()=>{
      const a=String(mainSel?.value||'health'),b=String(secondSel?.value||'');
      document.querySelectorAll('[data-house-resource-row45]').forEach(row=>{const k=row.dataset.houseResourceRow45;row.hidden=!(k===a||(b&&b!==a&&k===b))});
    };
    mainSel?.addEventListener('change',refreshResourceRows);secondSel?.addEventListener('change',refreshResourceRows);refreshResourceRows();

    form.onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(form),target=p||{id:uid()},main=String(f.get('housePrimary')||'health'),secondRaw=String(f.get('houseSecondary')||''),second=secondRaw&&secondRaw!==main?secondRaw:'';
      const branches={[main]:10};if(second)branches[second]=4;
      const effects={};Object.keys(TEMP45).forEach(k=>{const v=signed45(f.get('resource_'+k));if(v)effects[k]=v});
      const houseResourceRewards={[main]:safeNum45(f.get('houseResource_'+main),0,999)};if(second)houseResourceRewards[second]=safeNum45(f.get('houseResource_'+second),0,999);
      const rhythmType=String(f.get('rhythmType')||'soft'),val=Number(f.get('rhythmValue'))||null,rhythm={type:rhythmType};
      if(['timesWeek','everyDays'].includes(rhythmType))rhythm.value=val||1;
      if(rhythmType==='weeklyAmount'){rhythm.value=val||1;rhythm.unit=String(f.get('unit')||'ед.')}
      const variants=split45(f.get('variants')).map(x=>{const [name,kcal]=x.split('|');return{name:String(name||'').trim(),kcal:Number(kcal)||0}}).filter(x=>x.name);
      Object.assign(target,{
        name:String(f.get('name')||'').trim(),
        practiceType:f.get('practiceType')==='checklist'?'checklist':'standard',
        checkItems:split45(f.get('checkItems')),
        rewardGold:safeNum45(f.get('rewardGold'),0,99999),
        housePrimary:main,houseSecondary:second,houseResourceRewards,
        branches,rhythm,metrics:split45(f.get('metrics')),variants,
        resourceEffects:effects,resourceEffectDays:Math.max(1,Math.min(365,Number(f.get('resourceEffectDays'))||1)),
        hideFromTimeline:f.get('hideFromTimeline')==='on'
      });
      if(target.id==='steps')target.calorieRule={amount:Number(f.get('stepAmount'))||10000,kcal:Number(f.get('stepKcal'))||0};
      if(!p)state.practices.push(target);
      save();document.querySelector('#modal')?.close();render();
    };
    document.querySelector('#deletePracticeV45')?.addEventListener('click',()=>{if(confirm('Удалить практику? Старые записи останутся в истории.')){state.practices=state.practices.filter(x=>x.id!==p.id);save();document.querySelector('#modal')?.close();render()}});
  };

  function grantMap45(p){return configuredRewardMap45(p)}
  function grantLog45(log,p){
    if(!log||!p||state.houseResourceLedger.some(x=>x.sourceLogId===log.id))return false;
    const rewards=grantMap45(p),granted={};
    Object.entries(rewards).forEach(([k,v])=>{const amount=safeNum45(v,0,999);if(!HOUSE45[k]||!amount)return;state.houseResources[k]=Number(state.houseResources[k]||0)+amount;granted[k]=amount});
    if(!Object.keys(granted).length){log.houseResourceGranted={};return false}
    log.houseResourceGranted=granted;
    state.houseResourceLedger.push({id:uid(),sourceLogId:log.id,practiceId:p.id,date:log.date,at:new Date().toISOString(),granted:{...granted}});
    return true;
  }

  const logBefore45=logPractice;
  logPractice=function(id,logId=null){
    const before=new Set((state.practiceLogs||[]).map(x=>x.id)),dateAtOpen=selectedDate;
    logBefore45(id,logId);
    const form=document.querySelector('#logFormV17')||document.querySelector('#logForm')||document.querySelector('#checkPracticeForm37')||document.querySelector('#checkPracticeForm36');
    if(!form||logId)return;
    const p=(state.practices||[]).find(x=>x.id===id),map=p?grantMap45(p):{},bits=Object.entries(map).filter(([k,v])=>HOUSE45[k]&&Number(v)>0).map(([k,v])=>`${HOUSE45[k].icon} +${Number(v)}`);
    if(bits.length){
      const head=document.querySelector('#modal .modal-head > div');
      if(head&&!head.querySelector('.practice-house-reward45'))head.insertAdjacentHTML('beforeend',`<div class="practice-house-reward45">Ресурс: ${bits.join(' · ')}</div>`);
    }
    form.addEventListener('submit',()=>setTimeout(()=>{
      const practice=(state.practices||[]).find(x=>x.id===id);if(!practice)return;
      let changed=false;
      (state.practiceLogs||[]).filter(l=>l.practiceId===id&&l.date===dateAtOpen&&!before.has(l.id)).forEach(l=>{if(grantLog45(l,practice))changed=true});
      if(changed){save();render();if(typeof toast==='function')toast('Ресурс владения получен')}
    },0),{once:true});
  };

  function revokeHouseGrant45(logId){
    const rows=(state.houseResourceLedger||[]).filter(x=>x.sourceLogId===logId);
    rows.forEach(row=>Object.entries(row.granted||{}).forEach(([k,v])=>{if(HOUSE45[k])state.houseResources[k]=Math.max(0,Number(state.houseResources[k]||0)-Math.max(0,Number(v)||0))}));
    state.houseResourceLedger=(state.houseResourceLedger||[]).filter(x=>x.sourceLogId!==logId);
  }

  deleteLog=function(id){
    const l=(state.practiceLogs||[]).find(x=>x.id===id);if(!l)return;
    if(!confirm('Удалить запись?'))return;
    const reward=Math.max(0,Number(l.rewardGoldGranted||0));
    if(reward)state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-reward);
    if(Array.isArray(state.currencyLedger))state.currencyLedger=state.currencyLedger.filter(x=>!(x.sourceLogId===id||x.ledgerKey===`practice:${id}`));
    revokeHouseGrant45(id);
    if(typeof bankRemoveByRef==='function')bankRemoveByRef(id);
    state.practiceLogs=state.practiceLogs.filter(x=>x.id!==id);
    save();render();
  };

  function resourceStrip45(){
    return `<section class="house-resource-strip45"><div class="house-resource-strip-head45"><div><div class="v2-kicker">Ресурсы владений</div><b>Материалы мира</b></div><small>Пока символами — экономику прикрутим позже.</small></div><div class="house-resource-grid45">${Object.entries(HOUSE45).map(([k,m])=>`<div class="house-resource-chip45 house-resource-${k}45" title="${esc(m.name)}"><span>${m.icon}</span><b>${Number(state.houseResources[k]||0).toLocaleString('ru-RU')}</b><small>${esc(m.short)}</small></div>`).join('')}</div></section>`;
  }
  const branchesBefore45=branchesView;
  branchesView=function(){
    let html=branchesBefore45();
    const marker='<article class="house-rules44">';
    return html.includes(marker)?html.replace(marker,resourceStrip45()+marker):resourceStrip45()+html;
  };

  yearView=function(){
    const y=new Date().getFullYear(),memory=state.dayMemories?.[selectedDate]||'';
    return `<div class="v2-wrap year-page45"><h1 class="v2-title">Карта года · ${y}</h1><div class="months-grid">${Array.from({length:12},(_,m)=>monthHTML(y,m)).join('')}</div><div class="v2-card calendar-detail year-detail45"><h3>${fmt(selectedDate)}</h3><div class="year-day-events45">${todayLog()}</div>${memory?`<div class="calendar-memory36 year-memory45"><div class="v2-kicker">Чем запомнился день</div><p>${esc(memory)}</p></div>`:''}</div></div>`;
  };

  save();
  render();
})();
