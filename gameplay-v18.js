// RPG Life v18 — visible active buffs block
(function(){
  const parseDate=d=>new Date(d+'T12:00:00');
  const ageDays=(date,start)=>Math.floor((parseDate(date)-parseDate(start))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;

  function activeBuffs(date){
    const buffs=[];
    const logs=(state.practiceLogs||[]).filter(l=>l.date<=date);
    const todayLogs=logs.filter(l=>l.date===date);

    // Explicit buffs the user created.
    (state.states||[]).filter(s=>s.type==='buff').forEach(s=>{
      const title=String(s.title||'').trim();
      if(!title)return;
      const known=title.toLowerCase()==='красотка';
      buffs.push({title,note:s.note||'',effect:known?'Узнавание +4':'',kind:'explicit'});
    });

    // Automatic buffs from current game rules.
    if(['train','hof','cold'].every(id=>todayLogs.some(l=>l.practiceId===id)))
      buffs.push({title:'Утренний разгон',effect:'Энергия +5',note:'Тренировка + Хоф + закаливание сегодня',kind:'auto'});

    if(todayLogs.some(l=>l.practiceId==='kitchen-morning'))
      buffs.push({title:'Чистый старт',effect:'Вдохновение +4',note:'Утренняя кухня закрыта',kind:'auto'});

    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&ageDays(date,l.date)>=0&&ageDays(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){
      const opts=new Set(clothes.options||[]);
      if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x)))
        buffs.push({title:'Спокойная неделя',effect:'Спокойствие +5',note:'Одежда на неделю готова',kind:'auto'});
    }

    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&ageDays(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){
      const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0)),age=ageDays(date,prep.date);
      if(days>0&&age<days) buffs.push({title:'Кладовая полна, милорд',effect:'Спокойствие +4',note:`Запаса ещё примерно на ${Math.max(1,days-age)} дн.`,kind:'auto'});
    }
    return buffs;
  }

  function buffsCard(date){
    const buffs=activeBuffs(date);
    return `<article class="v2-card v2-span-12 active-buffs-card">
      <div class="v2-row"><div><div class="v2-kicker">Бафы</div><h3 class="v2-title">Что сейчас усиливает персонажа</h3></div><span class="buff-count">${buffs.length}</span></div>
      ${buffs.length?`<div class="active-buffs-grid">${buffs.map(b=>`<div class="active-buff ${b.kind}"><span class="buff-sigil">✦</span><div><b>${esc(b.title)}</b>${b.effect?`<strong>${esc(b.effect)}</strong>`:''}${b.note?`<small>${esc(b.note)}</small>`:''}</div></div>`).join('')}</div>`:`<div class="empty-buffs">Сейчас активных бафов нет. И это не минус — просто ничего дополнительного не действует.</div>`}
    </article>`;
  }

  const prevToday=todayView;
  todayView=function(){
    let html=prevToday();
    const card=buffsCard(selectedDate);
    if(html.includes('</section></div>')) html=html.replace('</section></div>',card+'</section></div>');
    else html+=card;
    return html;
  };

  render();
})();
