// RPG Life v5 — bosses, automatic infrastructure buffs, usage-driven patch
(function(){
  const ensurePractice=(p)=>{ if(!state.practices.some(x=>x.id===p.id)) state.practices.push(p); };
  ensurePractice({id:'kitchen-morning',name:'Уборка кухни утром',branches:{infrastructure:20},rhythm:{type:'daily'},metrics:[],variants:[]});
  ensurePractice({id:'clothes-week',name:'Одежда на неделю',branches:{infrastructure:35},rhythm:{type:'timesWeek',value:1},metrics:[],variants:[{name:'Выстирана',kcal:0},{name:'Поглажена',kcal:0},{name:'Развешена',kcal:0}]});
  ensurePractice({id:'meal-prep',name:'Заготовка обедов',branches:{infrastructure:35},rhythm:{type:'soft'},metrics:['Дней запаса'],variants:[]});

  if(!state.bosses.some(b=>b.id==='newspaper-processing-program')){
    state.bosses.push({
      id:'newspaper-processing-program',
      title:'Программа по обработке газет',
      rank:'purple',
      status:'defeated_pending_fatality',
      deadline:null,
      targetDate:null,
      price:0,
      stages:[],
      final:[
        {id:'fatality',label:'Фаталити',done:false},
        {id:'polish',label:'Причесать оставшееся',done:false}
      ],
      reward:'',
      note:'Основная часть босса повержена. Остались финальные действия.'
    });
  }
  save();

  const parseDate=d=>new Date(d+'T12:00:00');
  const dayDiff=(a,b)=>Math.round((parseDate(a)-parseDate(b))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;
  const practiceById=id=>state.practices.find(p=>p.id===id);

  function autoBuffs(date){
    const buffs=[];
    const logs=(state.practiceLogs||[]).filter(l=>l.date<=date);
    if(logs.some(l=>l.date===date&&l.practiceId==='kitchen-morning')){
      buffs.push({title:'Чистый старт',note:'Кухня убрана утром — бытовое сопротивление снято.'});
    }
    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&dayDiff(date,l.date)>=0&&dayDiff(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){
      const opts=new Set(clothes.options||[]);
      if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x))) buffs.push({title:'Спокойная неделя',note:'Одежда на неделю полностью подготовлена.'});
    }
    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&dayDiff(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){
      const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0));
      const age=dayDiff(date,prep.date);
      if(days>0&&age<days) buffs.push({title:'Кладовая полна, милорд',note:`Обеды заготовлены ещё примерно на ${Math.max(1,days-age)} дн.`});
    }
    return buffs;
  }

  function statesTopV5(){
    const auto=autoBuffs(selectedDate);
    const manual=(state.states||[]).filter(s=>s.title!=='Чистая полоса');
    const all=[...auto.map(x=>({...x,type:'buff',auto:true})),...manual];
    return `<article class="v2-card v2-span-12 states-top"><div class="v2-row"><div><div class="v2-kicker">Состояние персонажа</div><h3 class="v2-title">Бафы и дебафы</h3></div><button class="ghost" id="addState">＋ состояние</button></div><div class="state-stack state-stack-top">${all.map(s=>`<div class="state-chip ${s.type||'buff'} ${s.auto?'auto-buff':''}"><b>${s.type==='debuff'?'⚠':'✦'} ${esc(s.title)}</b><small>${esc(s.note||'')}${s.auto?' · автоматически':''}</small></div>`).join('')||'<div class="empty-v2">Сейчас ничего активного.</div>'}</div></article>`;
  }

  function bossRankLabel(rank){return ({gray:'Серый',green:'Зелёный',blue:'Синий',purple:'Фиолетовый',gold:'Золотой',epic:'Фиолетовый'})[rank]||rank||'Без ранга'}
  function bossStatusLabel(b){
    if(b.status==='defeated_pending_fatality') return '☠ HP снято · ждёт фаталити';
    if(b.status==='defeated') return '🏆 побеждён';
    return b.deadline?`⚔ ${bossThreat(b)}`:'⚔ активен';
  }
  function stageText(s){
    if(s.kind==='unknown') return `<div class="unknown"><b>🌫 ${esc(s.name)}</b><div class="v2-sub">Объём пока неизвестен · сделано ${Number(s.done||0).toLocaleString('ru-RU')} ${esc(s.unit||'')}</div></div>`;
    const total=Number(s.total||0),done=Number(s.done||0);
    return `<div class="stage-line"><b>${esc(s.name)}</b><span>${done.toLocaleString('ru-RU')} / ${total.toLocaleString('ru-RU')} ${esc(s.unit||'')}</span></div><div class="bar"><i style="width:${pct(done,total)}%"></i></div>`;
  }
  bossHTML=function(b){
    const rank=b.rank==='epic'?'purple':b.rank;
    return `<article class="v2-card v2-span-12 boss-card ${rank||''}">
      <div class="boss-head"><div><div class="v2-kicker">${bossRankLabel(rank)} босс</div><h2 class="v2-title">${esc(b.title)}</h2>${b.note?`<div class="v2-sub">${esc(b.note)}</div>`:''}</div><div class="boss-actions"><span class="rank">${esc(bossRankLabel(rank))}</span><button class="soft" data-edit-boss="${b.id}">⚙</button></div></div>
      <div class="boss-meta">${b.deadline?`<span>☠ ${fmt(b.deadline)}</span>`:''}<span>${bossStatusLabel(b)}</span>${b.reward?`<span>🎁 ${esc(b.reward)}</span>`:''}</div>
      ${(b.stages||[]).map(s=>`<div class="stage">${stageText(s)}</div>`).join('')}
      ${(b.final||[]).length?`<div class="stage"><div class="v2-kicker">Фаталити</div><div class="final-list">${b.final.map(x=>`<label><input type="checkbox" data-final="${b.id}:${x.id}" ${x.done?'checked':''}> ${esc(x.label)}</label>`).join('')}</div></div>`:''}
    </article>`;
  };

  battlesView=function(){return `<div class="v2-wrap"><div class="v2-row battles-title-row"><div><div class="v2-kicker">Арена</div><h1 class="v2-title">Боссы</h1></div><button class="primary" id="addBoss">＋ Босс</button></div><div class="v2-grid">${state.bosses.map(b=>bossHTML(b)).join('')}</div></div>`};

  function bossForm(b={}){
    const stages=(b.stages||[]).map(s=>`${s.name}|${s.done??0}|${s.total??''}|${s.unit||''}${s.kind==='unknown'?'|unknown':''}`).join('\n');
    const finals=(b.final||[]).map(x=>x.label).join('; ');
    return `<div class="modal-head"><div><div class="v2-kicker">Босс</div><h2>${b.id?'Редактировать':'Добавить'}</h2></div><button class="close">×</button></div><form id="bossForm">
      <label>Название<input name="title" required value="${esc(b.title||'')}"></label>
      <div class="form-grid"><label>Ранг<select name="rank">${['gray','green','blue','purple','gold'].map(r=>`<option value="${r}" ${(b.rank==='epic'?'purple':b.rank)===r?'selected':''}>${bossRankLabel(r)}</option>`).join('')}</select></label><label>Статус<select name="status"><option value="active" ${!b.status||b.status==='active'?'selected':''}>Активен</option><option value="defeated_pending_fatality" ${b.status==='defeated_pending_fatality'?'selected':''}>HP снято, ждёт фаталити</option><option value="defeated" ${b.status==='defeated'?'selected':''}>Побеждён</option></select></label></div>
      <label>Дедлайн<input name="deadline" type="date" value="${b.deadline||''}"></label>
      <label>Награда<input name="reward" value="${esc(b.reward||'')}"></label>
      <label>Этапы <small>строка: название | сделано | всего | единица. Для неизвестного объёма добавь | unknown</small><textarea name="stages">${esc(stages)}</textarea></label>
      <label>Фаталити <small>задачи через ;</small><textarea name="finals">${esc(finals)}</textarea></label>
      <label>Заметка<textarea name="note">${esc(b.note||'')}</textarea></label>
      <div class="modal-actions"><button class="primary">Сохранить</button>${b.id?`<button type="button" class="danger-soft" id="deleteBoss">Удалить босса</button>`:''}</div>
    </form>`;
  }
  function editBoss(id=null){
    const b=id?state.bosses.find(x=>x.id===id):null;
    openModal(bossForm(b||{}));
    document.querySelector('#bossForm').onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.currentTarget),old=b||{id:uid()};
      const stages=String(f.get('stages')||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const [name,done,total,unit,kind]=line.split('|').map(x=>x.trim());return {id:uid(),name,done:Number(done)||0,total:kind==='unknown'||!total?null:Number(total),unit:unit||'',kind:kind==='unknown'?'unknown':'fixed'}});
      const final=String(f.get('finals')||'').split(';').map(x=>x.trim()).filter(Boolean).map((label,i)=>({id:b?.final?.[i]?.id||uid(),label,done:b?.final?.[i]?.label===label?!!b.final[i].done:false}));
      Object.assign(old,{title:f.get('title'),rank:f.get('rank'),status:f.get('status'),deadline:f.get('deadline')||null,reward:f.get('reward')||'',note:f.get('note')||'',stages,final,price:Number(old.price||0)});
      if(!b)state.bosses.push(old);save();document.querySelector('#modal').close();render();
    };
    document.querySelector('#deleteBoss')?.addEventListener('click',()=>{if(confirm('Удалить босса?')){state.bosses=state.bosses.filter(x=>x.id!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  todayView=function(){return `<div class="v2-wrap"><section class="v2-grid">
    <article class="v2-card v2-span-12"><div class="v2-row"><div><div class="v2-kicker">День персонажа</div><h1 class="v2-title">${fmt(selectedDate)}</h1></div><div class="currency-bar"><div class="currency-pill gold">🪙 <b>${state.wallet.gold}</b></div><div class="currency-pill diamond">💎 <b>${state.wallet.diamonds}</b></div></div></div>${dayStrip()}</article>
    ${statesTopV5()}
    <article class="v2-card v2-span-8"><div class="v2-kicker">Быстрая фиксация</div><h2 class="v2-title">Что произошло?</h2><div class="v2-sub">Область → практика или творческая линия → конкретное событие.</div>${practiceMenus()}</article>
    <article class="v2-card v2-span-4"><div class="v2-kicker">Зафиксировано</div><h3 class="v2-title">Этот день</h3><div class="today-log">${todayLog()}</div></article>
    <article class="v2-card v2-span-12">${workSummary()}</article>
    <article class="v2-card v2-span-7"><div class="v2-kicker">Ритм</div><h3 class="v2-title">Неделя вокруг выбранного дня</h3>${rhythmCard()}</article>
    <article class="v2-card v2-span-5">${bankCard()}</article>
    <article class="v2-card v2-span-7"><div class="v2-row"><div><div class="v2-kicker">Битвы</div><h3 class="v2-title">Активные противники</h3></div><button class="soft" data-go="battles">Арена →</button></div>${state.bosses.map(b=>`<div class="arch-note"><b>${esc(b.title)}</b> · ${bossStatusLabel(b)}</div>`).join('')}</article>
  </section></div>`};

  const oldBindV5=bind;
  bind=function(){
    oldBindV5();
    document.querySelector('#addBoss')?.addEventListener('click',()=>editBoss());
    document.querySelectorAll('[data-edit-boss]').forEach(b=>b.onclick=()=>editBoss(b.dataset.editBoss));
  };
  render();
})();