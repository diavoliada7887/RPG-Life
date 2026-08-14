const STORAGE_KEY = 'rpg-live-v1';
const todayISO = () => new Date().toISOString().slice(0,10);
const fmt = (d) => new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(d+'T12:00:00'));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const categoryMeta = {
  body:{name:'Тело',icon:'⚔',color:'teal'},
  creative:{name:'Творчество',icon:'✒',color:'violet'},
  work:{name:'Работа',icon:'◈',color:'gold'},
  study:{name:'Обучение',icon:'⌁',color:'blue'},
  infrastructure:{name:'Инфраструктура',icon:'⌂',color:'orange'},
  publicity:{name:'Публичность',icon:'◉',color:'green'}
};

function seed(){
  const now = new Date();
  const ago = (n)=>{const d=new Date(now);d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)};
  return {
    profile:{name:'Оксана',level:12,xp:684,title:'Архивариус собственной жизни'},
    settings:{maxActiveQuests:3,mainQuestSlots:1},
    quests:[
      {id:uid(),title:'Сайт архивного бизнеса',status:'active',role:'main',progress:54,description:'Собрать и запустить новый сайт архивного бизнеса.',condition:'Рабочая версия опубликована и основные страницы собраны.'},
      {id:uid(),title:'Патент на программу',status:'blocked',role:'support',progress:35,description:'Оформить патент на собственный программный продукт.',requirement:'Требуется предмет: готовая программа.'},
      {id:uid(),title:'Латынь',status:'found',role:'support',progress:0,description:'Квест обнаружен. Не принят. Никому ничего не должна.'},
      {id:uid(),title:'Поиск помещения',status:'background',role:'support',progress:10,description:'Фоновый квест. Пусть ищется, пока жизнь идёт дальше.'},
      {id:uid(),title:'Компьютерные сети',status:'active',role:'support',progress:18,description:'Учебный сезон: 12 недель. Один серьёзный учебный слот.'}
    ],
    activities:[
      {id:uid(),date:ago(0),category:'creative',title:'Сентир',amount:1200,unit:'слов',minutes:70},
      {id:uid(),date:ago(0),category:'infrastructure',title:'Кухонные заготовки',amount:3,unit:'часа',minutes:180,buff:{title:'Снабжение обеспечено',days:4,icon:'🍲'}},
      {id:uid(),date:ago(0),category:'body',title:'Дыхание',amount:1,unit:'сеанс',minutes:8},
      {id:uid(),date:ago(1),category:'work',title:'Работа над сайтом',amount:1,unit:'сеанс',minutes:95},
      {id:uid(),date:ago(2),category:'body',title:'Тренировка',amount:1,unit:'сеанс',minutes:35},
      {id:uid(),date:ago(4),category:'creative',title:'Письмо',amount:1030,unit:'слов',minutes:65},
      {id:uid(),date:ago(6),category:'body',title:'Тренировка',amount:1,unit:'сеанс',minutes:40},
      {id:uid(),date:ago(8),category:'creative',title:'Письмо',amount:980,unit:'слов',minutes:60},
      {id:uid(),date:ago(11),category:'body',title:'Тренировка',amount:1,unit:'сеанс',minutes:42}
    ],
    journal:[
      {id:uid(),date:ago(0),text:'Сентир движется. Устала. Но день вообще-то был плотный.'},
      {id:uid(),date:ago(5),text:'Испекла охуенный лимонный кекс. За окном север, дома пахнет специями.'},
      {id:uid(),date:ago(18),text:'Магнитогорск снова всплыл в работе — ветхие дела, особоценный фонд, много сложных страниц.'}
    ],
    states:[
      {id:uid(),type:'buff',title:'Снабжение обеспечено',icon:'🍲',until:addDaysISO(4),source:'Кухонные заготовки'},
      {id:uid(),type:'buff',title:'Творческий ход',icon:'✒',until:addDaysISO(2),source:'Несколько письменных сессий'}
    ],
    history:[
      {id:uid(),date:'2026-07-31',title:'Патент отправлен',text:'Большой этап закрыт и остаётся в истории персонажа.'},
      {id:uid(),date:'2026-08-07',title:'Вышла «Гранитная кожа»',text:'Музыкальный релиз в день рождения.'},
      {id:uid(),date:'2026-08-14',title:'Начат RPG Live',text:'Идея превратилась в первый рабочий прототип.'}
    ],
    ideas:[
      {id:uid(),title:'Латынь',note:'Когда-нибудь. Пока просто лежит красиво.'},
      {id:uid(),title:'Windows tray-клиент',note:'Быстрый ввод событий с компьютера.'},
      {id:uid(),title:'ИИ-мастер игры',note:'Не коуч. Архивариус, адвокат и хранитель длинной правды.'}
    ]
  }
}
function addDaysISO(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
let state = load();
let currentView='today';
let deferredPrompt=null;

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||seed()}catch{return seed()}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function render(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===currentView && b.closest('.bottom-nav')));
  const app=document.querySelector('#app');
  app.innerHTML = ({today:renderToday,quests:renderQuests,branches:renderBranches,memory:renderMemory,year:renderYear})[currentView]();
  bindView();
}

function activeMain(){return state.quests.find(q=>q.status==='active'&&q.role==='main')}
function todaysActivities(){return state.activities.filter(a=>a.date===todayISO())}
function activeStates(){return state.states.filter(s=>s.until>=todayISO())}
function totalMinutesToday(){return todaysActivities().reduce((s,a)=>s+(a.minutes||0),0)}
function gmVerdict(){
  const acts=todaysActivities();
  if(!acts.length) return 'Сегодня пока ничего не записано. Это не обвинение и не диагноз. День ещё просто не описан.';
  const cats=[...new Set(acts.map(a=>categoryMeta[a.category]?.name).filter(Boolean))];
  const words=acts.filter(a=>a.unit==='слов').reduce((s,a)=>s+(+a.amount||0),0);
  const hours=(totalMinutesToday()/60).toFixed(1).replace('.0','');
  let facts=`Зафиксировано ${acts.length} ${plural(acts.length,'действие','действия','действий')} в ${cats.length} ${plural(cats.length,'направлении','направлениях','направлениях')}`;
  if(words) facts+=`, ${words} слов`;
  if(totalMinutesToday()>=60) facts+=` и около ${hours} ч вложенного времени`;
  return `Возражение. ${facts}. Обвинение «я сегодня нихуя не сделала» отклонено.`;
}
function plural(n,a,b,c){const x=n%10,y=n%100;return x===1&&y!==11?a:(x>=2&&x<=4&&(y<12||y>14)?b:c)}

function renderToday(){
  const q=activeMain(); const acts=todaysActivities(); const states=activeStates();
  return `
  <section class="hero">
    <div class="card">
      <div class="eyebrow">Сегодня · ${fmt(todayISO())}</div>
      <h1>Прожить персонажа.<br>Не закрыть карту.</h1>
      <p>Короткий провал не имеет права переписывать длинную правду. Здесь нет стриков, красных крестов и долгов за существование идей.</p>
      <div class="quote">«Ты не обязана выполнить всю карту. Тебе надо прожить своего персонажа.»</div>
    </div>
    <div class="card character-card">
      <div class="level-orbit"><div class="level"><span>${state.profile.level}<small>уровень</small></span></div><div><div class="eyebrow">${esc(state.profile.title)}</div><h3 style="margin:6px 0 3px">${esc(state.profile.name)}</h3><div class="tiny">Опыт сохраняется. Даже после хреновой недели.</div></div></div>
      <div><div class="progress" style="margin-top:18px"><i style="width:${state.profile.xp%100}%"></i></div><div class="tiny" style="margin-top:6px">${state.profile.xp} опыта персонажа</div></div>
    </div>
  </section>

  <section class="grid">
    <article class="card quest-main span-8">
      <div class="eyebrow">Главный активный квест</div>
      ${q?`<h2>${esc(q.title)}</h2><p>${esc(q.description||'')}</p><div class="quest-meta"><span class="pill gold">◈ главный сюжет</span><span class="pill">${q.progress}% пути</span></div><div class="progress"><i style="width:${q.progress}%"></i></div><div class="tiny" style="margin-top:9px">Условие завершения: ${esc(q.condition||'задать условие завершения')}</div>`:`<div class="empty">Главный квест пока не принят.</div>`}
    </article>

    <article class="card span-4">
      <div class="section-title"><h3>Быстрый ввод</h3><small>без бухгалтерии</small></div>
      <div class="quick-grid">
        ${Object.entries(categoryMeta).map(([k,m])=>`<button class="quick" data-quick="${k}"><span>${m.icon}</span><b>${m.name}</b></button>`).join('')}
      </div>
    </article>

    <article class="card span-6">
      <div class="section-title"><h3>Состояние мира</h3><small>бафы и дебафы</small></div>
      <div class="state-list">${states.length?states.map(s=>`<div class="state"><div class="state-icon">${s.icon||'✦'}</div><div><b>${esc(s.title)}</b><small>${s.type==='debuff'?'Временное состояние. Никакого штрафа к опыту.':'Активный баф.'} До ${fmt(s.until)}${s.source?` · ${esc(s.source)}`:''}</small></div></div>`).join(''):`<div class="empty">Активных состояний нет. И это тоже нормальное состояние.</div>`}</div>
    </article>

    <article class="card gm span-6">
      <div class="gm-head"><div class="gm-avatar">И</div><div><b>Илья</b><div class="tiny">игровой мастер · архивариус · адвокат фактов</div></div></div>
      <blockquote>${esc(gmVerdict())}</blockquote>
    </article>

    <article class="card span-7">
      <div class="section-title"><h3>Что произошло сегодня</h3><small>не дневник благодарности</small></div>
      <textarea id="journalText" placeholder="Хорошее, плохое, смешное, бытовое, важное. Просто что было."></textarea>
      <div class="journal-actions"><button id="micBtn" class="ghost">🎙 Наговорить</button><button id="saveJournal" class="primary">Сохранить день</button></div>
    </article>

    <article class="card span-5">
      <div class="section-title"><h3>Зафиксировано сегодня</h3><small>${Math.round(totalMinutesToday())} мин</small></div>
      <div class="activity-list">${acts.length?acts.map(a=>activityHTML(a)).join(''):`<div class="empty">Пока пусто. Пустой список не равен пустому дню.</div>`}</div>
    </article>
  </section>`
}

function activityHTML(a){const m=categoryMeta[a.category]||{name:a.category};return `<div class="activity"><div class="left"><span class="dot"></span><div><b>${esc(a.title)}</b><small>${m.name}${a.amount?` · ${esc(String(a.amount))} ${esc(a.unit||'')}`:''}</small></div></div><small>${a.minutes?`${a.minutes} мин`:''}</small></div>`}

function renderQuests(){
  const tabs=[['active','Активные'],['found','Найдены'],['blocked','Заблокированы'],['background','Фоновые'],['completed','Завершённые']];
  const counts=Object.fromEntries(tabs.map(([s])=>[s,state.quests.filter(q=>q.status===s).length]));
  return `<section class="card"><div class="section-title"><div><div class="eyebrow">Журнал квестов</div><h2>Идея не создаёт долг</h2></div><button id="newQuestBtn" class="primary">＋ Новый квест</button></div><p class="tiny">Активных сюжетных линий: ${counts.active}/${state.settings.maxActiveQuests}. Остальные могут спокойно существовать, не требуя исполнения.</p><div class="tabs">${tabs.map(([s,l],i)=>`<button class="tab ${i===0?'active':''}" data-qtab="${s}">${l} · ${counts[s]}</button>`).join('')}</div><div id="questTabBody">${questTab('active')}</div></section>`
}
function questTab(status){const qs=state.quests.filter(q=>q.status===status);return `<div class="quest-list">${qs.length?qs.map(q=>`<article class="quest-row"><header><div><span class="pill ${q.role==='main'?'gold':''}">${q.role==='main'?'главный':'квест'}</span><h3 style="margin-top:8px">${esc(q.title)}</h3></div><span class="tiny">${q.progress||0}%</span></header><p>${esc(q.description||'')}</p>${q.requirement?`<p>🔒 ${esc(q.requirement)}</p>`:''}<div class="quest-actions">${questActions(q)}</div></article>`).join(''):`<div class="empty">Здесь пока ничего нет.</div>`}</div>`}
function questActions(q){
  if(q.status==='found') return `<button class="soft" data-quest-action="accept" data-id="${q.id}">Принять квест</button><button class="ghost" data-quest-action="idea" data-id="${q.id}">В инвентарь идей</button>`;
  if(q.status==='active') return `<button class="soft" data-quest-action="progress" data-id="${q.id}">Продвинуть</button><button class="ghost" data-quest-action="complete" data-id="${q.id}">Завершить</button><button class="ghost" data-quest-action="background" data-id="${q.id}">В фон</button>`;
  if(q.status==='blocked') return `<button class="soft" data-quest-action="unlock" data-id="${q.id}">Условие выполнено</button>`;
  if(q.status==='background') return `<button class="soft" data-quest-action="accept" data-id="${q.id}">Сделать активным</button>`;
  return '';
}

function branchStats(category){
  const acts=state.activities.filter(a=>a.category===category).sort((a,b)=>b.date.localeCompare(a.date));
  const last90=acts.filter(a=>(new Date()-new Date(a.date+'T12:00:00'))/86400000<=90);
  const distinctWeeks=new Set(last90.map(a=>weekKey(a.date))).size;
  const last=acts[0]?.date;
  const gap=last?Math.floor((new Date(todayISO()+'T12:00:00')-new Date(last+'T12:00:00'))/86400000):999;
  return {count:last90.length,weeks:distinctWeeks,last,gap,acts};
}
function weekKey(date){const d=new Date(date+'T12:00:00');const onejan=new Date(d.getFullYear(),0,1);return `${d.getFullYear()}-${Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7)}`}
function renderBranches(){
  return `<section><div class="section-title"><div><div class="eyebrow">Ветки персонажа</div><h2>Длинная правда вместо серии дней</h2></div></div><div class="grid">${Object.entries(categoryMeta).map(([k,m])=>{const s=branchStats(k);const rhythm=Math.min(8,s.weeks);return `<article class="branch-card span-6"><div class="branch-head"><div><h3>${m.icon} ${m.name}</h3><p>окно наблюдения: 90 дней</p></div><div class="metric">${s.count}</div></div><div class="rhythm">${Array.from({length:8},(_,i)=>`<i class="${i>=8-rhythm?'on':''}"></i>`).join('')}</div><p>${s.weeks?`Следы есть в ${s.weeks} ${plural(s.weeks,'неделе','неделях','неделях')} из последних 13.`:'Ветка пока собирает историю.'}</p>${s.gap>=7&&s.gap<999?`<div class="return-box"><b>Возвращение доступно.</b><br>Перерыв: ${s.gap} дней. История ветки сохранена. Сегодня достаточно одного возвращения.</div>`:''}</article>`}).join('')}</div></section>`
}

function renderMemory(){
  return `<section class="grid"><article class="card span-7"><div class="section-title"><div><div class="eyebrow">Память персонажа</div><h2>Найти то, что мозг уже списал</h2></div></div><div class="searchbar"><input id="memorySearch" placeholder="Байкал, Сентир, Магнитогорск, мама, оленина…"><button id="memoryBtn" class="primary">Найти</button></div><div id="memoryResults" style="margin-top:12px">${memoryResults('')}</div></article><article class="card span-5"><div class="section-title"><h3>История персонажа</h3><small>крупное не исчезает</small></div><div class="timeline">${[...state.history].sort((a,b)=>b.date.localeCompare(a.date)).map(h=>`<div class="timeline-item"><div class="timeline-date">${fmt(h.date)}</div><div class="timeline-body"><b>${esc(h.title)}</b><p>${esc(h.text||'')}</p></div></div>`).join('')}</div><button id="addHistoryBtn" class="ghost" style="width:100%;margin-top:8px">＋ Добавить в историю</button></article><article class="card span-12"><div class="section-title"><div><h3>Инвентарь идей</h3><small>прекрасное безумие без обязательств</small></div><button id="addIdeaBtn" class="soft">＋ Положить идею</button></div><div class="idea-list">${state.ideas.map(i=>`<div class="idea-row"><header><h3>${esc(i.title)}</h3><span class="pill muted">не принято</span></header><p>${esc(i.note||'')}</p></div>`).join('')}</div></article></section>`
}
function memoryResults(query){
  const q=query.trim().toLowerCase(); const pool=[...state.journal.map(j=>({...j,type:'Запись дня'})),...state.activities.map(a=>({...a,text:`${a.title} ${a.amount||''} ${a.unit||''}`,type:categoryMeta[a.category]?.name||'Действие'})),...state.history.map(h=>({...h,text:`${h.title} ${h.text||''}`,type:'История'}))];
  const res=pool.filter(x=>!q||(x.text||'').toLowerCase().includes(q)||(x.title||'').toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
  return res.length?res.map(x=>`<div class="memory-result"><time>${fmt(x.date)} · ${esc(x.type)}</time><p>${esc(x.text||x.title||'')}</p></div>`).join(''):`<div class="empty">Ничего не нашлось. Это честный ноль, не приговор.</div>`
}

function renderYear(){
  const year=new Date().getFullYear();
  const totals={body:0,creative:0,work:0,study:0,infrastructure:0,publicity:0}; state.activities.forEach(a=>{if(a.date.startsWith(year))totals[a.category]=(totals[a.category]||0)+1});
  return `<section class="card"><div class="section-title"><div><div class="eyebrow">Карта года · ${year}</div><h2>Не кладбище галочек</h2></div><button id="exportBtn" class="ghost">Экспорт данных</button></div><div class="year-toolbar">${Object.entries(categoryMeta).map(([k,m],i)=>`<button class="tab ${i===0?'active':''}" data-year-layer="${k}">${m.icon} ${m.name}</button>`).join('')}</div><div id="yearMap">${yearMap('body')}</div><div class="stat-cards" style="margin-top:18px">${Object.entries(categoryMeta).slice(0,4).map(([k,m])=>`<div class="stat-mini"><b>${totals[k]||0}</b><small>${m.name.toLowerCase()} · записей</small></div>`).join('')}</div><div class="quote" style="margin-top:20px">Карта показывает присутствие. Она не раскрашивает пустые дни как поражение.</div></section>`
}
function yearMap(layer){
  const year=new Date().getFullYear(); const days=[]; const counts={}; state.activities.filter(a=>a.category===layer&&a.date.startsWith(year)).forEach(a=>counts[a.date]=(counts[a.date]||0)+1);
  for(let d=new Date(year,0,1);d.getFullYear()===year;d.setDate(d.getDate()+1)){const iso=d.toISOString().slice(0,10);const n=counts[iso]||0;const lvl=n?Math.min(4,n):0;days.push(`<span class="day ${lvl?'l'+lvl:''}" title="${iso}: ${n}"></span>`)}
  return `<div class="year-grid">${days.join('')}</div><div class="year-legend"><span>тихо</span><span class="legend-box"></span><span class="legend-box" style="background:#4d6a6b"></span><span class="legend-box" style="background:#8bb8a6"></span><span>плотно</span></div>`
}

function bindView(){
  document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>openActivityModal(b.dataset.quick));
  document.querySelector('#saveJournal')?.addEventListener('click',saveJournal);
  document.querySelector('#micBtn')?.addEventListener('click',startMic);
  document.querySelector('#newQuestBtn')?.addEventListener('click',openQuestModal);
  document.querySelectorAll('[data-qtab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-qtab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector('#questTabBody').innerHTML=questTab(b.dataset.qtab);bindQuestActions()});
  bindQuestActions();
  document.querySelector('#memoryBtn')?.addEventListener('click',doSearch);document.querySelector('#memorySearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch()});
  document.querySelector('#addHistoryBtn')?.addEventListener('click',openHistoryModal);document.querySelector('#addIdeaBtn')?.addEventListener('click',openIdeaModal);
  document.querySelectorAll('[data-year-layer]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-year-layer]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector('#yearMap').innerHTML=yearMap(b.dataset.yearLayer)});
  document.querySelector('#exportBtn')?.addEventListener('click',exportData);
}
function bindQuestActions(){document.querySelectorAll('[data-quest-action]').forEach(b=>b.onclick=()=>questAction(b.dataset.questAction,b.dataset.id))}
function doSearch(){document.querySelector('#memoryResults').innerHTML=memoryResults(document.querySelector('#memorySearch').value)}

function openModal(html){const m=document.querySelector('#modal');m.innerHTML=`<div class="modal-inner">${html}</div>`;m.showModal();m.querySelector('.close')?.addEventListener('click',()=>m.close())}
function openActivityModal(category){const m=categoryMeta[category];openModal(`<div class="modal-head"><div><div class="eyebrow">${m.icon} ${m.name}</div><h2>Зафиксировать действие</h2></div><button class="close">×</button></div><form id="activityForm"><input type="hidden" name="category" value="${category}"><div class="form-row"><label>Что произошло</label><input name="title" required placeholder="Например: тренировка, 1200 слов, заготовки еды"></div><div class="form-grid"><div class="form-row"><label>Количество</label><input name="amount" type="number" step="0.1" placeholder="1"></div><div class="form-row"><label>Единица</label><input name="unit" placeholder="сеанс / слов / часа"></div></div><div class="form-row"><label>Время, минут</label><input name="minutes" type="number" min="0" placeholder="30"></div>${category==='infrastructure'||category==='publicity'?`<div class="form-row"><label>Бафф, который это создаёт</label><input name="buffTitle" placeholder="Снабжение обеспечено"><input name="buffDays" type="number" min="1" max="30" placeholder="На сколько дней" style="margin-top:8px"></div>`:''}<div class="modal-actions"><button type="button" class="ghost close2">Отмена</button><button class="primary">Зафиксировать</button></div></form>`);const form=document.querySelector('#activityForm');form.querySelector('.close2').onclick=()=>document.querySelector('#modal').close();form.onsubmit=e=>{e.preventDefault();const f=new FormData(form);const a={id:uid(),date:todayISO(),category,title:f.get('title'),amount:f.get('amount')||'',unit:f.get('unit')||'',minutes:+f.get('minutes')||0};state.activities.unshift(a);if(f.get('buffTitle')){const days=+f.get('buffDays')||1;state.states.push({id:uid(),type:'buff',title:f.get('buffTitle'),icon:'✦',until:addDaysISO(days),source:f.get('title')})}state.profile.xp+=10;save();document.querySelector('#modal').close();render();toast('Записано. Опыт сохранён.')};}
function saveJournal(){const t=document.querySelector('#journalText').value.trim();if(!t)return toast('Напиши хоть одну живую фразу.');state.journal.unshift({id:uid(),date:todayISO(),text:t});save();document.querySelector('#journalText').value='';toast('День сохранён в памяти персонажа.')}
function startMic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast('Голосовой ввод в этом браузере не поддерживается.');const r=new SR();r.lang='ru-RU';r.interimResults=false;const btn=document.querySelector('#micBtn');btn.classList.add('mic-listening');btn.textContent='● Слушаю…';r.onresult=e=>{const tx=e.results[0][0].transcript;const ta=document.querySelector('#journalText');ta.value+=(ta.value?' ':'')+tx};r.onend=()=>{btn.classList.remove('mic-listening');btn.textContent='🎙 Наговорить'};r.start()}
function openQuestModal(){openModal(`<div class="modal-head"><h2>Новый квест</h2><button class="close">×</button></div><form id="questForm"><div class="form-row"><label>Название</label><input name="title" required></div><div class="form-row"><label>Описание</label><textarea name="description"></textarea></div><div class="form-grid"><div class="form-row"><label>Статус</label><select name="status"><option value="found">Обнаружен, не принят</option><option value="active">Активный</option><option value="background">Фоновый</option><option value="blocked">Заблокирован</option></select></div><div class="form-row"><label>Роль</label><select name="role"><option value="support">Обычный</option><option value="main">Главный</option></select></div></div><div class="modal-actions"><button class="primary">Сохранить</button></div></form>`);document.querySelector('#questForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);if(f.get('status')==='active'&&!canActivate(f.get('role')))return toast('Активные сюжетные слоты заняты. В журнал — можно.');state.quests.push({id:uid(),title:f.get('title'),description:f.get('description'),status:f.get('status'),role:f.get('role'),progress:0});save();document.querySelector('#modal').close();render();toast('Квест добавлен. Существование не создаёт долг.')}}
function canActivate(role='support'){const active=state.quests.filter(q=>q.status==='active');if(active.length>=state.settings.maxActiveQuests)return false;if(role==='main'&&active.some(q=>q.role==='main'))return false;return true}
function questAction(action,id){const q=state.quests.find(q=>q.id===id);if(!q)return;if(action==='accept'){if(!canActivate(q.role))return toast('Слот активных квестов занят. Ничего страшного — квест подождёт.');q.status='active'}if(action==='complete'){q.status='completed';q.progress=100;state.history.unshift({id:uid(),date:todayISO(),title:`Завершён квест «${q.title}»`,text:'Завершённая вещь остаётся в истории персонажа.'});state.profile.xp+=60}if(action==='background')q.status='background';if(action==='unlock'){q.status='found';delete q.requirement}if(action==='progress')q.progress=Math.min(100,(q.progress||0)+10);if(action==='idea'){state.ideas.push({id:uid(),title:q.title,note:q.description||''});state.quests=state.quests.filter(x=>x.id!==id)}save();render();toast('Журнал обновлён.')}
function openHistoryModal(){openModal(`<div class="modal-head"><h2>Добавить в историю</h2><button class="close">×</button></div><form id="historyForm"><div class="form-row"><label>Что произошло</label><input name="title" required></div><div class="form-row"><label>Почему это важно</label><textarea name="text"></textarea></div><div class="modal-actions"><button class="primary">Сохранить навсегда</button></div></form>`);document.querySelector('#historyForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.history.unshift({id:uid(),date:todayISO(),title:f.get('title'),text:f.get('text')});save();document.querySelector('#modal').close();render();toast('История персонажа пополнена.')}}
function openIdeaModal(){openModal(`<div class="modal-head"><h2>Инвентарь идей</h2><button class="close">×</button></div><form id="ideaForm"><div class="form-row"><label>Прекрасное безумие</label><input name="title" required></div><div class="form-row"><label>Заметка</label><textarea name="note"></textarea></div><div class="modal-actions"><button class="primary">Положить и забыть</button></div></form>`);document.querySelector('#ideaForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.ideas.unshift({id:uid(),title:f.get('title'),note:f.get('note')});save();document.querySelector('#modal').close();render();toast('Идея сохранена. Долг не создан.')}}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rpg-live-${todayISO()}.json`;a.click();URL.revokeObjectURL(a.href)}

document.addEventListener('click',e=>{const nav=e.target.closest('[data-nav]');if(nav){currentView=nav.dataset.nav;render();window.scrollTo({top:0,behavior:'smooth'})}});
document.querySelector('#quickAddBtn').onclick=()=>openActivityModal('work');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.querySelector('#installBtn').classList.remove('hidden')});
document.querySelector('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.querySelector('#installBtn').classList.add('hidden')};
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
render();
