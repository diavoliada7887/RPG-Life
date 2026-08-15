/* Calorie bank: the visible number is REMAINING deficit to reach the 70,000 kcal goal. */
function ensureCalorieBank(){
  const c=bank();
  c.dailyTarget=Number(c.dailyTarget)||1700;
  c.foodLogs=c.foodLogs||[];
  c.transactions=c.transactions||[];
  c.baseDone=Number(c.baseDone??c.done??2000)||0;
  c.total=Number(c.total)||70000;
  return c;
}
function bankBurned(){
  const c=ensureCalorieBank();
  return Math.max(0,Number(c.baseDone||0)+(c.transactions||[]).reduce((n,t)=>n+Number(t.delta||0),0));
}
function bankRemaining(){
  const c=ensureCalorieBank();
  return Math.max(0,c.total-bankBurned());
}
function dayActivityKcal(date){
  return state.practiceLogs.filter(l=>l.date===date).reduce((n,l)=>n+Number(l.kcal||0),0);
}
function foodLogFor(date){
  const c=ensureCalorieBank();
  return c.foodLogs.find(x=>x.date===date)||null;
}
function dayFoodDelta(date){
  const c=ensureCalorieBank(),f=foodLogFor(date);
  return f?c.dailyTarget-Number(f.eaten||0):null;
}
function dayBankDelta(date){
  const food=dayFoodDelta(date);
  if(food===null)return null;
  return food+dayActivityKcal(date);
}
function syncFoodTransaction(date){
  const c=ensureCalorieBank();
  c.transactions=c.transactions.filter(t=>!(t.source==='food'&&t.date===date));
  const f=foodLogFor(date);
  if(!f)return;
  const delta=c.dailyTarget-Number(f.eaten||0);
  c.transactions.push({id:uid(),date,delta,note:`Еда: ${f.eaten} / ${c.dailyTarget} ккал`,source:'food',refId:`food:${date}`});
}
function bankCard(){
  const c=ensureCalorieBank(),remaining=bankRemaining(),burned=bankBurned(),food=foodLogFor(selectedDate),activity=dayActivityKcal(selectedDate),foodDelta=dayFoodDelta(selectedDate),dayDelta=dayBankDelta(selectedDate);
  return `<div class="v2-kicker">Банк калорий</div>
  <div class="v2-row"><h3 class="v2-title">Осталось ${remaining.toLocaleString('ru-RU')} ккал</h3><button class="soft" id="editBank">Внести еду</button></div>
  <div class="bar green"><i style="width:${pct(Math.min(burned,c.total),c.total)}%"></i></div>
  <div class="v2-sub" style="margin-top:7px">Цель: ${c.total.toLocaleString('ru-RU')} ккал · уже снято ${burned.toLocaleString('ru-RU')} · дневная норма ${c.dailyTarget.toLocaleString('ru-RU')} ккал</div>
  <div class="bank-breakdown">
    <div><span>🍽 Съедено</span><b>${food?Number(food.eaten).toLocaleString('ru-RU')+' ккал':'не внесено'}</b></div>
    <div><span>🔥 Активность</span><b>${activity.toLocaleString('ru-RU')} ккал</b></div>
    <div><span>↘ Еда относительно нормы</span><b>${foodDelta===null?'—':`${foodDelta>=0?'−':'+'}${Math.abs(foodDelta).toLocaleString('ru-RU')} ккал к остатку`}</b></div>
    <div class="bank-day-total"><span>Сегодня</span><b>${dayDelta===null?'считаем после внесения еды':dayDelta>=0?`−${dayDelta.toLocaleString('ru-RU')} ккал от банка`:`+${Math.abs(dayDelta).toLocaleString('ru-RU')} ккал к банку`}</b></div>
  </div>`;
}
function editBank(){
  const c=ensureCalorieBank(),f=foodLogFor(selectedDate);
  openModal(`<div class="modal-head"><div><div class="v2-kicker">${fmt(selectedDate)}</div><h2>Банк калорий</h2></div><button class="close">×</button></div>
  <form id="foodForm"><label>Фактически съедено, ккал<input name="eaten" type="number" min="0" required value="${f?.eaten??''}" placeholder="например 1580"></label><div class="v2-sub">Норма на день: ${c.dailyTarget} ккал. Тренировки и шаги прибавляются к дефициту автоматически.</div><button class="primary">Сохранить день</button></form>
  <hr><form id="bankSettings"><label>Дневная норма<input name="target" type="number" min="1" value="${c.dailyTarget}"></label><label>Полная цель банка<input name="total" type="number" min="1" value="${c.total}"></label><label>Уже снято до начала учёта<input name="base" type="number" min="0" value="${c.baseDone}"></label><button class="soft">Сохранить настройки</button></form>`);
  document.querySelector('#foodForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),eaten=Math.max(0,Number(fd.get('eaten'))||0);const old=foodLogFor(selectedDate);if(old)old.eaten=eaten;else c.foodLogs.push({id:uid(),date:selectedDate,eaten});syncFoodTransaction(selectedDate);save();document.querySelector('#modal').close();render()};
  document.querySelector('#bankSettings').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);c.dailyTarget=Math.max(1,Number(fd.get('target'))||1700);c.total=Math.max(1,Number(fd.get('total'))||70000);c.baseDone=Math.max(0,Number(fd.get('base'))||0);c.foodLogs.forEach(x=>syncFoodTransaction(x.date));save();document.querySelector('#modal').close();render()};
}
