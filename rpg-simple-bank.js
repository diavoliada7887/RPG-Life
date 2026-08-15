// Simple daily calorie bank + top-of-day states
(function(){
  const DAILY_NORM = 1700;

  function ensureFoodStore(){
    const c = bank();
    c.food = c.food || {};
    return c;
  }

  function foodForDate(date){
    const c = ensureFoodStore();
    const v = c.food[date];
    return v === undefined || v === null || v === '' ? null : Number(v);
  }

  function activityKcalForDate(date){
    return (state.practiceLogs || [])
      .filter(l => l.date === date)
      .reduce((sum,l) => sum + (Number(l.kcal)||0), 0);
  }

  function dayBankResult(date){
    const eaten = foodForDate(date);
    if(eaten === null) return null;
    return DAILY_NORM - eaten + activityKcalForDate(date);
  }

  function bankRemaining(){
    const c = ensureFoodStore();
    const historicalDone = Number(c.baseDone)||0;
    const days = Object.keys(c.food || {});
    const since = days.reduce((sum,d)=>sum+(dayBankResult(d)||0),0);
    return Math.max(0, Number(c.total||70000) - historicalDone - since);
  }

  function statesTop(){
    return `<article class="v2-card v2-span-12 states-top"><div class="v2-row"><div><div class="v2-kicker">Состояние персонажа</div><h3 class="v2-title">Бафы и дебафы</h3></div><button class="ghost" id="addState">＋ состояние</button></div><div class="state-stack state-stack-top">${(state.states||[]).map(s=>`<div class="state-chip ${s.type}"><b>${s.type==='buff'?'✦':'⚠'} ${esc(s.title)}</b><small>${esc(s.note||'')}</small></div>`).join('')||'<div class="empty-v2">Сейчас ничего активного.</div>'}</div></article>`;
  }

  bankCard = function(){
    const c = ensureFoodStore();
    const eaten = foodForDate(selectedDate);
    const activity = activityKcalForDate(selectedDate);
    const result = dayBankResult(selectedDate);
    const remaining = bankRemaining();
    const progress = Math.max(0, Number(c.total||70000)-remaining);
    return `<div class="v2-kicker">Банк калорий</div>
      <h3 class="v2-title">Осталось ${remaining.toLocaleString('ru-RU')} ккал</h3>
      <div class="bar green"><i style="width:${pct(progress,c.total)}%"></i></div>
      <div class="food-entry">
        <label>Съела сегодня
          <div class="food-entry-row"><input id="foodToday" type="number" min="0" step="1" value="${eaten??''}" placeholder="например 1350"><span>ккал</span><button class="primary" id="saveFood">Сохранить</button></div>
        </label>
      </div>
      <div class="bank-simple-stats">
        <span>Норма <b>${DAILY_NORM}</b></span>
        <span>Активность <b>+${activity}</b></span>
        <span>Сегодня <b>${result===null?'—':(result>=0?'−':'＋')+Math.abs(result)+' ккал'}</b></span>
      </div>`;
  };

  todayView = function(){
    return `<div class="v2-wrap"><section class="v2-grid">
      <article class="v2-card v2-span-12"><div class="v2-row"><div><div class="v2-kicker">День персонажа</div><h1 class="v2-title">${fmt(selectedDate)}</h1></div><div class="currency-bar"><div class="currency-pill gold">🪙 <b>${state.wallet.gold}</b></div><div class="currency-pill diamond">💎 <b>${state.wallet.diamonds}</b></div></div></div>${dayStrip()}</article>
      ${statesTop()}
      <article class="v2-card v2-span-8"><div class="v2-kicker">Быстрая фиксация</div><h2 class="v2-title">Что произошло?</h2><div class="v2-sub">Область → практика или творческая линия → конкретное событие.</div>${practiceMenus()}</article>
      <article class="v2-card v2-span-4"><div class="v2-kicker">Зафиксировано</div><h3 class="v2-title">Этот день</h3><div class="today-log">${todayLog()}</div></article>
      <article class="v2-card v2-span-12">${workSummary()}</article>
      <article class="v2-card v2-span-7"><div class="v2-kicker">Ритм</div><h3 class="v2-title">Неделя вокруг выбранного дня</h3>${rhythmCard()}</article>
      <article class="v2-card v2-span-5">${bankCard()}</article>
      <article class="v2-card v2-span-7"><div class="v2-kicker">Битвы</div><h3 class="v2-title">Активные противники</h3>${state.bosses.map(b=>`<div class="arch-note"><b>${esc(b.title)}</b> · эпический · ${bossThreat(b)}</div>`).join('')}<button class="soft" data-go="battles">Открыть арену →</button></article>
    </section></div>`;
  };

  const oldBind = bind;
  bind = function(){
    oldBind();
    document.querySelector('#saveFood')?.addEventListener('click',()=>{
      const input=document.querySelector('#foodToday');
      const val=Number(input?.value);
      if(!Number.isFinite(val)||val<0) return;
      const c=ensureFoodStore();
      c.food[selectedDate]=Math.round(val);
      save();
      render();
    });
  };

  render();
})();