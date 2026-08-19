// RPG Life v42 — boss deadline clocks, stage remaining amounts and robust buff deletion.
(function(){
  const DAY=86400000;
  const parse42=date=>new Date(String(date)+'T12:00:00');
  const iso42=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const localToday42=()=>iso42(new Date());
  const plural42=(n,forms)=>{
    const x=Math.abs(Number(n)||0)%100,y=x%10;
    if(x>10&&x<20)return forms[2];
    if(y>1&&y<5)return forms[1];
    if(y===1)return forms[0];
    return forms[2];
  };

  function calendar42(year){return window.RPGProductionCalendarRU?.[year]||null}
  function isWorkingDay42(date){
    const d=parse42(date),cal=calendar42(d.getFullYear()),day=d.getDay();
    if(cal?.workingWeekends?.includes(date))return true;
    if(day===0||day===6)return false;
    if(cal?.nonWorking?.includes(date))return false;
    return true;
  }
  function calendarDaysLeft42(deadline,from=localToday42()){
    return Math.round((parse42(deadline)-parse42(from))/DAY)+1;
  }
  function workingDaysLeft42(deadline,from=localToday42()){
    const start=parse42(from),end=parse42(deadline);
    if(end<start)return 0;
    let count=0,d=new Date(start);
    while(d<=end){if(isWorkingDay42(iso42(d)))count++;d.setDate(d.getDate()+1)}
    return count;
  }
  function bossById42(id){return (state.bosses||[]).find(b=>b.id===id)}
  function stageByToken42(token){
    const [bid,sid]=String(token||'').split(':'),boss=bossById42(bid),stage=(boss?.stages||[]).find(s=>s.id===sid);
    return {boss,stage};
  }

  function decorateBossDeadline42(card,b){
    if(!b?.deadline)return;
    const meta=card.querySelector('.boss-meta');if(!meta)return;
    let row=card.querySelector('.boss-deadline42');
    if(!row){row=document.createElement('div');row.className='boss-deadline42';meta.insertAdjacentElement('afterend',row)}
    const calendarDays=calendarDaysLeft42(b.deadline),workingDays=workingDaysLeft42(b.deadline);
    if(calendarDays<1){
      const overdue=Math.abs(calendarDays-1);
      row.innerHTML=`<span class="boss-overdue42">Дедлайн прошёл${overdue?` · ${overdue} ${plural42(overdue,['день','дня','дней'])} назад`:''}</span>`;
      return;
    }
    const supported=!!calendar42(parse42(b.deadline).getFullYear());
    row.innerHTML=`<span>Осталось: <b>${calendarDays}</b> календарных</span><span title="${supported?'По производственному календарю РФ':'Без календаря переносов: исключены только субботы и воскресенья'}"><b>${workingDays}</b> рабочих</span>`;
  }

  function decorateStageRemaining42(row){
    const hit=row.querySelector('[data-hit32]');if(!hit)return;
    const {stage}=stageByToken42(hit.dataset.hit32);if(!stage||stage.total===null||stage.total===undefined||stage.total==='')return;
    const total=Number(stage.total),done=Number(stage.done||0);if(!Number.isFinite(total))return;
    const remaining=Math.max(0,total-done);
    let line=row.querySelector('.boss-remaining42');
    if(!line){line=document.createElement('div');line.className='boss-remaining42';const bar=row.querySelector('.bar');(bar||row.querySelector('.boss-progress-head22'))?.insertAdjacentElement('afterend',line)}
    if(line)line.textContent=`Осталось ${remaining.toLocaleString('ru-RU')} ${stage.unit||''}`.trim();
  }

  function decorateBosses42(){
    document.querySelectorAll('.boss-card22').forEach(card=>{
      const id=card.querySelector('[data-edit-v12]')?.dataset.editV12,b=bossById42(id);if(!b)return;
      decorateBossDeadline42(card,b);
      card.querySelectorAll('.boss-progress-row22').forEach(decorateStageRemaining42);
    });
  }

  function ensureBuffDelete42(){
    document.querySelectorAll('.buff-card23').forEach(card=>{
      const edit=card.querySelector('[data-edit-buff38]');if(!edit)return;
      const id=edit.dataset.editBuff38,actions=edit.closest('.buff-actions23');if(!actions)return;
      const old=actions.querySelector('[data-delete-buff40]');
      if(old){old.classList.add('buff-delete42');old.title='Удалить баф';old.setAttribute('aria-label','Удалить баф');return}
      if(actions.querySelector('[data-delete-buff42]'))return;
      const button=document.createElement('button');
      button.type='button';button.className='icon-button23 buff-delete42';button.dataset.deleteBuff42=id;button.title='Удалить баф';button.setAttribute('aria-label','Удалить баф');button.textContent='×';
      actions.appendChild(button);
    });
  }

  function deleteBuff42(id){
    const buff=(state.buffDefinitions||[]).find(x=>x.id===id);if(!buff)return;
    if(!confirm(`Удалить баф «${buff.title||'Без названия'}»?`))return;
    state.buffDefinitions=(state.buffDefinitions||[]).filter(x=>x.id!==id);
    state.states=(state.states||[]).filter(x=>x.buffId!==id);
    save();
    document.querySelector('#modal')?.close?.();
    render();
    if(typeof toast==='function')toast('Баф удалён');
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-delete-buff42]');if(!button)return;
    e.preventDefault();e.stopPropagation();deleteBuff42(button.dataset.deleteBuff42);
  },true);

  const renderBefore42=render;
  render=function(){
    const result=renderBefore42();
    requestAnimationFrame(()=>{decorateBosses42();ensureBuffDelete42()});
    return result;
  };

  const observer42=new MutationObserver(()=>ensureBuffDelete42());
  observer42.observe(document.querySelector('#modal')||document.body,{subtree:true,childList:true});

  window.rpgBossCalendarDaysLeft=calendarDaysLeft42;
  window.rpgBossWorkingDaysLeft=workingDaysLeft42;
  window.rpgIsWorkingDay=isWorkingDay42;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>{decorateBosses42();ensureBuffDelete42()}),{once:true});
  else requestAnimationFrame(()=>{decorateBosses42();ensureBuffDelete42()});
})();
