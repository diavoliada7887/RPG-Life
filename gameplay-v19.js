// RPG Life v19 — active effects vs buff compendium + wallet in treasury
(function(){
  const parseDate=d=>new Date(d+'T12:00:00');
  const ageDays=(date,start)=>Math.floor((parseDate(date)-parseDate(start))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;
  const coin=()=>'<span class="currency-icon coin-icon" aria-hidden="true">G</span>';
  const gem=()=>'<span class="currency-icon diamond-icon" aria-hidden="true">D</span>';

  function automaticStatus(date){
    const active=new Set();
    const logs=(state.practiceLogs||[]).filter(l=>l.date<=date);
    const todayLogs=logs.filter(l=>l.date===date);
    if(['train','hof','cold'].every(id=>todayLogs.some(l=>l.practiceId===id)))active.add('morning-boost');
    if(todayLogs.some(l=>l.practiceId==='kitchen-morning'))active.add('clean-start');
    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&ageDays(date,l.date)>=0&&ageDays(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){const opts=new Set(clothes.options||[]);if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x)))active.add('calm-week')}
    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&ageDays(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0)),age=ageDays(date,prep.date);if(days>0&&age<days)active.add('pantry-full')}
    return active;
  }

  const builtins=[
    {id:'morning-boost',title:'Утренний разгон',description:'Тело и нервная система получили полный утренний запуск. Это не обязательная серия — просто сильное сочетание, когда оно случилось.',condition:'В один день отмечены тренировка, Хоф и закаливание.',effect:'Энергия +5'},
    {id:'clean-start',title:'Чистый старт',description:'Быт не висит фоновым хвостом с самого утра, поэтому голове легче переключиться на своё.',condition:'Отмечена практика «Уборка кухни утром».',effect:'Вдохновение +4'},
    {id:'calm-week',title:'Спокойная неделя',description:'Одежда на ближайшие дни уже подготовлена, и одна регулярная бытовая забота временно снята с головы.',condition:'Комплект одежды на неделю выстиран, поглажен и развешен.',effect:'Спокойствие +5'},
    {id:'pantry-full',title:'Кладовая полна, милорд',description:'Еда на несколько дней уже существует. Меньше фоновых решений и меньше риска внезапно обнаружить голодного персонажа у пустого холодильника.',condition:'Есть действующий запас заготовленных обедов.',effect:'Спокойствие +4'},
    {id:'pretty',title:'Красотка',description:'Внешний образ сейчас особенно хорошо совпадает с ощущением себя. Это усилитель Узнавания, а не оценка внешности.',condition:'Баф «Красотка» активирован в состояниях персонажа.',effect:'Узнавание +4'}
  ];

  function compendium(date){
    const auto=automaticStatus(date);
    const explicit=(state.states||[]).filter(s=>s.type==='buff');
    const explicitNames=new Set(explicit.map(s=>String(s.title||'').trim().toLowerCase()));
    const cards=builtins.map(b=>({...b,active:b.id==='pretty'?explicitNames.has('красотка'):auto.has(b.id)}));
    explicit.filter(s=>String(s.title||'').trim()&&String(s.title||'').trim().toLowerCase()!=='красотка').forEach(s=>{
      cards.push({id:'state-'+s.id,title:s.title,description:s.note||'Пользовательский комплексный баф.',condition:'Активирован вручную в состояниях персонажа.',effect:s.strength?String(s.strength):'',active:true,user:true});
    });
    return cards;
  }

  function buffCompendiumCard(date){
    const cards=compendium(date);
    return `<article class="v2-card v2-span-12 buff-compendium-card">
      <div class="v2-row"><div><div class="v2-kicker">Бафы</div><h3 class="v2-title">Комплексные состояния</h3><div class="v2-sub">Не список обязанностей, а известные персонажу сочетания и состояния.</div></div><span class="buff-count">${cards.filter(x=>x.active).length} актив.</span></div>
      <div class="buff-compendium-grid">${cards.map(b=>`<div class="buff-book-card ${b.active?'active':'inactive'}"><div class="buff-book-head"><span class="buff-sigil">✦</span><div><b>${esc(b.title)}</b><small>${b.active?'Сейчас активно':'Сейчас не действует'}</small></div></div><p>${esc(b.description)}</p><div class="buff-book-rule"><small>Условие</small><span>${esc(b.condition)}</span></div>${b.effect?`<div class="buff-book-effect"><small>Эффект</small><strong>${esc(b.effect)}</strong></div>`:''}</div>`).join('')}</div>
    </article>`;
  }

  // The previous v18 card is useful, but it is an effect ledger, not the buff catalogue.
  const prevToday=todayView;
  todayView=function(){
    let html=prevToday();
    html=html.replace('<div class="v2-kicker">Бафы</div><h3 class="v2-title">Что сейчас усиливает персонажа</h3>','<div class="v2-kicker">Активные эффекты</div><h3 class="v2-title">Что сейчас действует на персонажа</h3>');
    const catalogue=buffCompendiumCard(selectedDate);
    if(html.includes('</section></div>'))html=html.replace('</section></div>',catalogue+'</section></div>');
    else html+=catalogue;
    return html;
  };

  // Treasury must show what can actually be spent before showing prices.
  const prevRewards=rewardsView;
  rewardsView=function(){
    let html=prevRewards();
    const wallet=`<section class="treasury-wallet"><div><div class="v2-kicker">Кошелёк</div><h2>На руках</h2></div><div class="treasury-wallet-values"><div>${coin()}<span><b>${Number(state.wallet?.gold||0).toLocaleString('ru-RU')}</b><small>золото</small></span></div><div>${gem()}<span><b>${Number(state.wallet?.diamonds||0).toLocaleString('ru-RU')}</b><small>алмазы</small></span></div></div></section>`;
    const anchor='<h1 class="v2-title">Сокровищница</h1>';
    if(html.includes(anchor))html=html.replace(anchor,anchor+wallet);else html=wallet+html;
    return html;
  };

  render();
})();