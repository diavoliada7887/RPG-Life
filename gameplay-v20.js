// RPG Life v20 — editable complex buffs + buff page + calendar cleanup
(function(){
  const resourceMeta20={inspiration:{name:'Вдохновение',icon:'✦'},calm:{name:'Спокойствие',icon:'☾'},energy:{name:'Энергия',icon:'⚡'},recognition:{name:'Узнавание',icon:'◈'}};
  const coin20=()=>'<span class="currency-icon coin-icon" aria-hidden="true">G</span>';
  const gem20=()=>'<span class="currency-icon diamond-icon" aria-hidden="true">D</span>';
  const parse20=d=>new Date(d+'T12:00:00');
  const age20=(date,start)=>Math.floor((parse20(date)-parse20(start))/86400000);
  const clamp20=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));

  state.buffDefinitions=state.buffDefinitions||[];
  state.buffClaims=state.buffClaims||[];
  const builtinSeed=[
    {id:'buff-morning-boost',title:'Утренний разгон',description:'Полный телесный запуск утра.',mode:'all',practiceIds:['train','hof','cold'],windowDays:1,resourceEffects:{energy:5},rewardGold:0,rewardDiamonds:0,manual:false},
    {id:'buff-clean-start',title:'Чистый старт',description:'Бытовой хвост снят с утра.',mode:'all',practiceIds:['kitchen-morning'],windowDays:1,resourceEffects:{inspiration:4},rewardGold:0,rewardDiamonds:0,manual:false},
    {id:'buff-pretty',title:'Красотка',description:'Внешний образ особенно хорошо совпадает с ощущением себя.',mode:'manual',practiceIds:[],windowDays:1,resourceEffects:{recognition:4},rewardGold:0,rewardDiamonds:0,manual:true},
    {id:'buff-clean-line',title:'Чистая полоса',description:'Длинный период без алкоголя. Награда может быть редкой и системной.',mode:'manual',practiceIds:[],windowDays:14,resourceEffects:{},rewardGold:0,rewardDiamonds:1,manual:true}
  ];
  builtinSeed.forEach(seed=>{if(!state.buffDefinitions.some(b=>b.id===seed.id))state.buffDefinitions.push(seed)});
  (state.buffDefinitions||[]).forEach(b=>{b.practiceIds=b.practiceIds||[];b.resourceEffects=b.resourceEffects||{};if(b.windowDays===undefined)b.windowDays=1;if(b.rewardGold===undefined)b.rewardGold=0;if(b.rewardDiamonds===undefined)b.rewardDiamonds=0;if(!b.mode)b.mode='all'});
  save();

  function linkedBuffsForPractice(pid){return (state.buffDefinitions||[]).filter(b=>(b.practiceIds||[]).includes(pid))}
  function buffActive(b,date){
    if(b.mode==='manual')return (state.states||[]).some(s=>s.type==='buff'&&(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));
    const ids=b.practiceIds||[];if(!ids.length)return false;
    const days=Math.max(1,Number(b.windowDays||1));
    const active=id=>(state.practiceLogs||[]).some(l=>l.practiceId===id&&l.date<=date&&age20(date,l.date)>=0&&age20(date,l.date)<days);
    return b.mode==='any'?ids.some(active):ids.every(active);
  }
  function buffEffectText(b){const bits=[];Object.entries(resourceMeta20).forEach(([k,m])=>{const n=Number(b.resourceEffects?.[k]||0);if(n)bits.push(`${m.name} ${n>0?'+':''}${n}`)});if(Number(b.rewardGold||0))bits.push(`${Number(b.rewardGold)} золота`);if(Number(b.rewardDiamonds||0))bits.push(`${Number(b.rewardDiamonds)} алм.`);return bits.join(' · ')||'без численного эффекта'}
  function conditionText(b){if(b.mode==='manual')return'Ручная активация';const names=(b.practiceIds||[]).map(id=>state.practices.find(p=>p.id===id)?.name||'удалённая практика');return `${b.mode==='any'?'Любая':'Все'}: ${names.join(', ')||'практики не выбраны'} · окно ${Math.max(1,Number(b.windowDays||1))} дн.`}

  function buffsView20(){
    const rows=(state.buffDefinitions||[]).map(b=>{const active=buffActive(b,selectedDate);return `<article class="buff-editor-card ${active?'active':''}"><div class="buff-editor-head"><div><span class="buff-status">${active?'✦ АКТИВЕН':'○ не активен'}</span><h3>${esc(b.title)}</h3></div><button class="soft" data-edit-buff20="${b.id}">⚙</button></div><p>${esc(b.description||'')}</p><div class="buff-facts"><div><small>Условие</small><span>${esc(conditionText(b))}</span></div><div><small>Эффект / награда</small><strong>${esc(buffEffectText(b))}</strong></div></div></article>`}).join('');
    return `<div class="v2-wrap"><div class="v2-row"><div><div class="v2-kicker">Конструктор</div><h1 class="v2-title">Бафы</h1><div class="v2-sub">Многокомпонентные состояния, которые ты собираешь сама из практик и условий.</div></div><button class="primary" id="addBuff20">＋ Баф</button></div><div class="buff-page-grid">${rows||'<div class="v2-card">Пока бафов нет.</div>'}</div></div>`;
  }

  function buffForm20(b={}){
    const fx=b.resourceEffects||{},selected=new Set(b.practiceIds||[]);
    return `<div class="modal-head"><div><div class="v2-kicker">Конструктор бафа</div><h2>${b.id?'Изменить':'Новый баф'}</h2></div><button class="close">×</button></div><form id="buffForm20"><label>Название<input name="title" required value="${esc(b.title||'')}"></label><label>Описание<textarea name="description">${esc(b.description||'')}</textarea></label><label>Как активируется<select name="mode"><option value="all" ${b.mode==='all'?'selected':''}>Все связанные практики</option><option value="any" ${b.mode==='any'?'selected':''}>Любая из связанных практик</option><option value="manual" ${b.mode==='manual'?'selected':''}>Вручную</option></select></label><label>Окно условия, дней<input name="windowDays" type="number" min="1" max="365" value="${Math.max(1,Number(b.windowDays||1))}"><small>1 = в один день; 7 = достаточно, чтобы условия случились за последние 7 дней.</small></label><fieldset class="buff-practice-picker"><legend>Связанные практики</legend>${(state.practices||[]).map(p=>`<label><input type="checkbox" name="practiceId" value="${p.id}" ${selected.has(p.id)?'checked':''}><span>${esc(p.name)}</span></label>`).join('')||'<small>Сначала создай практики.</small>'}</fieldset><div class="form-section"><b>Влияние на ресурсы</b>${Object.entries(resourceMeta20).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input name="resource_${k}" type="number" min="-20" max="20" value="${Number(fx[k]||0)}"></div>`).join('')}</div><div class="form-section"><b>Награда при срабатывании</b><div class="form-grid"><label>${coin20()} Золото<input name="rewardGold" type="number" min="0" value="${Number(b.rewardGold||0)}"></label><label>${gem20()} Алмазы<input name="rewardDiamonds" type="number" min="0" value="${Number(b.rewardDiamonds||0)}"></label></div><small>Награда выдаётся один раз на дату активации, не при каждой перерисовке страницы.</small></div><div class="modal-actions"><button class="primary">Сохранить</button>${b.id?`<button type="button" class="danger-soft" id="deleteBuff20">Удалить</button>`:''}</div></form>`;
  }
  function openBuff20(id=null){
    const b=id?state.buffDefinitions.find(x=>x.id===id):null;openModal(buffForm20(b||{}));
    document.querySelector('#buffForm20').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=b||{id:uid()},fx={};Object.keys(resourceMeta20).forEach(k=>{const n=clamp20(f.get('resource_'+k));if(n)fx[k]=n});Object.assign(target,{title:String(f.get('title')||'').trim(),description:f.get('description')||'',mode:f.get('mode'),windowDays:Math.max(1,Math.min(365,Number(f.get('windowDays'))||1)),practiceIds:f.getAll('practiceId'),resourceEffects:fx,rewardGold:Math.max(0,Math.round(Number(f.get('rewardGold'))||0)),rewardDiamonds:Math.max(0,Math.round(Number(f.get('rewardDiamonds'))||0))});if(!b)state.buffDefinitions.push(target);save();document.querySelector('#modal').close();render()};
    document.querySelector('#deleteBuff20')?.addEventListener('click',()=>{if(confirm('Удалить баф?')){state.buffDefinitions=state.buffDefinitions.filter(x=>x.id!==b.id);state.states=(state.states||[]).filter(s=>s.buffId!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  // Add reverse links to the latest practice editor without replacing its save logic.
  const prevOpenPractice20=openPracticeEditor;
  openPracticeEditor=function(id,branch){
    const p=id?state.practices.find(x=>x.id===id):null;prevOpenPractice20(id,branch);
    const form=document.querySelector('#practiceFormV17')||document.querySelector('#practiceFormV16');if(!form)return;
    const selected=new Set(p?linkedBuffsForPractice(p.id).map(b=>b.id):[]),wrap=document.createElement('fieldset');wrap.className='practice-buff-links';wrap.innerHTML=`<legend>Связанные бафы</legend>${(state.buffDefinitions||[]).map(b=>`<label><input type="checkbox" name="linkedBuffId20" value="${b.id}" ${selected.has(b.id)?'checked':''}><span>${esc(b.title)}</span></label>`).join('')||'<small>Пока нет созданных бафов.</small>'}`;form.insertBefore(wrap,form.querySelector('.modal-actions'));
    const oldSubmit=form.onsubmit;form.onsubmit=e=>{const ids=new FormData(form).getAll('linkedBuffId20');const name=String(new FormData(form).get('name')||'').trim();oldSubmit.call(form,e);const target=p||[...(state.practices||[])].reverse().find(x=>x.name===name);if(target){(state.buffDefinitions||[]).forEach(b=>{b.practiceIds=(b.practiceIds||[]).filter(pid=>pid!==target.id);if(ids.includes(b.id))b.practiceIds.push(target.id)});save()}};
  };

  // Calendar detail: explicit cleanup controls for mistakes during testing and later use.
  function calendarCleanup20(date){
    const pl=(state.practiceLogs||[]).filter(l=>l.date===date),cl=(state.creativeLogs||[]).filter(l=>l.date===date),al=(state.achievements||[]).filter(a=>a.date===date);
    if(!pl.length&&!cl.length&&!al.length)return'';
    return `<div class="calendar-cleanup"><div class="v2-row"><div><div class="v2-kicker">Правка дня</div><b>Удалить ошибочную запись</b></div>${pl.length+cl.length>1?`<button class="danger-soft" data-clear-day20="${date}">Очистить события дня</button>`:''}</div>${pl.map(l=>{const p=state.practices.find(x=>x.id===l.practiceId);return `<div><span>${esc(p?.name||'Практика')}</span><button data-del-practice-cal20="${l.id}">×</button></div>`}).join('')}${cl.map(l=>{const line=state.creativeLines.find(x=>x.id===l.lineId);return `<div><span>${esc(line?.title||'Творчество')} · ${esc(l.type||'')}</span><button data-del-creative-cal20="${l.id}">×</button></div>`}).join('')}${al.map(a=>`<div><span>✦ ${esc(a.title)}</span><button data-del-ach20="${a.id}">×</button></div>`).join('')}</div>`;
  }
  const prevYear20=yearView;
  yearView=function(){let html=prevYear20();const add=calendarCleanup20(selectedDate);if(add)html=html.replace('</div></div>',add+'</div></div>');return html};

  // Move complex buff catalogue off the home page; keep only active-effects ledger there.
  const prevToday20=todayView;
  todayView=function(){let html=prevToday20();html=html.replace(/<article class="v2-card v2-span-12 buff-compendium-card">[\s\S]*?<\/article>/,'');return html};

  // Full render map with Buffs as a real page.
  render=function(){document.querySelectorAll('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));document.querySelector('#app').innerHTML=({today:todayView,branches:branchesView,battles:battlesView,rewards:rewardsView,buffs:buffsView20,memory:memoryView,year:yearView}[view]||todayView)();bind()};
  const prevBind20=bind;
  bind=function(){prevBind20();document.querySelector('#addBuff20')?.addEventListener('click',()=>openBuff20());document.querySelectorAll('[data-edit-buff20]').forEach(b=>b.onclick=()=>openBuff20(b.dataset.editBuff20));document.querySelectorAll('[data-del-practice-cal20]').forEach(b=>b.onclick=()=>deleteLog(b.dataset.delPracticeCal20));document.querySelectorAll('[data-del-creative-cal20]').forEach(b=>b.onclick=()=>{if(confirm('Удалить запись?')){state.creativeLogs=state.creativeLogs.filter(x=>x.id!==b.dataset.delCreativeCal20);save();render()}});document.querySelectorAll('[data-del-ach20]').forEach(b=>b.onclick=()=>{if(confirm('Удалить отметку из Памяти и календаря?')){state.achievements=state.achievements.filter(x=>x.id!==b.dataset.delAch20);save();render()}});document.querySelectorAll('[data-clear-day20]').forEach(b=>b.onclick=()=>{if(!confirm('Удалить все обычные и творческие записи этого дня?'))return;const d=b.dataset.clearDay20;(state.practiceLogs||[]).filter(l=>l.date===d).forEach(l=>{const reward=Math.max(0,Number(l.rewardGoldGranted||0));if(reward)state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-reward);bankRemoveByRef(l.id)});state.practiceLogs=state.practiceLogs.filter(l=>l.date!==d);state.creativeLogs=state.creativeLogs.filter(l=>l.date!==d);save();render()})};
  render();
})();
