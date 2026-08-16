// RPG Life v7 — signed resources, Recognition, Hof series, boss victory
(function(){
  if(branchMeta?.presence) branchMeta.presence.name='Узнавание';
  if(practiceBranches?.presence) practiceBranches.presence.name='Узнавание';

  state.resources=state.resources||{};
  const legacyToSigned=v=>{
    const n=Number(v);
    if(!Number.isFinite(n)) return 0;
    if(n>=0&&n<=100) return Math.round((n-50)/2.5);
    return Math.max(-20,Math.min(20,Math.round(n)));
  };
  if(!state.resourcesV7Migrated){
    state.resources.inspiration=legacyToSigned(state.resources.inspiration);
    state.resources.calm=legacyToSigned(state.resources.calm);
    state.resources.energy=legacyToSigned(state.resources.energy);
    state.resources.recognition=0;
    state.resourcesV7Migrated=true;
  }
  if(state.resources.recognition===undefined) state.resources.recognition=0;

  const hof=state.practices.find(p=>p.id==='hof');
  if(hof){
    hof.metrics=['Задержки, сек','Отжимания'];
    hof.metricTypes={...(hof.metricTypes||{}),'Задержки, сек':'text','Отжимания':'number'};
  }
  save();

  const signed=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  const parseDate=d=>new Date(d+'T12:00:00');
  const dayDiff=(a,b)=>Math.round((parseDate(a)-parseDate(b))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;

  function buffsV7(date){
    const buffs=[];
    const logs=(state.practiceLogs||[]).filter(l=>l.date<=date),todayLogs=logs.filter(l=>l.date===date);
    if(['train','hof','cold'].every(id=>todayLogs.some(l=>l.practiceId===id))) buffs.push({id:'morning-boost',title:'Утренний разгон',note:'Тренировка, Хоф и холод собраны вместе.',effects:{energy:5}});
    if(todayLogs.some(l=>l.practiceId==='kitchen-morning')) buffs.push({id:'clean-start',title:'Чистый старт',note:'Утреннее окно не съедено бытовой вознёй.',effects:{inspiration:4}});
    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&dayDiff(date,l.date)>=0&&dayDiff(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){const opts=new Set(clothes.options||[]);if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x))) buffs.push({id:'calm-week',title:'Спокойная неделя',note:'Одежда на неделю полностью подготовлена.',effects:{calm:5}})}
    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&dayDiff(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0)),age=dayDiff(date,prep.date);if(days>0&&age<days) buffs.push({id:'full-pantry',title:'Кладовая полна, милорд',note:`Обеды заготовлены ещё примерно на ${Math.max(1,days-age)} дн.`,effects:{calm:4}})}
    const beauty=(state.states||[]).find(s=>s.type==='buff'&&String(s.title||'').trim().toLowerCase()==='красотка');
    if(beauty) buffs.push({id:'beauty',title:'Красотка',note:beauty.note||'Внешний образ совпадает с собой.',effects:{recognition:4},fromState:true});
    return buffs;
  }

  const resourceMetaV7={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  function resourceValuesV7(date){
    const v={};Object.keys(resourceMetaV7).forEach(k=>v[k]=signed(state.resources[k]));
    buffsV7(date).forEach(b=>Object.entries(b.effects||{}).forEach(([k,x])=>v[k]=signed((v[k]||0)+Number(x||0))));
    return v;
  }
  const pos=n=>((signed(n)+20)/40)*100;
  function resourceClass(v){return v>6?'high':v<-6?'low':'mid'}
  function resourcesCardV7(date){
    const vals=resourceValuesV7(date),buffs=buffsV7(date);
    return `<article class="v2-card v2-span-12 resources-card signed-resources"><div class="v2-row"><div><div class="v2-kicker">Ресурсы</div><h3 class="v2-title">Состояние сейчас</h3></div><button class="ghost" id="editResources">⚙ шкалы</button></div><div class="resource-grid resource-grid-v7">${Object.entries(resourceMetaV7).map(([k,m])=>`<div class="resource-item"><div class="resource-line"><span>${m.icon} ${m.name}</span><b class="resource-number ${resourceClass(vals[k])}">${vals[k]>0?'+':''}${vals[k]}</b></div><div class="signed-bar"><span class="zero-mark"></span><i class="resource-dot" style="left:${pos(vals[k])}%"></i></div><small>−20 <em>0</em> +20</small></div>`).join('')}</div>${buffs.length?`<div class="resource-buffs">${buffs.map(b=>`<span title="${esc(b.note)}">${esc(b.title)}</span>`).join('')}</div>`:''}</article>`;
  }
  function editResourcesV7(){
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Базовое состояние</div><h2>Ресурсы</h2></div><button class="close">×</button></div><form id="resourcesForm"><div class="v2-sub">Ноль — нейтрально. Ресурс может уходить до −20 и подниматься до +20. Бафы прибавляются временно.</div>${Object.entries(resourceMetaV7).map(([k,m])=>`<label>${m.icon} ${m.name}<div class="signed-input-row"><input name="${k}" type="range" min="-20" max="20" step="1" value="${signed(state.resources[k])}"><output id="out_${k}">${signed(state.resources[k])>0?'+':''}${signed(state.resources[k])}</output></div></label>`).join('')}<button class="primary">Сохранить</button></form>`);
    Object.keys(resourceMetaV7).forEach(k=>{const i=document.querySelector(`[name="${k}"]`),o=document.querySelector(`#out_${k}`);if(i&&o)i.oninput=()=>o.textContent=(Number(i.value)>0?'+':'')+i.value});
    document.querySelector('#resourcesForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);Object.keys(resourceMetaV7).forEach(k=>state.resources[k]=signed(f.get(k)));save();document.querySelector('#modal').close();render()};
  }

  // Daily practice editor: some metrics are text series rather than a single number.
  logPractice=function(id,logId=null){
    const p=state.practices.find(x=>x.id===id),existing=logId?state.practiceLogs.find(x=>x.id===logId):null;if(!p)return;
    openModal(`<div class="modal-head"><div><div class="v2-kicker">${fmt(selectedDate)}</div><h2>${esc(p.name)}</h2></div><button class="close">×</button></div><form id="logForm">${(p.variants||[]).length?`<fieldset class="option-field"><legend>Что именно?</legend><div class="option-grid">${p.variants.map(v=>`<label><input type="checkbox" name="opt" value="${esc(v.name)}" ${(existing?.options||[]).includes(v.name)?'checked':''}><span>${esc(v.name)}${v.kcal?` · ${v.kcal} ккал`:''}</span></label>`).join('')}</div></fieldset>`:''}${(p.metrics||[]).map((m,i)=>{const type=p.metricTypes?.[m]==='text'?'text':'number';return `<label>${esc(m)}<input type="${type}" ${type==='number'?'step="0.1"':''} name="m${i}" value="${esc(existing?.metrics?.[m]??'')}" ${type==='text'?'placeholder="например 60,90,90"':''}></label>`}).join('')}<label>Заметка<input name="note" value="${esc(existing?.note||'')}"></label><button class="primary">Сохранить</button></form>`);
    document.querySelector('#logForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),metrics={};(p.metrics||[]).forEach((m,i)=>{const raw=f.get('m'+i);if(raw!=='')metrics[m]=p.metricTypes?.[m]==='text'?String(raw).trim():Number(raw)});const data={practiceId:id,date:selectedDate,metrics,options:f.getAll('opt'),note:f.get('note')||''};data.amount=p.rhythm?.type==='weeklyAmount'?Number(Object.values(metrics)[0]||0):null;data.kcal=practiceKcal(p,data);if(existing){bankRemoveByRef(existing.id);Object.assign(existing,data);if(data.kcal)bankAdd(data.kcal,`${p.name}: расход`,data.date,'practice',existing.id)}else{const row={id:uid(),...data};state.practiceLogs.push(row);if(data.kcal)bankAdd(data.kcal,`${p.name}: расход`,data.date,'practice',row.id)}save();document.querySelector('#modal').close();render()};
  };

  const baseBossHTML=bossHTML;
  bossHTML=function(b){
    let html=baseBossHTML(b);
    if(b.status==='defeated') html=html.replace('</article>',`<div class="boss-victory"><span>✦</span><b>ПОБЕДА!</b><small>Босс повержен. Эта победа остаётся в истории персонажа.</small></div></article>`);
    return html;
  };
  const oldBattlesView=battlesView;
  battlesView=function(){return oldBattlesView()};

  const oldTodayV7=todayView;
  todayView=function(){
    let html=oldTodayV7();
    html=html.replace(/<article class="v2-card v2-span-12 resources-card[\s\S]*?<\/article>/,resourcesCardV7(selectedDate));
    return html.replaceAll('Узнавание себя','Узнавание');
  };
  const oldBranchesV7=branchesView;
  branchesView=function(){return oldBranchesV7().replaceAll('Узнавание себя','Узнавание').replaceAll('Присутствие','Узнавание')};

  const oldBindV7=bind;
  bind=function(){
    oldBindV7();
    document.querySelector('#editResources')?.addEventListener('click',editResourcesV7);
    document.querySelectorAll('[data-final]').forEach(input=>input.addEventListener('change',()=>{
      const [bid]=input.dataset.final.split(':'),b=state.bosses.find(x=>x.id===bid);if(!b)return;
      if((b.final||[]).length&&(b.final||[]).every(x=>x.done)){b.status='defeated';save();render()}
    }));
  };
  render();
})();