// Simpler day UI: states up top, calorie bank = one food number.
(function(){
  function statesTop(){
    return `<article class="v2-card v2-span-12 states-top"><div class="v2-row"><div><div class="v2-kicker">Состояние персонажа</div><h3 class="v2-title">Бафы и дебафы</h3></div><button class="ghost" id="addState">＋ состояние</button></div><div class="state-stack state-stack-top">${(state.states||[]).map(s=>`<div class="state-chip ${s.type}"><b>${s.type==='buff'?'✦':'⚠'} ${esc(s.title)}</b><small>${esc(s.note||'')}</small></div>`).join('')||'<div class="empty-v2">Сейчас ничего активного.</div>'}</div></article>`;
  }

  bankCard = function(){
    const c=ensureCalorieBank();
    const remaining=bankRemaining();
    const burned=bankBurned();
    const food=foodLogFor(selectedDate);
    const activity=dayActivityKcal(selectedDate);
    const dayDelta=dayBankDelta(selectedDate);
    return `<div class="v2-kicker">Банк калорий</div>
      <h3 class="v2-title">Осталось ${remaining.toLocaleString('ru-RU')} ккал</h3>
      <div class="bar green"><i style="width:${pct(Math.min(burned,c.total),c.total)}%"></i></div>
      <div class="food-entry">
        <label>Съела сегодня
          <div class="food-entry-row"><input id="foodToday" type="number" min="0" step="1" value="${food?.eaten??''}" placeholder="1350"><span>ккал</span><button class="primary" id="saveFood">Сохранить</button></div>
        </label>
      </div>
      <div class="bank-simple-stats">
        <span>Норма <b>${c.dailyTarget}</b></span>
        <span>Тренировки и шаги <b>+${activity}</b></span>
        <span>Итог дня <b>${dayDelta===null?'—':dayDelta>=0?`−${dayDelta} ккал`:`+${Math.abs(dayDelta)} ккал`}</b></span>
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

  const oldBind=bind;
  bind=function(){
    oldBind();
    document.querySelector('#saveFood')?.addEventListener('click',()=>{
      const raw=document.querySelector('#foodToday')?.value;
      if(raw===''||raw==null)return;
      const eaten=Math.max(0,Number(raw)||0);
      const c=ensureCalorieBank();
      const old=foodLogFor(selectedDate);
      if(old) old.eaten=eaten; else c.foodLogs.push({id:uid(),date:selectedDate,eaten});
      syncFoodTransaction(selectedDate);
      save();
      render();
    });
  };

  render();
})();