// RPG Life v22 — usability pass without changing core philosophy
(function(){
  const resourceMeta22={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  const branchNames22=()=>typeof practiceBranches!=='undefined'?practiceBranches:(typeof branchMeta!=='undefined'?branchMeta:{});
  const parse22=d=>new Date(d+'T12:00:00');
  const age22=(date,start)=>Math.floor((parse22(date)-parse22(start))/86400000);
  const signed22=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  const pct22=(a,b)=>b?Math.max(0,Math.min(100,Number(a||0)/Number(b)*100)):0;
  const rankLabel22=r=>({gray:'Серый',green:'Зелёный',blue:'Синий',purple:'Фиолетовый',gold:'Золотой',epic:'Фиолетовый'})[r]||r||'Без ранга';
  const coin22=()=>'<span class="currency-icon coin-icon" aria-hidden="true">G</span>';
  const gem22=()=>'<span class="currency-icon diamond-icon" aria-hidden="true">D</span>';

  state.buffDefinitions=state.buffDefinitions||[];
  state.buffClaims=state.buffClaims||[];
  state.wallet=state.wallet||{gold:0,diamonds:0};
  (state.buffDefinitions||[]).forEach(b=>{b.practiceIds=b.practiceIds||[];b.resourceEffects=b.resourceEffects||{};b.imageData=b.imageData||''});
  save();

  function buffActive22(b,date){
    if(b.mode==='manual')return (state.states||[]).some(s=>s.type==='buff'&&(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));
    const ids=b.practiceIds||[];if(!ids.length)return false;
    const days=Math.max(1,Number(b.windowDays||1));
    const hit=id=>(state.practiceLogs||[]).some(l=>l.practiceId===id&&l.date<=date&&age22(date,l.date)>=0&&age22(date,l.date)<days);
    return b.mode==='any'?ids.some(hit):ids.every(hit);
  }
  function buffEffectText22(b){
    const bits=[];
    Object.entries(resourceMeta22).forEach(([k,m])=>{const n=Number(b.resourceEffects?.[k]||0);if(n)bits.push(`${m.name} ${n>0?'+':''}${n}`)});
    if(Number(b.rewardGold||0))bits.push(`${Number(b.rewardGold)} золота`);
    if(Number(b.rewardDiamonds||0))bits.push(`${Number(b.rewardDiamonds)} алм.`);
    return bits.join(' · ')||'без численного эффекта';
  }
  function conditionText22(b){
    if(b.mode==='manual')return 'Ручная активация';
    const names=(b.practiceIds||[]).map(id=>state.practices.find(p=>p.id===id)?.name).filter(Boolean);
    return `${b.mode==='any'?'Любая':'Все'}: ${names.join(', ')||'практики не выбраны'} · ${Math.max(1,Number(b.windowDays||1))} дн.`;
  }
  function buffThumb22(b){return `<div class="buff-thumb22">${b.imageData?`<img src="${b.imageData}" alt="">`:'✦'}</div>`}
  function localDate22(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function rewardManual22(b,date){
    const key=`${b.id}:${date}`;if(state.buffClaims.some(x=>x.key===key))return;
    const gold=Math.max(0,Number(b.rewardGold||0)),diamonds=Math.max(0,Number(b.rewardDiamonds||0));
    state.wallet.gold=Number(state.wallet.gold||0)+gold;state.wallet.diamonds=Number(state.wallet.diamonds||0)+diamonds;
    state.buffClaims.push({id:uid(),key,buffId:b.id,date,gold,diamonds});
  }

  function buffsView22(){
    const cards=(state.buffDefinitions||[]).map(b=>{
      const active=buffActive22(b,selectedDate);
      return `<article class="buff-card22 ${active?'active':''}">${buffThumb22(b)}<div class="buff-card-main22"><div class="buff-card-head22"><div><span class="buff-status22">${active?'✦ Активен':'○ Не активен'}</span><h3>${esc(b.title)}</h3></div><div class="buff-card-actions22">${b.mode==='manual'?`<button class="${active?'ghost':'primary'}" data-toggle-buff22="${b.id}">${active?'Снять':'Активировать'}</button>`:''}<button class="soft" data-edit-buff22="${b.id}" aria-label="Редактировать">⚙</button></div></div>${b.description?`<p>${esc(b.description)}</p>`:''}<div class="buff-rule22">${esc(conditionText22(b))}</div><div class="buff-effect22">${esc(buffEffectText22(b))}</div></div></article>`;
    }).join('');
    return `<div class="v2-wrap"><div class="v2-row"><div><div class="v2-kicker">Конструктор</div><h1 class="v2-title">Бафы</h1><div class="v2-sub">Собирай комплексные состояния из уже созданных практик — без простыни всех галочек.</div></div><button class="primary" id="addBuff22">＋ Баф</button></div><div class="buff-page-grid22">${cards||'<div class="v2-card">Пока бафов нет.</div>'}</div></div>`;
  }

  function practiceGroup22(p){
    const keys=Object.keys(p.branches||{}).filter(k=>Number(p.branches[k]||0)>0);
    if(!keys.length)return 'other';
    return keys.sort((a,b)=>Number(p.branches[b]||0)-Number(p.branches[a]||0))[0];
  }
  function practicePickerOptions22(selected){
    const meta=branchNames22(),groups={};
    (state.practices||[]).filter(p=>!selected.has(p.id)).forEach(p=>{const k=practiceGroup22(p);(groups[k] ||= []).push(p)});
    const ordered=Object.entries(groups).sort(([a],[b])=>(meta[a]?.name||a).localeCompare(meta[b]?.name||b,'ru'));
    return `<option value="">Выбрать практику…</option>${ordered.map(([k,ps])=>`<optgroup label="${esc(meta[k]?.name||'Другое')}">${ps.sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`).join('')}`;
  }
  function selectedChips22(ids){
    const rows=ids.map(id=>state.practices.find(p=>p.id===id)).filter(Boolean);
    return rows.length?rows.map(p=>`<span class="practice-chip22" data-chip22="${p.id}">${esc(p.name)} <button type="button" data-remove-practice22="${p.id}" aria-label="Убрать">×</button></span>`).join(''):'<span class="practice-chip22 empty">Пока ничего не выбрано</span>';
  }
  function resizeImage22(file){
    return new Promise((resolve,reject)=>{if(!file||file.type!=='image/png')return reject(new Error('Нужен PNG'));const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=160,scale=Math.min(1,max/img.width,max/img.height),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/png'))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)});
  }
  function buffForm22(b={}){
    const fx=b.resourceEffects||{},mode=b.mode||'all';
    return `<div class="modal-head"><div><div class="v2-kicker">Конструктор бафа</div><h2>${b.id?'Изменить':'Новый баф'}</h2></div><button class="close">×</button></div><form id="buffForm22">
      <label>Название<input name="title" required value="${esc(b.title||'')}"></label>
      <label>Описание<textarea name="description">${esc(b.description||'')}</textarea></label>
      <div class="buff-image-editor22"><div id="buffImagePreview22">${buffThumb22(b)}</div><div class="buff-image-actions22"><label class="soft">PNG<input id="buffImageInput22" type="file" accept="image/png"></label>${b.imageData?'<button type="button" class="ghost" id="removeBuffImage22">Убрать картинку</button>':''}<small>Маленький портрет бафа — как у босса.</small></div></div>
      <section class="buff-editor-section22"><header><div><h3>Когда срабатывает</h3><small>Выбери принцип и нужные практики.</small></div></header>
        <div class="buff-mode-switch"><label><input type="radio" name="mode" value="all" ${mode==='all'?'checked':''}><span>Все практики</span></label><label><input type="radio" name="mode" value="any" ${mode==='any'?'checked':''}><span>Любая практика</span></label><label><input type="radio" name="mode" value="manual" ${mode==='manual'?'checked':''}><span>Вручную</span></label></div>
        <label>Окно условия, дней<input name="windowDays" type="number" min="1" max="365" value="${Math.max(1,Number(b.windowDays||1))}"></label>
        <div id="selectedPractices22" class="selected-practices22"></div>
        <div class="practice-picker22"><select id="practiceSelect22"></select><button type="button" class="soft" id="addPracticeToBuff22">＋ Добавить</button></div>
      </section>
      <section class="buff-editor-section22"><header><div><h3>Что даёт</h3><small>Эффекты складываются с другими активными влияниями.</small></div></header>${Object.entries(resourceMeta22).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input name="resource_${k}" type="number" min="-20" max="20" value="${Number(fx[k]||0)}"></div>`).join('')}</section>
      <section class="buff-editor-section22"><header><div><h3>Награда</h3><small>Можно оставить нули.</small></div></header><div class="form-grid"><label>${coin22()} Золото<input name="rewardGold" type="number" min="0" value="${Number(b.rewardGold||0)}"></label><label>${gem22()} Алмазы<input name="rewardDiamonds" type="number" min="0" value="${Number(b.rewardDiamonds||0)}"></label></div></section>
      <div class="modal-actions">${b.id?'<button type="button" class="danger-soft" id="deleteBuff22">Удалить</button>':''}<button class="primary">Сохранить</button></div>
    </form>`;
  }
  function openBuff22(id=null){
    const b=id?state.buffDefinitions.find(x=>x.id===id):null,selected=new Set(b?.practiceIds||[]);let imageData=b?.imageData||'';
    openModal(buffForm22(b||{}));
    const chips=document.querySelector('#selectedPractices22'),select=document.querySelector('#practiceSelect22');
    const syncPicker=()=>{chips.innerHTML=selectedChips22([...selected]);select.innerHTML=practicePickerOptions22(selected)};syncPicker();
    document.querySelector('#addPracticeToBuff22').onclick=()=>{if(select.value){selected.add(select.value);syncPicker()}};
    chips.onclick=e=>{const x=e.target.closest('[data-remove-practice22]');if(x){selected.delete(x.dataset.removePractice22);syncPicker()}};
    document.querySelector('#buffImageInput22')?.addEventListener('change',async e=>{try{imageData=await resizeImage22(e.target.files[0]);document.querySelector('#buffImagePreview22').innerHTML=`<div class="buff-thumb22"><img src="${imageData}" alt=""></div>`}catch{toast('Нужен PNG')}});
    document.querySelector('#removeBuffImage22')?.addEventListener('click',()=>{imageData='';document.querySelector('#buffImagePreview22').innerHTML='<div class="buff-thumb22">✦</div>'});
    document.querySelector('#buffForm22').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=b||{id:uid()},fx={};Object.keys(resourceMeta22).forEach(k=>{const n=signed22(f.get('resource_'+k));if(n)fx[k]=n});Object.assign(target,{title:String(f.get('title')||'').trim(),description:f.get('description')||'',imageData,mode:f.get('mode')||'all',windowDays:Math.max(1,Math.min(365,Number(f.get('windowDays'))||1)),practiceIds:[...selected],resourceEffects:fx,rewardGold:Math.max(0,Math.round(Number(f.get('rewardGold'))||0)),rewardDiamonds:Math.max(0,Math.round(Number(f.get('rewardDiamonds'))||0))});if(!b)state.buffDefinitions.push(target);save();document.querySelector('#modal').close();render()};
    document.querySelector('#deleteBuff22')?.addEventListener('click',()=>{if(confirm('Удалить баф?')){state.buffDefinitions=state.buffDefinitions.filter(x=>x.id!==b.id);state.states=(state.states||[]).filter(s=>s.buffId!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  /* Resources: practice effects + active editable buffs, baseline zero. */
  function practiceEffects22(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0};
    (state.practices||[]).forEach(p=>{
      const days=Math.max(1,Number(p.resourceEffectDays||1));
      const hit=(state.practiceLogs||[]).some(l=>l.practiceId===p.id&&l.date<=date&&age22(date,l.date)>=0&&age22(date,l.date)<days);
      if(!hit)return;Object.keys(out).forEach(k=>out[k]+=Number(p.resourceEffects?.[k]||0));
    });
    return out;
  }
  function buffEffects22(date){const out={inspiration:0,calm:0,energy:0,recognition:0};(state.buffDefinitions||[]).filter(b=>buffActive22(b,date)).forEach(b=>Object.keys(out).forEach(k=>out[k]+=Number(b.resourceEffects?.[k]||0)));return out}
  function resourceCard22(date){
    const p=practiceEffects22(date),b=buffEffects22(date);
    return `<article class="v2-card v2-span-12 resources-card signed-resources"><div class="v2-row"><div><div class="v2-kicker">Ресурсы</div><h3 class="v2-title">Состояние сейчас</h3></div><small class="v2-sub">сумма действующих эффектов</small></div><div class="resource-grid resource-grid-v7">${Object.entries(resourceMeta22).map(([k,m])=>{const v=signed22(p[k]+b[k]),left=((v+20)/40)*100;return `<div class="resource-item resource-${k}"><div class="resource-line"><span>${m.icon} ${m.name}</span><b class="resource-number">${v>0?'+':''}${v}</b></div><div class="signed-bar"><span class="zero-mark"></span><i class="resource-dot" style="left:${left}%"></i></div><small>−20 <em>0</em> +20</small>${p[k]||b[k]?`<div class="resource-delta">${p[k]?`практики ${p[k]>0?'+':''}${p[k]}`:''}${p[k]&&b[k]?' · ':''}${b[k]?`бафы ${b[k]>0?'+':''}${b[k]}`:''}</div>`:''}</div>`}).join('')}</div></article>`;
  }
  function activeBuffShowcase22(date){
    const active=(state.buffDefinitions||[]).filter(b=>buffActive22(b,date));if(!active.length)return'';
    return `<article class="v2-card v2-span-12"><div class="v2-kicker">Активные бафы</div><div class="active-buff-showcase22">${active.map(b=>`<div class="active-buff-mini22">${buffThumb22(b)}<div><b>${esc(b.title)}</b><small>${esc(buffEffectText22(b))}</small></div></div>`).join('')}</div></article>`;
  }
  const todayBefore22=todayView;
  todayView=function(){let html=todayBefore22();html=html.replace(/<article class="v2-card v2-span-12 resources-card[\s\S]*?<\/article>/,resourceCard22(selectedDate));html=html.replace(/<article class="v2-card v2-span-12 buff-compendium-card">[\s\S]*?<\/article>/,'');const showcase=activeBuffShowcase22(selectedDate);if(showcase&&html.includes('</section></div>'))html=html.replace('</section></div>',showcase+'</section></div>');return html};

  /* Arena: compact cards, collapsible checklists, progress editing on demand. */
  function bossPortrait22(b){return b.imageData?`<img class="boss-portrait" src="${b.imageData}" alt="">`:'<div class="boss-portrait boss-portrait-empty">⚔</div>'}
  function numeric22(b){if(!(b.stages||[]).length)return'';return `<div class="boss-section"><div class="v2-kicker">Численный прогресс</div>${b.stages.map(s=>{const done=Number(s.done||0),total=s.total===null?null:Number(s.total||0);return `<div class="boss-progress-row22"><div class="boss-progress-head22"><b>${esc(s.name)}</b><button class="progress-edit22" data-stage-edit22="${b.id}:${s.id}">${done.toLocaleString('ru-RU')}${total===null?'':` / ${total.toLocaleString('ru-RU')}`}</button></div>${total!==null?`<div class="bar"><i style="width:${pct22(done,total)}%"></i></div>`:''}</div>`}).join('')}</div>`}
  function collapseChecks22(title,arr,attr,b,open=false){if(!(arr||[]).length)return'';const done=arr.filter(x=>x.done).length;return `<details class="boss-collapse22" ${open?'open':''}><summary>${title}<span>${done}/${arr.length} ▾</span></summary><div class="microtask-list">${arr.map(x=>`<label><input type="checkbox" ${attr}="${b.id}:${x.id}" ${x.done?'checked':''} ${b.victoryConfirmed?'disabled':''}><span>${esc(x.label)}</span></label>`).join('')}</div></details>`}
  function victoryReady22(b){const stages=(b.stages||[]).every(s=>s.total===null||Number(s.done||0)>=Number(s.total||0)),micro=!(b.microtasks||[]).length||(b.microtasks||[]).every(x=>x.done),fin=!(b.final||[]).length||(b.final||[]).every(x=>x.done),work=(b.stages||[]).length||(b.microtasks||[]).length||(b.final||[]).length;return !!work&&stages&&micro&&fin&&!b.victoryConfirmed}
  function bossCard22(b){
    const rank=b.rank==='epic'?'purple':b.rank,ready=victoryReady22(b),rew=[];if(Number(b.rewardGold||0))rew.push(`${coin22()} ${Number(b.rewardGold)}`);if(Number(b.rewardDiamonds||0))rew.push(`${gem22()} ${Number(b.rewardDiamonds)}`);
    return `<article class="v2-card boss-card boss-card22 ${rank||''}"><div class="boss-title-line">${bossPortrait22(b)}<div class="boss-title-copy"><div class="v2-kicker">${rankLabel22(rank)} босс${Number(b.run||1)>1?` · Пришествие ${Number(b.run)}`:''}</div><h2 class="v2-title">${esc(b.title)}</h2>${b.note?`<div class="v2-sub">${esc(b.note)}</div>`:''}</div><div class="boss-actions"><button class="soft" data-edit-v12="${b.id}">⚙</button></div></div><div class="boss-meta">${b.deadline?`<span>Дедлайн ${fmt(b.deadline)}</span>`:''}<span>${ready?'Всё готово к победе':'Активен'}</span>${rew.length?`<span>${rew.join(' · ')}</span>`:''}</div>${numeric22(b)}${collapseChecks22('Микрозадачи',b.microtasks,'data-micro-v12',b)}${collapseChecks22('Фаталити',b.final,'data-final-v12',b)}${b.victoryOutcome?`<details class="boss-collapse22 boss-outcome-collapse22"><summary>После победы <span>▾</span></summary><p>${esc(b.victoryOutcome)}</p></details>`:''}${b.goldenPrize?`<div class="golden-prize"><div class="v2-kicker">Золотой приз</div><b>★ ${esc(b.goldenPrize)}</b></div>`:''}${ready?`<button class="boss-victory-button" data-win-v12="${b.id}"><span>✦</span><b>ПОБЕДА!</b><small>Получить награду</small></button>`:'<div class="victory-locked"><small>Победа откроется, когда обязательная работа будет закрыта.</small></div>'}</article>`;
  }
  function defeatedRow22(b){return `<div class="defeated-boss-row22">${bossPortrait22(b)}<div><b>${esc(b.title)}</b><small>${b.victoryDate?`Победа ${fmt(b.victoryDate)}`:'Побеждён'} · ${rankLabel22(b.rank==='epic'?'purple':b.rank)}</small></div><button class="second-coming" data-second-coming="${b.id}">↻ ${Number(b.run||1)+1}</button></div>`}
  battlesView=function(){const active=(state.bosses||[]).filter(b=>!b.victoryConfirmed),dead=(state.bosses||[]).filter(b=>b.victoryConfirmed);return `<div class="v2-wrap"><div class="v2-row battles-title-row"><div><div class="v2-kicker">Арена</div><h1 class="v2-title">Боссы</h1></div><button class="primary" id="addBossV12">＋ Босс</button></div>${active.length?`<div class="arena-active-grid22">${active.map(b=>bossCard22(b)).join('')}</div>`:'<div class="v2-card empty-v2">Активных боссов сейчас нет.</div>'}${dead.length?`<div class="arena-section-head22"><div><div class="v2-kicker">История побед</div><h2>Побеждённые</h2></div><span>${dead.length}</span></div><div class="arena-defeated22">${dead.map(defeatedRow22).join('')}</div>`:''}</div>`};
  bossHTML=bossCard22;

  function editStage22(token){const [bid,sid]=token.split(':'),b=state.bosses.find(x=>x.id===bid),s=b?.stages?.find(x=>x.id===sid);if(!s)return;openModal(`<div class="modal-head"><div><div class="v2-kicker">Прогресс босса</div><h2>${esc(s.name)}</h2></div><button class="close">×</button></div><form id="stageEditForm22"><label>Сколько сделано<input name="done" type="number" min="0" ${s.total!==null?`max="${Number(s.total)}"`:''} value="${Number(s.done||0)}"></label>${s.total!==null?`<small>Всего: ${Number(s.total).toLocaleString('ru-RU')}</small>`:'<small>Итоговый объём пока неизвестен.</small>'}<div class="modal-actions"><button class="primary">Сохранить</button></div></form>`);document.querySelector('#stageEditForm22').onsubmit=e=>{e.preventDefault();const n=Math.max(0,Number(new FormData(e.currentTarget).get('done'))||0);s.done=s.total===null?n:Math.min(Number(s.total),n);save();document.querySelector('#modal').close();render()}}

  /* Rebuild final render so Buffs and the new Arena are first-class pages. */
  const bindBefore22=bind;
  bind=function(){
    bindBefore22();
    document.querySelector('#addBuff22')?.addEventListener('click',()=>openBuff22());
    document.querySelectorAll('[data-edit-buff22]').forEach(x=>x.onclick=()=>openBuff22(x.dataset.editBuff22));
    document.querySelectorAll('[data-toggle-buff22]').forEach(x=>x.onclick=()=>{const b=state.buffDefinitions.find(z=>z.id===x.dataset.toggleBuff22);if(!b)return;const active=buffActive22(b,selectedDate);if(active){state.states=(state.states||[]).filter(s=>!(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()))}else{state.states=state.states||[];state.states.push({id:uid(),type:'buff',buffId:b.id,title:b.title,note:b.description||''});rewardManual22(b,localDate22())}save();render()});
    document.querySelectorAll('[data-stage-edit22]').forEach(x=>x.onclick=()=>editStage22(x.dataset.stageEdit22));
  };
  render=function(){document.querySelectorAll('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));document.querySelector('#app').innerHTML=({today:todayView,branches:branchesView,battles:battlesView,buffs:buffsView22,rewards:rewardsView,memory:memoryView,year:yearView}[view]||todayView)();bind()};
  render();
})();
