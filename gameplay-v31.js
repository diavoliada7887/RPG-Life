// RPG Life v31 — restore resources + creative practice rewards + practice reward ledger
(function(){
  const DAY=86400000;
  const resources31={inspiration:{name:'Вдохновение',icon:'✦'},calm:{name:'Спокойствие',icon:'☾'},energy:{name:'Энергия',icon:'⚡'},recognition:{name:'Узнавание',icon:'◈'}};
  const parse31=d=>new Date(d+'T12:00:00');
  const age31=(date,start)=>Math.floor((parse31(date)-parse31(start))/DAY);
  const shift31=(date,n)=>{const d=parse31(date);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const signed31=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));

  state.currencyLedger=state.currencyLedger||[];
  state.wallet=state.wallet||{gold:0,diamonds:0};

  function latest31(pid,date,days){return [...(state.practiceLogs||[])].filter(l=>l.practiceId===pid&&l.date<=date&&age31(date,l.date)>=0&&age31(date,l.date)<days).sort((a,b)=>b.date.localeCompare(a.date))[0]||null}
  function buffActive31(b,date){
    if(b.customRule==='slimWeek')return false; // displayed by its own v27 rule; don't fake it here
    const offset=Math.max(0,Number(b.startOffsetDays||0)),trigger=shift31(date,-offset);
    if(b.customRule==='mealPrepStock'){
      const log=[...(state.practiceLogs||[])].filter(l=>l.practiceId===((b.practiceIds||[])[0]||'meal-prep')&&l.date<=trigger).sort((a,z)=>z.date.localeCompare(a.date))[0];
      if(!log)return false;const days=Math.max(0,Number(log.metrics?.['Дней запаса']||0)),a=age31(trigger,log.date);return days>0&&a>=0&&a<days;
    }
    if(b.customRule==='clothesWeek'){
      const log=latest31((b.practiceIds||[])[0]||'clothes-week',trigger,7);if(!log)return false;const opts=new Set(log.options||[]);return ['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x));
    }
    if(b.mode==='manual')return (state.states||[]).some(s=>s.type==='buff'&&(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));
    const ids=b.practiceIds||[];if(!ids.length)return false;const days=Math.max(1,Number(b.windowDays||1)),hit=id=>!!latest31(id,trigger,days);return b.mode==='any'?ids.some(hit):ids.every(hit);
  }
  function resourceTotals31(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0};
    (state.practices||[]).forEach(p=>{
      const days=Math.max(1,Number(p.resourceEffectDays||1));
      if(!latest31(p.id,date,days))return;
      Object.keys(out).forEach(k=>out[k]+=Number(p.resourceEffects?.[k]||0));
    });
    (state.buffDefinitions||[]).filter(b=>buffActive31(b,date)).forEach(b=>Object.keys(out).forEach(k=>out[k]+=Number(b.resourceEffects?.[k]||0)));
    Object.keys(out).forEach(k=>out[k]=signed31(out[k]));return out;
  }
  function resourceCard31(date){
    const vals=resourceTotals31(date);
    return `<article class="v2-card v2-span-12 state-now23 resources31"><div class="v2-row"><div><div class="v2-kicker">Состояние</div><h3 class="v2-title">Ресурсы персонажа</h3></div><small class="v2-sub">0 — обычная точка</small></div><div class="resource-grid23">${Object.entries(resources31).map(([k,m])=>{const v=vals[k],pos=((v+20)/40)*100;return `<div class="resource23 resource-${k}"><div><span>${m.icon} ${m.name}</span><b>${v>0?'+':''}${v}</b></div><div class="resource-track23"><span></span><i style="left:${pos}%"></i></div></div>`}).join('')}</div></article>`;
  }

  const todayBefore31=todayView;
  todayView=function(){
    let html=todayBefore31();
    if(html.includes('resources31'))return html;
    const needle='<article class="v2-card v2-span-8 quick-card23">';
    return html.includes(needle)?html.replace(needle,resourceCard31(selectedDate)+needle):html.replace('</section></div>',resourceCard31(selectedDate)+'</section></div>');
  };

  function creativeLine31(id){return (state.creativeLines||[]).find(x=>x.id===id)}
  function creativeEditor31(lineId,id=null){
    const line=creativeLine31(lineId);if(!line)return;
    const p=id?(state.practices||[]).find(x=>x.id===id):null,r=p?.rhythm||{type:'timesWeek',value:1};
    const variants=(p?.variants||[]).map(v=>v.name).join(', ');
    openModal(`<div class="modal-head"><div><div class="v2-kicker">${esc(line.title)}</div><h2>${p?'Изменить практику':'Новая практика'}</h2></div><button class="close">×</button></div><form id="creativePracticeForm31"><label>Название<input name="name" required value="${esc(p?.name||'')}"></label><div class="form-section"><b>Награда за выполнение</b><label><span>G Золото</span><input name="rewardGold" type="number" min="0" step="1" value="${Math.max(0,Number(p?.rewardGold||0))}"></label><small>Сумма записывается в само выполненное событие. Будущая смена экономики старые награды не пересчитает.</small></div><label>Мягкий минимум<select name="rhythmType"><option value="timesWeek" ${r.type==='timesWeek'?'selected':''}>раз в неделю</option><option value="weeklyAmount" ${r.type==='weeklyAmount'?'selected':''}>объём за неделю</option><option value="daily" ${r.type==='daily'?'selected':''}>ежедневно</option><option value="soft" ${r.type==='soft'?'selected':''}>без минимума</option></select></label><div class="form-grid"><label>Минимум<input name="rhythmValue" type="number" min="1" value="${Math.max(1,Number(r.value||1))}"></label><label>Единица для объёма<input name="rhythmUnit" value="${esc(r.unit||'')}"></label></div><label>Варианты через запятую<input name="variants" value="${esc(variants)}"></label><label>Метрики через запятую<input name="metrics" value="${esc((p?.metrics||['Минут']).join(', '))}"></label><div class="form-grid"><label>Вдохновение<input name="inspiration" type="number" min="0" max="20" value="${Number(p?.resourceEffects?.inspiration||2)}"></label><label>Вес в Творчестве<input name="weight" type="number" min="1" max="100" value="${Number(p?.branches?.creative||15)}"></label></div><div class="modal-actions">${p?'<button type="button" class="danger-soft" id="deleteCreativePractice31">Удалить</button>':''}<button class="primary">Сохранить</button></div></form>`);
    const form=document.querySelector('#creativePracticeForm31');
    form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),type=f.get('rhythmType')||'timesWeek',rhythm=type==='soft'?{type:'soft'}:type==='daily'?{type:'daily'}:{type,value:Math.max(1,Number(f.get('rhythmValue'))||1),...(type==='weeklyAmount'?{unit:String(f.get('rhythmUnit')||'').trim()}: {})},target=p||{id:uid()};Object.assign(target,{creativeLineId:lineId,name:String(f.get('name')||'').trim(),rewardGold:Math.max(0,Math.round(Number(f.get('rewardGold'))||0)),branches:{...(target.branches||{}),creative:Math.max(1,Number(f.get('weight'))||15)},rhythm,metrics:String(f.get('metrics')||'').split(',').map(x=>x.trim()).filter(Boolean),variants:String(f.get('variants')||'').split(',').map(x=>x.trim()).filter(Boolean).map(name=>({name,kcal:0})),resourceEffects:{...(target.resourceEffects||{}),inspiration:Math.max(0,Number(f.get('inspiration'))||0)},resourceEffectDays:1});if(!p)state.practices.push(target);save();document.querySelector('#modal').close();render()};
    document.querySelector('#deleteCreativePractice31')?.addEventListener('click',()=>{if(confirm('Удалить эту практику? Старые записи останутся в истории.')){state.practices=state.practices.filter(x=>x.id!==p.id);save();document.querySelector('#modal').close();render()}});
  }

  // Practice rewards already change the wallet in v17. Here we make every granted reward auditable in the common ledger.
  function backfillPracticeLedger31(){
    let changed=false;
    (state.practiceLogs||[]).forEach(l=>{
      const gold=Math.max(0,Number(l.rewardGoldGranted||0));if(!gold)return;
      const key=`practice:${l.id}`;if(state.currencyLedger.some(x=>x.ledgerKey===key))return;
      const p=(state.practices||[]).find(x=>x.id===l.practiceId);
      state.currencyLedger.push({id:uid(),ledgerKey:key,date:l.date,at:`${l.date}T12:00:00`,kind:'practice',sourceId:l.practiceId,title:`Практика · ${p?.name||'выполнение'}`,gold,diamonds:0,backfilled:true});changed=true;
    });return changed;
  }

  const logBefore31=logPractice;
  logPractice=function(id,logId=null){
    logBefore31(id,logId);
    const form=document.querySelector('#logFormV17')||document.querySelector('#logForm');if(!form)return;
    const beforeIds=new Set((state.practiceLogs||[]).map(x=>x.id));
    form.addEventListener('submit',()=>setTimeout(()=>{
      let changed=false;
      const candidates=(state.practiceLogs||[]).filter(l=>l.practiceId===id&&l.date===selectedDate);
      candidates.forEach(l=>{if(!beforeIds.has(l.id)){const gold=Math.max(0,Number(l.rewardGoldGranted||0)),key=`practice:${l.id}`;if(gold&&!state.currencyLedger.some(x=>x.ledgerKey===key)){const p=(state.practices||[]).find(x=>x.id===id);state.currencyLedger.push({id:uid(),ledgerKey:key,date:l.date,at:new Date().toISOString(),kind:'practice',sourceId:id,title:`Практика · ${p?.name||'выполнение'}`,gold,diamonds:0});changed=true}}});
      if(changed)save();
    },0),{once:true});
  };

  const bindBefore31=bind;
  bind=function(){
    bindBefore31();
    document.querySelectorAll('[data-add-creative-practice24]').forEach(x=>x.onclick=()=>creativeEditor31(x.dataset.addCreativePractice24));
    document.querySelectorAll('[data-edit-creative-practice24]').forEach(x=>x.onclick=()=>creativeEditor31(x.dataset.line24,x.dataset.editCreativePractice24));
  };

  let changed=backfillPracticeLedger31();if(changed)save();
  render();
})();
