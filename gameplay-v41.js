// RPG Life v41 — date-derived buffs: retroactive day edits must affect later days
(function(){
  const DAY=86400000;
  const localDate41=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const parse41=d=>new Date(String(d)+'T12:00:00');
  const iso41=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const shift41=(date,n)=>{const d=parse41(date);d.setDate(d.getDate()+n);return iso41(d)};
  const age41=(date,start)=>Math.floor((parse41(date)-parse41(start))/DAY);
  const weekStart41=date=>{const d=parse41(date),n=(d.getDay()+6)%7;d.setDate(d.getDate()-n);return iso41(d)};

  function cleanStart41(b){return b?.id==='buff-clean-start'||String(b?.title||'').trim().toLowerCase()==='чистый старт'}
  function offset41(b){
    // Backward compatibility: old Clean Start was explicitly a next-day buff.
    if(cleanStart41(b)&&b.startOffsetDays===undefined)return 1;
    return Math.max(0,Number(b?.startOffsetDays||0));
  }
  function completed41(pid,date){return (state.practiceLogs||[]).some(l=>l.practiceId===pid&&l.date===date)}
  function latest41(pid,date,days){
    return [...(state.practiceLogs||[])]
      .filter(l=>l.practiceId===pid&&l.date<=date&&age41(date,l.date)>=0&&age41(date,l.date)<days)
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
  }
  function qualifyingDays41(b,date){
    const ids=b.practiceIds||[];if(!ids.length)return 0;
    const start=weekStart41(date);let count=0;
    for(let i=0;i<7;i++){
      const d=shift41(start,i);if(d>date)break;
      const hit=b.mode==='any'?ids.some(id=>completed41(id,d)):ids.every(id=>completed41(id,d));
      if(hit)count++;
    }
    return count;
  }
  function rollingDeficit41(date){
    if(typeof dayBankDelta!=='function')return 0;
    let sum=0;
    for(let i=0;i<7;i++){
      const delta=dayBankDelta(shift41(date,-i));
      if(delta!==null&&Number.isFinite(Number(delta)))sum+=Number(delta);
    }
    return Math.round(sum);
  }
  function slimAnchor41(date){
    for(let back=0;back<4;back++){
      const d=shift41(date,-back);
      if(rollingDeficit41(d)>=1200)return d;
    }
    return null;
  }

  function buffActive41(b,date){
    if(!b||!date)return false;
    if(b.customRule==='slimWeek')return !!slimAnchor41(date);

    const triggerDate=shift41(date,-offset41(b));

    if(b.customRule==='mealPrepStock'){
      const pid=(b.practiceIds||[])[0]||'meal-prep';
      const log=[...(state.practiceLogs||[])]
        .filter(l=>l.practiceId===pid&&l.date<=triggerDate)
        .sort((a,z)=>String(z.date).localeCompare(String(a.date)))[0];
      if(!log)return false;
      const days=Math.max(0,Number(log.metrics?.['Дней запаса']||0));
      const age=age41(triggerDate,log.date);
      return days>0&&age>=0&&age<days;
    }

    if(b.customRule==='clothesWeek'){
      const pid=(b.practiceIds||[])[0]||'clothes-week';
      const log=[...(state.practiceLogs||[])]
        .filter(l=>l.practiceId===pid&&l.date<=triggerDate&&age41(triggerDate,l.date)>=0&&age41(triggerDate,l.date)<7)
        .sort((a,z)=>String(z.date).localeCompare(String(a.date)))[0];
      if(!log)return false;
      const opts=new Set(log.options||[]);
      return ['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x));
    }

    if(b.mode==='manual'){
      const s=[...(state.states||[])].reverse().find(x=>x.type==='buff'&&(x.buffId===b.id||String(x.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));
      if(!s)return false;
      const started=s.date||s.startsOn||localDate41();
      return age41(date,started)>=offset41(b);
    }

    const ids=b.practiceIds||[];if(!ids.length)return false;
    if(b.conditionKind==='daysPerWeek'){
      return qualifyingDays41(b,triggerDate)>=Math.max(1,Math.min(7,Number(b.requiredDays||1)));
    }
    const days=Math.max(1,Number(b.windowDays||1));
    const hit=id=>!!latest41(id,triggerDate,days);
    return b.mode==='any'?ids.some(hit):ids.every(hit);
  }

  window.rpgBuffActiveForDate=buffActive41;

  function effect41(b){
    const names={inspiration:'✦ Вдохновение',calm:'☾ Спокойствие',energy:'⚡ Энергия',recognition:'◈ Узнавание'},bits=[];
    Object.entries(names).forEach(([k,n])=>{const v=Number(b.resourceEffects?.[k]||0);if(v)bits.push(`${n} ${v>0?'+':''}${v}`)});
    if(Number(b.rewardGold||0))bits.push(`+${Number(b.rewardGold)} золота`);
    if(Number(b.rewardDiamonds||0))bits.push(`+${Number(b.rewardDiamonds)} алмазов`);
    return bits.join(' · ')||((offset41(b)>0)?'действует со следующего дня':'активен по условию');
  }
  function thumb41(b){return `<span class="active-buff-thumb27">${b.imageData?`<img src="${b.imageData}" alt="">`:'✦'}</span>`}

  function repaintBuffCards41(){
    const date=typeof selectedDate==='string'?selectedDate:localDate41();
    document.querySelectorAll('.buff-card23').forEach(card=>{
      const edit=card.querySelector('[data-edit-buff38]');
      if(!edit)return;
      const b=(state.buffDefinitions||[]).find(x=>x.id===edit.dataset.editBuff38);if(!b)return;
      const active=buffActive41(b,date);
      card.classList.toggle('active',active);
      const status=card.querySelector('.buff-status23');
      if(status)status.textContent=active?'✦ Активен':'○ Не активен';
      const body=card.querySelector('.buff-rule-details23 > div');
      if(body&&offset41(b)>0&&!body.querySelector('.buff-offset41')){
        const note=document.createElement('p');
        note.className='buff-offset41';
        note.innerHTML='<small>↳ Результат начинает действовать со следующего дня.</small>';
        body.prepend(note);
      }
    });
  }

  function repaintHomeBuffs41(){
    const host=document.querySelector('.active-buffs27 .active-buffs-grid27');if(!host)return;
    const date=typeof selectedDate==='string'?selectedDate:localDate41();
    const active=(state.buffDefinitions||[]).filter(b=>buffActive41(b,date));
    host.innerHTML=active.map(b=>`<button data-go="buffs">${thumb41(b)}<span><b>${esc(b.title)}</b><small>${esc(effect41(b))}</small></span></button>`).join('')||'<div class="v2-sub">Сейчас ни один баф не активен.</div>';
    host.querySelectorAll('[data-go="buffs"]').forEach(x=>x.onclick=()=>{view='buffs';render()});
  }

  // Restore the timing control that disappeared from the newer buff editor.
  let editorId41=null;
  let beforeIds41=new Set();
  function decorateEditor41(){
    const form=document.querySelector('#buffForm38');
    if(!form||form.querySelector('#buffTiming41'))return;
    const b=editorId41?(state.buffDefinitions||[]).find(x=>x.id===editorId41):null;
    const offset=offset41(b);
    const label=document.createElement('label');
    label.id='buffTiming41';
    label.innerHTML=`Когда начинает действовать<select name="startOffsetDays41"><option value="0" ${offset===0?'selected':''}>В этот же день</option><option value="1" ${offset===1?'selected':''}>Со следующего дня</option></select><small>Если выбрать «со следующего дня», запись за вчера влияет на сегодняшний баф — даже если вчера ты внесла задним числом.</small>`;
    const condition=form.querySelector('select[name="conditionKind"]')?.closest('label');
    if(condition)condition.insertAdjacentElement('afterend',label);else form.prepend(label);
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-buff38]');
    if(edit){editorId41=edit.dataset.editBuff38;beforeIds41=new Set((state.buffDefinitions||[]).map(b=>b.id));setTimeout(decorateEditor41,0);return}
    if(e.target.closest('#addBuff38')){editorId41=null;beforeIds41=new Set((state.buffDefinitions||[]).map(b=>b.id));setTimeout(decorateEditor41,0)}
  },true);

  document.addEventListener('submit',e=>{
    const form=e.target.closest?.('#buffForm38');if(!form)return;
    const select=form.querySelector('[name="startOffsetDays41"]');if(!select)return;
    const wanted=Math.max(0,Math.min(1,Number(select.value)||0));
    const idAtSubmit=editorId41;
    const before=new Set(beforeIds41);
    queueMicrotask(()=>{
      let b=idAtSubmit?(state.buffDefinitions||[]).find(x=>x.id===idAtSubmit):null;
      if(!b)b=(state.buffDefinitions||[]).find(x=>!before.has(x.id));
      if(!b)return;
      if(Number(b.startOffsetDays||0)!==wanted){b.startOffsetDays=wanted;save();render()}
    });
  },true);

  const renderBefore41=render;
  render=function(){
    const result=renderBefore41();
    requestAnimationFrame(()=>{repaintBuffCards41();repaintHomeBuffs41()});
    return result;
  };

  const observer=new MutationObserver(()=>{decorateEditor41()});
  observer.observe(document.querySelector('#modal')||document.body,{subtree:true,childList:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>{repaintBuffCards41();repaintHomeBuffs41()}),{once:true});
  else requestAnimationFrame(()=>{repaintBuffCards41();repaintHomeBuffs41()});
})();
