// RPG Life v38 — compact Gryzliki + hidden day ledger + explicit N-days-per-week buff rules
(function(){
  const DAY=86400000;
  const localDate38=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const parse38=d=>new Date(d+'T12:00:00');
  const iso38=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const weekStart38=date=>{const d=parse38(date),n=(d.getDay()+6)%7;d.setDate(d.getDate()-n);return iso38(d)};
  const shift38=(date,n)=>{const d=parse38(date);d.setDate(d.getDate()+n);return iso38(d)};
  const gold38=()=>'<img class="currency-img35 currency-gold35" src="assets/currency-gold.png" alt="золото">';
  const diamond38=()=>'<img class="currency-img35 currency-diamond35" src="assets/currency-diamond.png" alt="алмазы">';
  state.buffDefinitions=state.buffDefinitions||[];
  state.buffClaims=state.buffClaims||[];
  state.currencyLedger=state.currencyLedger||[];
  state.wallet=state.wallet||{gold:0,diamonds:0};

  function migrateRules38(){
    let changed=false;
    (state.buffDefinitions||[]).forEach(b=>{
      if(b.customRule||b.mode==='manual'||b.conditionKind)return;
      const old=Math.max(1,Number(b.windowDays||1));
      // The old editor called this simply “Окно, дней”. For user-created rules 2–7 was naturally read as
      // “do it N days a week”, so migrate those rules to that explicit meaning.
      if(old>=2&&old<=7){b.conditionKind='daysPerWeek';b.requiredDays=old;b.windowDays=7;changed=true}
      else {b.conditionKind='recentWindow';b.requiredDays=1;changed=true}
    });
    return changed;
  }

  function completedLog38(pid,date){return (state.practiceLogs||[]).some(l=>l.practiceId===pid&&l.date===date)}
  function qualifyingDays38(b,date){
    const ids=b.practiceIds||[];if(!ids.length)return 0;
    const start=weekStart38(date);let count=0;
    for(let i=0;i<7;i++){
      const d=shift38(start,i);if(d>date)break;
      const hit=b.mode==='any'?ids.some(id=>completedLog38(id,d)):ids.every(id=>completedLog38(id,d));
      if(hit)count++;
    }
    return count;
  }
  function age38(date,start){return Math.floor((parse38(date)-parse38(start))/DAY)}
  function genericActive38(b,date){
    const ids=b.practiceIds||[];if(!ids.length)return false;
    if(b.conditionKind==='daysPerWeek')return qualifyingDays38(b,date)>=Math.max(1,Math.min(7,Number(b.requiredDays||1)));
    const days=Math.max(1,Number(b.windowDays||1));
    const hit=id=>(state.practiceLogs||[]).some(l=>l.practiceId===id&&l.date<=date&&age38(date,l.date)>=0&&age38(date,l.date)<days);
    return b.mode==='any'?ids.some(hit):ids.every(hit);
  }
  function buffActive38(b,date){
    if(b.customRule==='mealPrepStock'){
      const pid=(b.practiceIds||[])[0]||'meal-prep',log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date).sort((a,z)=>z.date.localeCompare(a.date))[0];if(!log)return false;
      const days=Math.max(0,Number(log.metrics?.['Дней запаса']||0));return days>0&&age38(date,log.date)>=0&&age38(date,log.date)<days;
    }
    if(b.customRule==='clothesWeek'){
      const pid=(b.practiceIds||[])[0]||'clothes-week',log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date&&age38(date,l.date)>=0&&age38(date,l.date)<7).sort((a,z)=>z.date.localeCompare(a.date))[0];if(!log)return false;
      const opts=new Set(log.options||[]);return ['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x));
    }
    if(b.customRule==='slimWeek')return true; // leave the v27 special rolling-deficit renderer in charge
    if(b.mode==='manual')return (state.states||[]).some(s=>s.type==='buff'&&(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));
    return genericActive38(b,date);
  }

  function weeklyReward38(b,date){
    if(b.conditionKind!=='daysPerWeek'||!buffActive38(b,date))return false;
    const ws=weekStart38(date),key=`weekly:${b.id}:${ws}`;
    if(state.buffClaims.some(c=>c.key===key||c.rewardKey===key))return false;
    const gold=Math.max(0,Math.round(Number(b.rewardGold||0))),diamonds=Math.max(0,Math.round(Number(b.rewardDiamonds||0)));if(!gold&&!diamonds)return false;
    state.wallet.gold=Number(state.wallet.gold||0)+gold;state.wallet.diamonds=Number(state.wallet.diamonds||0)+diamonds;
    const at=new Date().toISOString(),claim={id:uid(),key,rewardKey:key,buffId:b.id,date,at,gold,diamonds,signature:`week:${ws}`};state.buffClaims.push(claim);
    state.currencyLedger.push({id:uid(),ledgerKey:`claim:${claim.id}`,date,at,kind:'buff',sourceId:b.id,title:`Баф · ${b.title}`,gold,diamonds});return true;
  }

  function revokeBadCurrentWeekClaims38(){
    let changed=false;const today=localDate38(),ws=weekStart38(today),migrated=new Set(state.buffDefinitions.filter(b=>b.conditionKind==='daysPerWeek').map(b=>b.id));
    const badClaims=(state.buffClaims||[]).filter(c=>migrated.has(c.buffId)&&(c.date||'')>=ws&&!String(c.key||'').startsWith('weekly:')&&!buffActive38(state.buffDefinitions.find(b=>b.id===c.buffId),c.date||today));
    badClaims.forEach(c=>{state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-Number(c.gold||0));state.wallet.diamonds=Math.max(0,Number(state.wallet.diamonds||0)-Number(c.diamonds||0));state.currencyLedger=state.currencyLedger.filter(x=>!(x.kind==='buff'&&x.sourceId===c.buffId&&((x.ledgerKey===`claim:${c.id}`)||x.date===c.date)));changed=true});
    if(badClaims.length)state.buffClaims=state.buffClaims.filter(c=>!badClaims.includes(c));return changed;
  }

  function ruleText38(b,date=selectedDate){
    if(b.conditionKind==='daysPerWeek'){
      const n=Math.max(1,Math.min(7,Number(b.requiredDays||1))),done=qualifyingDays38(b,date);
      return `${b.mode==='any'?'Любая из выбранных практик засчитывает день':'Все выбранные практики должны быть выполнены в один день'} · нужно ${n} из 7 дней · сейчас ${done}/${n}`;
    }
    return `${b.mode==='any'?'Любая':'Все'} выбранные практики · окно ${Math.max(1,Number(b.windowDays||1))} дн.`;
  }
  function effect38(b){const names={inspiration:'✦ Вдохновение',calm:'☾ Спокойствие',energy:'⚡ Энергия',recognition:'◈ Узнавание'},bits=[];Object.entries(names).forEach(([k,n])=>{const v=Number(b.resourceEffects?.[k]||0);if(v)bits.push(`${n} ${v>0?'+':''}${v}`)});if(Number(b.rewardGold||0))bits.push(`${gold38()} +${Number(b.rewardGold)}`);if(Number(b.rewardDiamonds||0))bits.push(`${diamond38()} +${Number(b.rewardDiamonds)}`);return bits.join(' · ')||'без численного эффекта'}
  function thumb38(b){return `<div class="buff-thumb23">${b.imageData?`<img src="${b.imageData}" alt="">`:'✦'}</div>`}

  buffsView=function(){
    const cards=(state.buffDefinitions||[]).map(b=>{const active=buffActive38(b,selectedDate);return `<article class="buff-card23 ${active?'active':''}">${thumb38(b)}<div class="buff-main23"><div class="buff-head23"><div><span class="buff-status23">${active?'✦ Активен':'○ Не активен'}</span><h3>${esc(b.title)}</h3></div><div class="buff-actions23"><button class="icon-button23" data-edit-buff38="${b.id}" title="Изменить">⚙</button></div></div>${b.description?`<p>${esc(b.description)}</p>`:''}<details class="buff-rule-details23"><summary>Условие и эффект <span>▾</span></summary><div><small>Условие</small><p>${esc(ruleText38(b))}</p><small>Эффект</small><strong>${effect38(b)}</strong></div></details></div></article>`}).join('');
    return `<div class="v2-wrap"><div class="v2-row"><div><div class="v2-kicker">Конструктор</div><h1 class="v2-title">Бафы</h1></div><button class="primary" id="addBuff38">＋ Баф</button></div><div class="buff-page-grid23">${cards||'<div class="v2-card">Пока бафов нет.</div>'}</div></div>`;
  };

  function editBuff38(id=null){
    const b=id?state.buffDefinitions.find(x=>x.id===id):null,selected=new Set(b?.practiceIds||[]),fx=b?.resourceEffects||{};let imageData=b?.imageData||'';
    const allPractices=()=>state.practices.filter(p=>!selected.has(p.id));
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Конструктор бафа</div><h2>${b?'Изменить':'Новый баф'}</h2></div><button class="close">×</button></div><form id="buffForm38"><label>Название<input name="title" required value="${esc(b?.title||'')}"></label><label>Описание<textarea name="description">${esc(b?.description||'')}</textarea></label><section class="buff-section23"><h3>Когда срабатывает</h3><div class="buff-mode23"><label><input type="radio" name="mode" value="all" ${(b?.mode||'all')==='all'?'checked':''}><span>Все</span></label><label><input type="radio" name="mode" value="any" ${b?.mode==='any'?'checked':''}><span>Любая</span></label><label><input type="radio" name="mode" value="manual" ${b?.mode==='manual'?'checked':''}><span>Вручную</span></label></div><label>Тип условия<select name="conditionKind"><option value="daysPerWeek" ${(b?.conditionKind||'daysPerWeek')==='daysPerWeek'?'selected':''}>Ритм · N дней из недели</option><option value="recentWindow" ${b?.conditionKind==='recentWindow'?'selected':''}>Хотя бы раз за последние N дней</option></select></label><div class="form-grid"><label>Нужно дней из 7<input name="requiredDays" type="number" min="1" max="7" value="${Math.max(1,Math.min(7,Number(b?.requiredDays||1)))}"><small>Например 5 = баф включится только после пяти подходящих дней этой недели.</small></label><label>Окно для режима «хотя бы раз»<input name="windowDays" type="number" min="1" max="365" value="${Math.max(1,Number(b?.windowDays||1))}"></label></div><div id="chips38" class="chips23"></div><div class="picker23"><select id="practiceSelect38"></select><button class="soft" type="button" id="addPractice38">＋ Добавить</button></div></section><section class="buff-section23"><h3>Что даёт</h3>${[['inspiration','✦ Вдохновение'],['calm','☾ Спокойствие'],['energy','⚡ Энергия'],['recognition','◈ Узнавание']].map(([k,n])=>`<div class="weight-row"><span>${n}</span><input name="resource_${k}" type="number" min="-20" max="20" value="${Number(fx[k]||0)}"></div>`).join('')}</section><section class="buff-section23"><h3>Награда</h3><div class="form-grid"><label>${gold38()} Золото<input name="rewardGold" type="number" min="0" value="${Number(b?.rewardGold||0)}"></label><label>${diamond38()} Алмазы<input name="rewardDiamonds" type="number" min="0" value="${Number(b?.rewardDiamonds||0)}"></label></div></section><div class="modal-actions">${b?'<button type="button" class="danger-soft" id="deleteBuff38">Удалить</button>':''}<button class="primary">Сохранить</button></div></form>`);
    const chips=document.querySelector('#chips38'),sel=document.querySelector('#practiceSelect38');const sync=()=>{chips.innerHTML=[...selected].map(pid=>{const p=state.practices.find(x=>x.id===pid);return p?`<span class="practice-chip23">${esc(p.name)}<button type="button" data-remove38="${p.id}">×</button></span>`:''}).join('')||'<span class="practice-chip23 empty">Пока ничего не выбрано</span>';sel.innerHTML='<option value="">Выбрать практику…</option>'+allPractices().sort((a,z)=>a.name.localeCompare(z.name,'ru')).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')};sync();
    document.querySelector('#addPractice38').onclick=()=>{if(sel.value){selected.add(sel.value);sync()}};chips.onclick=e=>{const x=e.target.closest('[data-remove38]');if(x){selected.delete(x.dataset.remove38);sync()}};
    document.querySelector('#buffForm38').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=b||{id:uid()},effects={};['inspiration','calm','energy','recognition'].forEach(k=>{const n=Math.max(-20,Math.min(20,Math.round(Number(f.get('resource_'+k))||0)));if(n)effects[k]=n});Object.assign(target,{title:String(f.get('title')||'').trim(),description:String(f.get('description')||''),mode:f.get('mode')||'all',conditionKind:f.get('conditionKind')||'daysPerWeek',requiredDays:Math.max(1,Math.min(7,Number(f.get('requiredDays'))||1)),windowDays:Math.max(1,Math.min(365,Number(f.get('windowDays'))||1)),practiceIds:[...selected],resourceEffects:effects,rewardGold:Math.max(0,Math.round(Number(f.get('rewardGold'))||0)),rewardDiamonds:Math.max(0,Math.round(Number(f.get('rewardDiamonds'))||0)),imageData});if(!b)state.buffDefinitions.push(target);save();document.querySelector('#modal').close();render()};
    document.querySelector('#deleteBuff38')?.addEventListener('click',()=>{if(confirm('Удалить баф?')){state.buffDefinitions=state.buffDefinitions.filter(x=>x.id!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  function correctActiveBuffBlock38(html){
    const active=(state.buffDefinitions||[]).filter(b=>buffActive38(b,selectedDate));
    const block=`<article class="v2-card v2-span-12 active-buffs27"><div class="v2-row"><div><div class="v2-kicker">Действующие бафы</div><h3 class="v2-title">Что сейчас помогает</h3></div><button class="icon-button23" data-go="buffs">✦</button></div><div class="active-buffs-grid27">${active.map(b=>`<button data-go="buffs">${b.imageData?`<span class="active-buff-thumb27"><img src="${b.imageData}" alt=""></span>`:'<span class="active-buff-thumb27">✦</span>'}<span><b>${esc(b.title)}</b><small>${esc(ruleText38(b))}</small></span></button>`).join('')||'<div class="v2-sub">Сейчас ни один баф не активен.</div>'}</div></article>`;
    return html.replace(/<article class="v2-card v2-span-12 active-buffs27">[\s\S]*?<\/article>/,block);
  }

  const todayBefore38=todayView;
  todayView=function(){return correctActiveBuffBlock38(todayBefore38())};

  const bindBefore38=bind;
  bind=function(){
    bindBefore38();
    document.querySelector('#addBuff38')?.addEventListener('click',()=>editBuff38());
    document.querySelectorAll('[data-edit-buff38]').forEach(x=>x.onclick=()=>editBuff38(x.dataset.editBuff38));
  };

  // v26 still owns a legacy reward settler. During every render, neutralise N-days rules there,
  // then award them once per week with the explicit rule above.
  const renderBefore38=render;
  render=function(){
    let changed=false;(state.buffDefinitions||[]).filter(b=>b.conditionKind==='daysPerWeek').forEach(b=>{if(weeklyReward38(b,localDate38()))changed=true});if(changed)save();
    const held=[];(state.buffDefinitions||[]).filter(b=>b.conditionKind==='daysPerWeek').forEach(b=>{held.push([b,b.rewardGold,b.rewardDiamonds,b.practiceIds]);b.rewardGold=0;b.rewardDiamonds=0;if(!buffActive38(b,selectedDate))b.practiceIds=[]});
    const out=renderBefore38();held.forEach(([b,g,d,ids])=>{b.rewardGold=g;b.rewardDiamonds=d;b.practiceIds=ids});return out;
  };

  let changed=migrateRules38();if(revokeBadCurrentWeekClaims38())changed=true;if(changed)save();
  render();
})();
