// RPG Life v9 — numeric boss progress, microtasks, treasury rewards
(function(){
  state.rewardClaims=state.rewardClaims||[];
  (state.bosses||[]).forEach(b=>{b.microtasks=b.microtasks||[]});
  save();

  const localISO=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
  const rankLabel=rank=>({gray:'Серый',green:'Зелёный',blue:'Синий',purple:'Фиолетовый',gold:'Золотой',epic:'Фиолетовый'})[rank]||rank||'Без ранга';
  const numericReady=b=>(b.stages||[]).every(s=>s.kind==='unknown'||s.total===null||Number(s.done||0)>=Number(s.total||0));
  const microReady=b=>!(b.microtasks||[]).length||(b.microtasks||[]).every(x=>x.done);
  const fatalityReady=b=>!(b.final||[]).length||(b.final||[]).every(x=>x.done);
  const victoryReady=b=>numericReady(b)&&microReady(b)&&fatalityReady(b)&&!b.victoryConfirmed;
  const rewardById=id=>(state.rewards||[]).find(r=>r.id===id)||null;

  function numericStagesHTML(b){
    if(!(b.stages||[]).length)return'';
    return `<div class="boss-section"><div class="v2-kicker">Численный прогресс</div>${b.stages.map(s=>{
      if(s.kind==='unknown')return `<div class="numeric-stage unknown"><div class="stage-line"><b>🌫 ${esc(s.name)}</b><span>${Number(s.done||0).toLocaleString('ru-RU')} ${esc(s.unit||'')}</span></div><div class="stage-input"><input type="number" min="0" value="${Number(s.done||0)}" data-boss-stage="${b.id}:${s.id}"></div></div>`;
      const total=Number(s.total||0),done=Number(s.done||0);return `<div class="numeric-stage"><div class="stage-line"><b>${esc(s.name)}</b><span>${done.toLocaleString('ru-RU')} / ${total.toLocaleString('ru-RU')} ${esc(s.unit||'')}</span></div><div class="bar"><i style="width:${pct(done,total)}%"></i></div><div class="stage-input"><input type="number" min="0" max="${total}" value="${done}" data-boss-stage="${b.id}:${s.id}"></div></div>`;
    }).join('')}</div>`;
  }
  function microtasksHTML(b){
    if(!(b.microtasks||[]).length)return'';
    return `<div class="boss-section microtasks-section"><div class="v2-kicker">Микрозадачи</div><div class="microtask-list">${b.microtasks.map(x=>`<label><input type="checkbox" data-microtask="${b.id}:${x.id}" ${x.done?'checked':''} ${b.victoryConfirmed?'disabled':''}><span>${esc(x.label)}</span></label>`).join('')}</div></div>`;
  }
  function fatalityHTML(b){
    if(!(b.final||[]).length)return'';
    return `<div class="boss-section fatality-section"><div class="v2-kicker">Фаталити</div><div class="final-list">${b.final.map(x=>`<label><input type="checkbox" data-final-v9="${b.id}:${x.id}" ${x.done?'checked':''} ${b.victoryConfirmed?'disabled':''}> ${esc(x.label)}</label>`).join('')}</div></div>`;
  }

  function bossCard(b){
    const rank=b.rank==='epic'?'purple':b.rank,reward=rewardById(b.rewardId);
    const status=b.victoryConfirmed?'🏆 Побеждён':victoryReady(b)?'✦ Всё готово к победе':b.status==='defeated_pending_fatality'?'☠ Остались последние действия':b.deadline?`⚔ ${bossThreat(b)}`:'⚔ Активен';
    const outcome=b.victoryOutcome?`<div class="victory-outcome"><div class="v2-kicker">После победы</div><p>${esc(b.victoryOutcome)}</p></div>`:'';
    const rewardLine=reward?`<div class="boss-reward-line">🎁 Награда из Сокровищницы: <b>${esc(reward.title)}</b></div>`:'';
    const action=b.victoryConfirmed?`<div class="boss-victory boss-victory-confirmed"><span>✦</span><b>ПОБЕДА!</b><small>${b.victoryDate?fmt(b.victoryDate):''}${reward?' · '+esc(reward.title):''}</small></div>`:victoryReady(b)?`<button class="boss-victory-button" data-claim-victory-v9="${b.id}"><span>✦</span><b>ПОБЕДА!</b><small>Забрать победу и награду</small></button>`:`<div class="victory-locked"><span>⚔</span><small>Победа откроется, когда численный прогресс и обязательные задачи будут закрыты.</small></div>`;
    return `<article class="v2-card v2-span-12 boss-card ${rank||''}"><div class="boss-head"><div><div class="v2-kicker">${rankLabel(rank)} босс</div><h2 class="v2-title">${esc(b.title)}</h2>${b.note?`<div class="v2-sub">${esc(b.note)}</div>`:''}</div><div class="boss-actions"><span class="rank">${esc(rankLabel(rank))}</span><button class="soft" data-edit-boss-v9="${b.id}">⚙</button></div></div><div class="boss-meta">${b.deadline?`<span>☠ ${fmt(b.deadline)}</span>`:''}<span>${status}</span></div>${numericStagesHTML(b)}${microtasksHTML(b)}${fatalityHTML(b)}${outcome}${rewardLine}${action}</article>`;
  }
  bossHTML=bossCard;
  battlesView=function(){return `<div class="v2-wrap"><div class="v2-row battles-title-row"><div><div class="v2-kicker">Арена</div><h1 class="v2-title">Боссы</h1></div><button class="primary" id="addBossV9">＋ Босс</button></div><div class="v2-grid">${state.bosses.map(b=>bossCard(b)).join('')}</div></div>`};

  function rewardOptions(selected){return `<option value="">Без награды</option>${(state.rewards||[]).map(r=>`<option value="${r.id}" ${selected===r.id?'selected':''}>${esc(r.title)} · ${r.price} ${r.currency==='gold'?'🪙':'💎'}</option>`).join('')}`}
  function bossForm(b={}){
    const stages=(b.stages||[]).map(s=>`${s.name}|${s.done??0}|${s.total??''}|${s.unit||''}${s.kind==='unknown'?'|unknown':''}`).join('\n');
    const micro=(b.microtasks||[]).map(x=>x.label).join('; '),finals=(b.final||[]).map(x=>x.label).join('; ');
    return `<div class="modal-head"><div><div class="v2-kicker">Настройки босса</div><h2>${b.id?'Редактировать':'Добавить босса'}</h2></div><button class="close">×</button></div><form id="bossFormV9"><label>Название<input name="title" required value="${esc(b.title||'')}"></label><div class="form-grid"><label>Ранг<select name="rank">${['gray','green','blue','purple','gold'].map(r=>`<option value="${r}" ${(b.rank==='epic'?'purple':b.rank)===r?'selected':''}>${rankLabel(r)}</option>`).join('')}</select></label><label>Дедлайн<input name="deadline" type="date" value="${b.deadline||''}"></label></div><label>Награда из Сокровищницы<select name="rewardId">${rewardOptions(b.rewardId||'')}</select></label><label>Что изменится после победы<textarea name="victoryOutcome" placeholder="Что эта победа реально изменит...">${esc(b.victoryOutcome||'')}</textarea></label><label>Численный прогресс <small>только там, где есть объём: название | сделано | всего | единица. Неизвестный объём: добавь | unknown</small><textarea name="stages" placeholder="Сканирование | 2000 | 28888 | листов">${esc(stages)}</textarea></label><label>Микрозадачи <small>через ; — это обычные фактические действия без отдельных полос</small><textarea name="microtasks" placeholder="Сменить обложку; Выложить пост; Ответить рекламщику">${esc(micro)}</textarea></label><label>Фаталити <small>последние обязательные действия перед кнопкой Победа</small><textarea name="finals">${esc(finals)}</textarea></label><label>Заметка<textarea name="note">${esc(b.note||'')}</textarea></label><div class="modal-actions"><button class="primary">Сохранить</button>${b.id?`<button type="button" class="danger-soft" id="deleteBossV9">Удалить босса</button>`:''}</div></form>`;
  }
  function editBoss(id=null){
    const b=id?state.bosses.find(x=>x.id===id):null;openModal(bossForm(b||{}));
    document.querySelector('#bossFormV9').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),old=b||{id:uid(),status:'active',victoryConfirmed:false};
      const oldStages=new Map((b?.stages||[]).map(s=>[s.name,s]));
      const stages=String(f.get('stages')||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const [name,done,total,unit,kind]=line.split('|').map(x=>x.trim()),prev=oldStages.get(name);return{id:prev?.id||uid(),name,done:Number(done)||0,total:kind==='unknown'||!total?null:Number(total),unit:unit||'',kind:kind==='unknown'?'unknown':'fixed'}});
      const makeTasks=(text,oldArr)=>{const oldMap=new Map((oldArr||[]).map(x=>[x.label,x]));return String(text||'').split(';').map(x=>x.trim()).filter(Boolean).map(label=>({id:oldMap.get(label)?.id||uid(),label,done:!!oldMap.get(label)?.done}))};
      Object.assign(old,{title:f.get('title'),rank:f.get('rank'),deadline:f.get('deadline')||null,rewardId:f.get('rewardId')||'',victoryOutcome:f.get('victoryOutcome')||'',note:f.get('note')||'',stages,microtasks:makeTasks(f.get('microtasks'),b?.microtasks),final:makeTasks(f.get('finals'),b?.final)});
      if(!b)state.bosses.push(old);save();document.querySelector('#modal').close();render();};
    document.querySelector('#deleteBossV9')?.addEventListener('click',()=>{if(confirm('Удалить босса?')){state.bosses=state.bosses.filter(x=>x.id!==b.id);save();document.querySelector('#modal').close();render()}});
  }
  function victoryModal(b){const reward=rewardById(b.rewardId);openModal(`<div class="victory-modal"><button class="close victory-close">×</button><div class="victory-sigil">✦</div><div class="v2-kicker">${rankLabel(b.rank==='epic'?'purple':b.rank)} босс повержен</div><h2>ПОБЕДА!</h2><h3>${esc(b.title)}</h3>${b.victoryOutcome?`<div class="victory-modal-outcome"><small>Мир изменился:</small><p>${esc(b.victoryOutcome)}</p></div>`:''}${reward?`<div class="victory-modal-reward"><small>Награда из Сокровищницы</small><b>🎁 ${esc(reward.title)}</b><p>Выдаётся за босса без списания золота или алмазов.</p></div>`:''}<button class="primary victory-confirm" id="confirmVictoryV9">Забрать победу${reward?' и награду':''}</button></div>`);
    document.querySelector('#confirmVictoryV9').onclick=()=>{const date=localISO();b.victoryConfirmed=true;b.victoryDate=date;b.status='defeated';
      const existing=(state.achievements||[]).find(a=>a.bossId===b.id&&a.type==='bossVictory');if(!existing){state.achievements=state.achievements||[];state.achievements.push({id:uid(),date,title:`Победа над боссом: ${b.title}`,tier:b.rank==='gold'?'legendary':'epic',type:'bossVictory',bossId:b.id,note:b.victoryOutcome||'',rewardId:b.rewardId||''})}
      if(reward&&!state.rewardClaims.some(x=>x.bossId===b.id)){state.rewardClaims.push({id:uid(),date,bossId:b.id,rewardId:reward.id,rewardTitle:reward.title,status:'issued'})}
      save();document.querySelector('#modal').close();render();};
  }

  rewardsView=function(){const claims=(state.rewardClaims||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));return `<div class="v2-wrap"><h1 class="v2-title">Сокровищница</h1>${claims.length?`<div class="v2-card claimed-rewards"><div class="v2-kicker">Выдано за победы</div>${claims.map(c=>{const boss=state.bosses.find(b=>b.id===c.bossId);return `<div class="claimed-reward"><span>🏆</span><div><b>${esc(c.rewardTitle)}</b><small>${boss?esc(boss.title):'Босс'} · ${fmt(c.date)}</small></div></div>`}).join('')}</div>`:''}<div class="v2-card"><div class="reward-grid">${state.rewards.map(r=>`<div class="reward"><b>${esc(r.title)}</b><span>${r.price} ${r.currency==='gold'?'🪙':'💎'}</span></div>`).join('')}</div></div></div>`};

  const oldBind=bind;bind=function(){oldBind();
    document.querySelector('#addBossV9')?.addEventListener('click',()=>editBoss());
    document.querySelectorAll('[data-edit-boss-v9]').forEach(btn=>btn.onclick=()=>editBoss(btn.dataset.editBossV9));
    document.querySelectorAll('[data-microtask]').forEach(input=>input.onchange=()=>{const[bid,tid]=input.dataset.microtask.split(':'),b=state.bosses.find(x=>x.id===bid),t=b?.microtasks.find(x=>x.id===tid);if(t){t.done=input.checked;save();render()}});
    document.querySelectorAll('[data-final-v9]').forEach(input=>input.onchange=()=>{const[bid,fid]=input.dataset.finalV9.split(':'),b=state.bosses.find(x=>x.id===bid),t=b?.final.find(x=>x.id===fid);if(t){t.done=input.checked;save();render()}});
    document.querySelectorAll('[data-claim-victory-v9]').forEach(btn=>btn.onclick=()=>{const b=state.bosses.find(x=>x.id===btn.dataset.claimVictoryV9);if(b&&victoryReady(b))victoryModal(b)});
  };
  render();
})();