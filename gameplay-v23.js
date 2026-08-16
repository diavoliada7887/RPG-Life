// RPG Life v23 — calmer Today, complete buffs, compact calendar editing
(function(){
  const resources23={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  const parse23=d=>new Date(d+'T12:00:00');
  const age23=(date,start)=>Math.floor((parse23(date)-parse23(start))/86400000);
  const signed23=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  const thumb23=b=>`<div class="buff-thumb23">${b?.imageData?`<img src="${b.imageData}" alt="">`:'✦'}</div>`;

  state.buffDefinitions=state.buffDefinitions||[];
  const seeds23=[
    {id:'buff-pantry-full',title:'Кладовая полна, милорд',description:'Еда на несколько дней уже существует. Меньше фоновых решений и меньше внезапного голодного персонажа у пустого холодильника.',mode:'all',practiceIds:['meal-prep'],windowDays:1,customRule:'mealPrepStock',resourceEffects:{calm:4},rewardGold:0,rewardDiamonds:0,imageData:''},
    {id:'buff-calm-week',title:'Спокойная неделя',description:'Одежда на ближайшие дни уже подготовлена, и одна регулярная бытовая забота временно снята с головы.',mode:'all',practiceIds:['clothes-week'],windowDays:7,customRule:'clothesWeek',resourceEffects:{calm:5},rewardGold:0,rewardDiamonds:0,imageData:''}
  ];
  seeds23.forEach(seed=>{if(!state.buffDefinitions.some(b=>b.id===seed.id||String(b.title||'').trim().toLowerCase()===seed.title.toLowerCase()))state.buffDefinitions.push(seed)});
  save();

  function buffActive23(b,date){
    if(b.customRule==='mealPrepStock'){
      const pid=(b.practiceIds||[])[0]||'meal-prep';
      const log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date).sort((a,z)=>z.date.localeCompare(a.date))[0];
      if(!log)return false;
      const days=Math.max(0,Number(log.metrics?.['Дней запаса']||0));
      const age=age23(date,log.date);
      return days>0&&age>=0&&age<days;
    }
    if(b.customRule==='clothesWeek'){
      const pid=(b.practiceIds||[])[0]||'clothes-week';
      const logs=[...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date&&age23(date,l.date)>=0&&age23(date,l.date)<7).sort((a,z)=>z.date.localeCompare(a.date));
      const log=logs[0];if(!log)return false;
      const opts=new Set(log.options||[]);
      return ['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x));
    }
    if(b.mode==='manual')return (state.states||[]).some(s=>s.type==='buff'&&(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));
    const ids=b.practiceIds||[];if(!ids.length)return false;
    const days=Math.max(1,Number(b.windowDays||1));
    const hit=id=>(state.practiceLogs||[]).some(l=>l.practiceId===id&&l.date<=date&&age23(date,l.date)>=0&&age23(date,l.date)<days);
    return b.mode==='any'?ids.some(hit):ids.every(hit);
  }
  function effectText23(b){const bits=[];Object.entries(resources23).forEach(([k,m])=>{const n=Number(b.resourceEffects?.[k]||0);if(n)bits.push(`${m.name} ${n>0?'+':''}${n}`)});if(Number(b.rewardGold||0))bits.push(`${Number(b.rewardGold)} золота`);if(Number(b.rewardDiamonds||0))bits.push(`${Number(b.rewardDiamonds)} алм.`);return bits.join(' · ')||'без численного эффекта'}
  function condition23(b){
    if(b.customRule==='mealPrepStock')return 'Действует, пока по последней заготовке еды остаются дни запаса.';
    if(b.customRule==='clothesWeek')return 'Действует после полной подготовки одежды: выстирана, поглажена и развешена.';
    if(b.mode==='manual')return 'Ручная активация.';
    const names=(b.practiceIds||[]).map(id=>state.practices.find(p=>p.id===id)?.name).filter(Boolean);
    return `${b.mode==='any'?'Любая':'Все'}: ${names.join(', ')||'практики не выбраны'} · окно ${Math.max(1,Number(b.windowDays||1))} дн.`;
  }

  // Buff page: cards stay compact; the rule is hidden until requested.
  function buffsView23(){
    const cards=(state.buffDefinitions||[]).map(b=>{const active=buffActive23(b,selectedDate);return `<article class="buff-card23 ${active?'active':''}">${thumb23(b)}<div class="buff-main23"><div class="buff-head23"><div><span class="buff-status23">${active?'✦ Активен':'○ Не активен'}</span><h3>${esc(b.title)}</h3></div><div class="buff-actions23">${b.mode==='manual'?`<button class="${active?'ghost':'primary'}" data-toggle-buff23="${b.id}">${active?'Снять':'Активировать'}</button>`:''}<button class="icon-button23" data-edit-buff23="${b.id}" title="Изменить">⚙</button></div></div>${b.description?`<p>${esc(b.description)}</p>`:''}<details class="buff-rule-details23"><summary>Условие и эффект <span>▾</span></summary><div><small>Условие</small><p>${esc(condition23(b))}</p><small>Эффект</small><strong>${esc(effectText23(b))}</strong></div></details></div></article>`}).join('');
    return `<div class="v2-wrap"><div class="v2-row"><div><div class="v2-kicker">Конструктор</div><h1 class="v2-title">Бафы</h1></div><button class="primary" id="addBuff23">＋ Баф</button></div><div class="buff-page-grid23">${cards||'<div class="v2-card">Пока бафов нет.</div>'}</div></div>`;
  }

  // Reuse the good v22 editor by opening it through the old page controls.
  // We keep a tiny bridge: render v22 page off-screen, trigger its editor, then restore view.
  function openBuffEditor23(id){
    const old=view;view='buffs';
    const temp=document.createElement('div');temp.style.display='none';document.body.appendChild(temp);
    // v22 bind still knows data-edit-buff22/addBuff22 only when those controls exist.
    const holder=document.querySelector('#app');const current=holder.innerHTML;
    try{
      // Temporarily call the previous buffs view by switching render before v23 replaced it is impossible here,
      // so use v22 controls already generated by the current saved function if present.
      const target=document.querySelector(id?`[data-edit-buff22="${id}"]`:'#addBuff22');
      if(target){target.click();return;}
    }catch(e){}
    view=old;temp.remove();holder.innerHTML=current;
  }

  // Standalone editor compatible with v22 data.
  function group23(p){const keys=Object.keys(p.branches||{}).filter(k=>Number(p.branches[k]||0)>0);return keys.sort((a,b)=>Number(p.branches[b]||0)-Number(p.branches[a]||0))[0]||'other'}
  function optionGroups23(selected){const groups={};(state.practices||[]).filter(p=>!selected.has(p.id)).forEach(p=>(groups[group23(p)]||=[]).push(p));return `<option value="">Выбрать практику…</option>${Object.entries(groups).map(([k,ps])=>`<optgroup label="${esc(practiceBranches?.[k]?.name||branchMeta?.[k]?.name||'Другое')}">${ps.sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`).join('')}`}
  function chips23(ids){const rows=ids.map(id=>state.practices.find(p=>p.id===id)).filter(Boolean);return rows.length?rows.map(p=>`<span class="practice-chip23">${esc(p.name)}<button type="button" data-remove-practice23="${p.id}">×</button></span>`).join(''):'<span class="practice-chip23 empty">Пока ничего не выбрано</span>'}
  function resizePng23(file){return new Promise((resolve,reject)=>{if(!file||file.type!=='image/png')return reject();const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=160,s=Math.min(1,max/img.width,max/img.height),w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/png'))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)})}
  function editBuff23(id=null){
    const b=id?state.buffDefinitions.find(x=>x.id===id):null,selected=new Set(b?.practiceIds||[]);let imageData=b?.imageData||'',fx=b?.resourceEffects||{},mode=b?.mode||'all';
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Конструктор бафа</div><h2>${b?'Изменить':'Новый баф'}</h2></div><button class="close">×</button></div><form id="buffForm23"><label>Название<input name="title" required value="${esc(b?.title||'')}"></label><label>Описание<textarea name="description">${esc(b?.description||'')}</textarea></label><div class="buff-image-editor23"><div id="buffPreview23">${thumb23(b)}</div><div><label class="soft file-button23">PNG<input id="buffImage23" type="file" accept="image/png"></label>${imageData?'<button type="button" class="ghost" id="removeBuffImage23">Убрать картинку</button>':''}</div></div><section class="buff-section23"><h3>Когда срабатывает</h3><div class="buff-mode23"><label><input type="radio" name="mode" value="all" ${mode==='all'?'checked':''}><span>Все</span></label><label><input type="radio" name="mode" value="any" ${mode==='any'?'checked':''}><span>Любая</span></label><label><input type="radio" name="mode" value="manual" ${mode==='manual'?'checked':''}><span>Вручную</span></label></div><label>Окно, дней<input name="windowDays" type="number" min="1" max="365" value="${Math.max(1,Number(b?.windowDays||1))}"></label><div id="chips23" class="chips23"></div><div class="picker23"><select id="practiceSelect23"></select><button class="soft" type="button" id="addPractice23">＋ Добавить</button></div></section><section class="buff-section23"><h3>Что даёт</h3>${Object.entries(resources23).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input name="resource_${k}" type="number" min="-20" max="20" value="${Number(fx[k]||0)}"></div>`).join('')}</section><section class="buff-section23"><h3>Награда</h3><div class="form-grid"><label>Золото<input name="rewardGold" type="number" min="0" value="${Number(b?.rewardGold||0)}"></label><label>Алмазы<input name="rewardDiamonds" type="number" min="0" value="${Number(b?.rewardDiamonds||0)}"></label></div></section><div class="modal-actions">${b?'<button type="button" class="danger-soft" id="deleteBuff23">Удалить</button>':''}<button class="primary">Сохранить</button></div></form>`);
    const chips=document.querySelector('#chips23'),sel=document.querySelector('#practiceSelect23');const sync=()=>{chips.innerHTML=chips23([...selected]);sel.innerHTML=optionGroups23(selected)};sync();
    document.querySelector('#addPractice23').onclick=()=>{if(sel.value){selected.add(sel.value);sync()}};chips.onclick=e=>{const x=e.target.closest('[data-remove-practice23]');if(x){selected.delete(x.dataset.removePractice23);sync()}};
    document.querySelector('#buffImage23').onchange=async e=>{try{imageData=await resizePng23(e.target.files[0]);document.querySelector('#buffPreview23').innerHTML=`<div class="buff-thumb23"><img src="${imageData}" alt=""></div>`}catch{toast('Нужен PNG')}};
    document.querySelector('#removeBuffImage23')?.addEventListener('click',()=>{imageData='';document.querySelector('#buffPreview23').innerHTML='<div class="buff-thumb23">✦</div>'});
    document.querySelector('#buffForm23').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=b||{id:uid()},effects={};Object.keys(resources23).forEach(k=>{const n=signed23(f.get('resource_'+k));if(n)effects[k]=n});Object.assign(target,{title:String(f.get('title')||'').trim(),description:f.get('description')||'',imageData,mode:f.get('mode')||'all',windowDays:Math.max(1,Math.min(365,Number(f.get('windowDays'))||1)),practiceIds:[...selected],resourceEffects:effects,rewardGold:Math.max(0,Math.round(Number(f.get('rewardGold'))||0)),rewardDiamonds:Math.max(0,Math.round(Number(f.get('rewardDiamonds'))||0))});if(!b)state.buffDefinitions.push(target);save();document.querySelector('#modal').close();render()};
    document.querySelector('#deleteBuff23')?.addEventListener('click',()=>{if(confirm('Удалить баф?')){state.buffDefinitions=state.buffDefinitions.filter(x=>x.id!==b.id);state.states=(state.states||[]).filter(s=>s.buffId!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  function practiceEffects23(date){const out={inspiration:0,calm:0,energy:0,recognition:0};(state.practices||[]).forEach(p=>{const days=Math.max(1,Number(p.resourceEffectDays||1)),hit=(state.practiceLogs||[]).some(l=>l.practiceId===p.id&&l.date<=date&&age23(date,l.date)>=0&&age23(date,l.date)<days);if(hit)Object.keys(out).forEach(k=>out[k]+=Number(p.resourceEffects?.[k]||0))});return out}
  function buffEffects23(date){const out={inspiration:0,calm:0,energy:0,recognition:0};(state.buffDefinitions||[]).filter(b=>buffActive23(b,date)).forEach(b=>Object.keys(out).forEach(k=>out[k]+=Number(b.resourceEffects?.[k]||0)));return out}
  function stateCard23(date){
    const p=practiceEffects23(date),bf=buffEffects23(date),active=(state.buffDefinitions||[]).filter(b=>buffActive23(b,date));
    return `<article class="v2-card v2-span-12 state-now23"><div class="v2-row"><div><div class="v2-kicker">Состояние</div><h3 class="v2-title">Сейчас</h3></div><small class="v2-sub">0 — нормальная точка, не провал</small></div><div class="resource-grid23">${Object.entries(resources23).map(([k,m])=>{const v=signed23(p[k]+bf[k]),pos=((v+20)/40)*100;return `<div class="resource23 resource-${k}"><div><span>${m.icon} ${m.name}</span><b>${v>0?'+':''}${v}</b></div><div class="resource-track23"><span></span><i style="left:${pos}%"></i></div></div>`}).join('')}</div>${active.length?`<div class="active-buffs-inline23"><small>Сейчас действуют</small><div>${active.map(b=>`<button data-go-buffs23="${b.id}">${thumb23(b)}<span><b>${esc(b.title)}</b><small>${esc(effectText23(b))}</small></span></button>`).join('')}</div></div>`:''}</article>`;
  }
  function workCard23(){const bosses=(state.bosses||[]).filter(b=>!b.victoryConfirmed);return `<article class="v2-card v2-span-12 work-card23"><div class="v2-row"><div><div class="v2-kicker">Работа</div><h3 class="v2-title">Проекты и боссы</h3></div><button class="icon-button23" data-go="battles" title="Открыть Арену">⚔</button></div><div class="work-boss-strip23">${bosses.length?bosses.map(b=>`<button data-go="battles">${b.imageData?`<img src="${b.imageData}" alt="">`:'<span class="work-boss-empty23">⚔</span>'}<b>${esc(b.title)}</b></button>`).join(''):'<span class="v2-sub">Сейчас активных битв нет.</span>'}</div></article>`}
  function rhythmDetails23(){return `<article class="v2-card v2-span-7 rhythm-card23"><details><summary><div><div class="v2-kicker">Ритм</div><h3 class="v2-title">Неделя вокруг выбранного дня</h3></div><span>▾</span></summary><div class="rhythm-body23">${rhythmCard()}</div></details></article>`}

  // One calm Today page: no duplicated “active buffs/effects” cards and no separate active-enemies slab.
  todayView=function(){return `<div class="v2-wrap"><section class="v2-grid"><article class="v2-card v2-span-12"><div class="v2-row"><div><div class="v2-kicker">День персонажа</div><h1 class="v2-title">${fmt(selectedDate)}</h1></div><div class="currency-bar"><div class="currency-pill gold"><span class="currency-icon coin-icon">G</span><b>${Number(state.wallet?.gold||0)}</b></div><div class="currency-pill diamond"><span class="currency-icon diamond-icon">D</span><b>${Number(state.wallet?.diamonds||0)}</b></div></div></div>${dayStrip()}</article><article class="v2-card v2-span-8 quick-card23"><h2 class="v2-title">Быстрая фиксация</h2>${practiceMenus()}</article><article class="v2-card v2-span-4"><div class="v2-kicker">Зафиксировано</div><h3 class="v2-title">Этот день</h3><div class="today-log">${todayLog()}</div></article>${workCard23()}${stateCard23(selectedDate)}${rhythmDetails23()}<article class="v2-card v2-span-5">${bankCard()}</article></section></div>`};

  // Calendar: only one pencil on the selected day card; destructive controls live in a modal.
  function calendarEditor23(){
    const p=(state.practiceLogs||[]).filter(l=>l.date===selectedDate),c=(state.creativeLogs||[]).filter(l=>l.date===selectedDate),a=(state.achievements||[]).filter(x=>x.date===selectedDate);
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Правка дня</div><h2>${fmt(selectedDate)}</h2></div><button class="close">×</button></div><div class="calendar-edit-list23">${p.map(l=>{const pr=state.practices.find(x=>x.id===l.practiceId);return `<div><span><b>${esc(pr?.name||'Практика')}</b><small>${esc(logDetails(l))}</small></span><span><button class="icon-button23" data-cal-edit-log23="${l.id}">✎</button><button class="icon-button23 danger" data-cal-del-log23="${l.id}">×</button></span></div>`}).join('')}${c.map(l=>{const line=state.creativeLines.find(x=>x.id===l.lineId);return `<div><span><b>${esc(line?.title||'Творчество')} · ${esc(l.type||'')}</b><small>${esc(l.note||'')}</small></span><span><button class="icon-button23" data-cal-edit-creative23="${l.id}">✎</button><button class="icon-button23 danger" data-cal-del-creative23="${l.id}">×</button></span></div>`}).join('')}${a.map(x=>`<div><span><b>✦ ${esc(x.title)}</b><small>Память</small></span><span><button class="icon-button23 danger" data-cal-del-ach23="${x.id}">×</button></span></div>`).join('')||'<div class="v2-sub">В этом дне пока нечего править.</div>'}</div>`);
    document.querySelectorAll('[data-cal-edit-log23]').forEach(x=>x.onclick=()=>{document.querySelector('#modal').close();editLog(x.dataset.calEditLog23)});
    document.querySelectorAll('[data-cal-del-log23]').forEach(x=>x.onclick=()=>{document.querySelector('#modal').close();deleteLog(x.dataset.calDelLog23)});
    document.querySelectorAll('[data-cal-edit-creative23]').forEach(x=>x.onclick=()=>{const l=state.creativeLogs.find(z=>z.id===x.dataset.calEditCreative23);if(l){document.querySelector('#modal').close();selectedDate=l.date;logCreative(l.lineId,l.id)}});
    document.querySelectorAll('[data-cal-del-creative23]').forEach(x=>x.onclick=()=>{if(confirm('Удалить запись?')){state.creativeLogs=state.creativeLogs.filter(z=>z.id!==x.dataset.calDelCreative23);save();document.querySelector('#modal').close();render()}});
    document.querySelectorAll('[data-cal-del-ach23]').forEach(x=>x.onclick=()=>{if(confirm('Удалить отметку из Памяти и календаря?')){state.achievements=state.achievements.filter(z=>z.id!==x.dataset.calDelAch23);save();document.querySelector('#modal').close();render()}});
  }
  yearView=function(){const y=new Date().getFullYear();return `<div class="v2-wrap"><h1 class="v2-title">Карта года · ${y}</h1><div class="months-grid">${Array.from({length:12},(_,m)=>monthHTML(y,m)).join('')}</div><div class="v2-card calendar-detail calendar-detail23"><div class="v2-row"><h3>${fmt(selectedDate)}</h3><button class="icon-button23" id="editCalendarDay23" title="Править день">✎</button></div><div class="today-log">${todayLog()}</div></div></div>`};

  const bind23=bind;
  bind=function(){
    bind23();
    document.querySelector('#addBuff23')?.addEventListener('click',()=>editBuff23());
    document.querySelectorAll('[data-edit-buff23]').forEach(x=>x.onclick=()=>editBuff23(x.dataset.editBuff23));
    document.querySelectorAll('[data-toggle-buff23]').forEach(x=>x.onclick=()=>{const b=state.buffDefinitions.find(z=>z.id===x.dataset.toggleBuff23);if(!b)return;const active=buffActive23(b,selectedDate);if(active)state.states=(state.states||[]).filter(s=>!(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));else{state.states=state.states||[];state.states.push({id:uid(),type:'buff',buffId:b.id,title:b.title,note:b.description||''})}save();render()});
    document.querySelectorAll('[data-go-buffs23]').forEach(x=>x.onclick=()=>{view='buffs';render();setTimeout(()=>document.querySelector(`[data-edit-buff23="${x.dataset.goBuffs23}"]`)?.closest('.buff-card23')?.scrollIntoView({behavior:'smooth',block:'center'}),20)});
    document.querySelector('#editCalendarDay23')?.addEventListener('click',calendarEditor23);
  };
  render=function(){document.querySelectorAll('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));document.querySelector('#app').innerHTML=({today:todayView,branches:branchesView,battles:battlesView,buffs:buffsView23,rewards:rewardsView,memory:memoryView,year:yearView}[view]||todayView)();bind()};
  render();
})();