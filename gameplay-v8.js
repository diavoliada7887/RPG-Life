// RPG Life v8 — deliberate boss victory ritual + calendar trophy mark
(function(){
  const localISO=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};

  // Seed a meaningful post-victory outcome for the newspaper-processing software boss.
  const newspaperBoss=state.bosses.find(b=>b.id==='newspaper-processing-program');
  if(newspaperBoss && !newspaperBoss.victoryOutcome){
    newspaperBoss.victoryOutcome='Минус несколько часов обработки в день; можно смотреть кинчики, пока всё автоматизировано; новый софт в копилку интеллектуальной мощности фирмы.';
  }
  // If an older patch auto-marked a boss defeated just because all fatality boxes were checked,
  // return it to "ready" until the user explicitly presses Victory.
  (state.bosses||[]).forEach(b=>{
    if(b.status==='defeated'&&!b.victoryConfirmed){
      b.status='defeated_pending_fatality';
    }
  });
  save();

  function rankLabelV8(rank){return ({gray:'Серый',green:'Зелёный',blue:'Синий',purple:'Фиолетовый',gold:'Золотой',epic:'Фиолетовый'})[rank]||rank||'Без ранга'}
  function finalReady(b){return (b.final||[]).length>0&&(b.final||[]).every(x=>x.done)}
  function stageReady(b){return (b.stages||[]).every(s=>s.kind==='unknown'||s.total===null||Number(s.done||0)>=Number(s.total||0))}
  function victoryReady(b){return finalReady(b)&&stageReady(b)&&!b.victoryConfirmed}

  function bossCardV8(b){
    const rank=b.rank==='epic'?'purple':b.rank;
    const status=b.victoryConfirmed?'🏆 Побеждён':victoryReady(b)?'✦ Всё готово к победе':b.status==='defeated_pending_fatality'?'☠ Осталось фаталити':b.deadline?`⚔ ${bossThreat(b)}`:'⚔ Активен';
    const stages=(b.stages||[]).map(s=>{
      if(s.kind==='unknown') return `<div class="stage"><div class="unknown"><b>🌫 ${esc(s.name)}</b><div class="v2-sub">Объём пока неизвестен · сделано ${Number(s.done||0).toLocaleString('ru-RU')} ${esc(s.unit||'')}</div></div></div>`;
      const total=Number(s.total||0),done=Number(s.done||0);
      return `<div class="stage"><div class="stage-line"><b>${esc(s.name)}</b><span>${done.toLocaleString('ru-RU')} / ${total.toLocaleString('ru-RU')} ${esc(s.unit||'')}</span></div><div class="bar"><i style="width:${pct(done,total)}%"></i></div></div>`;
    }).join('');
    const finals=(b.final||[]).length?`<div class="stage"><div class="v2-kicker">Фаталити</div><div class="final-list">${b.final.map(x=>`<label><input type="checkbox" data-final="${b.id}:${x.id}" ${x.done?'checked':''} ${b.victoryConfirmed?'disabled':''}> ${esc(x.label)}</label>`).join('')}</div></div>`:'';
    const outcome=b.victoryOutcome?`<div class="victory-outcome"><div class="v2-kicker">Что изменится после победы</div><p>${esc(b.victoryOutcome)}</p></div>`:'';
    const action=b.victoryConfirmed
      ? `<div class="boss-victory boss-victory-confirmed"><span>✦</span><b>ПОБЕДА!</b><small>${b.victoryDate?fmt(b.victoryDate):''}</small></div>`
      : victoryReady(b)
        ? `<button class="boss-victory-button" data-claim-victory="${b.id}"><span>✦</span><b>ПОБЕДА!</b><small>Нажать и зафиксировать</small></button>`
        : `<div class="victory-locked"><span>⚔</span><small>Кнопка Победы откроется, когда босс будет добит.</small></div>`;
    return `<article class="v2-card v2-span-12 boss-card ${rank||''}">
      <div class="boss-head"><div><div class="v2-kicker">${rankLabelV8(rank)} босс</div><h2 class="v2-title">${esc(b.title)}</h2>${b.note?`<div class="v2-sub">${esc(b.note)}</div>`:''}</div><div class="boss-actions"><span class="rank">${esc(rankLabelV8(rank))}</span><button class="soft" data-edit-boss="${b.id}">⚙</button></div></div>
      <div class="boss-meta">${b.deadline?`<span>☠ ${fmt(b.deadline)}</span>`:''}<span>${status}</span>${b.reward?`<span>🎁 ${esc(b.reward)}</span>`:''}</div>
      ${stages}${finals}${outcome}${action}
    </article>`;
  }
  bossHTML=bossCardV8;
  battlesView=function(){return `<div class="v2-wrap"><div class="v2-row battles-title-row"><div><div class="v2-kicker">Арена</div><h1 class="v2-title">Боссы</h1></div><button class="primary" id="addBoss">＋ Босс</button></div><div class="v2-grid">${state.bosses.map(b=>bossCardV8(b)).join('')}</div></div>`};

  function bossFormV8(b={}){
    const stages=(b.stages||[]).map(s=>`${s.name}|${s.done??0}|${s.total??''}|${s.unit||''}${s.kind==='unknown'?'|unknown':''}`).join('\n');
    const finals=(b.final||[]).map(x=>x.label).join('; ');
    return `<div class="modal-head"><div><div class="v2-kicker">Настройки босса</div><h2>${b.id?'Редактировать':'Добавить босса'}</h2></div><button class="close">×</button></div><form id="bossFormV8">
      <label>Название<input name="title" required value="${esc(b.title||'')}"></label>
      <div class="form-grid"><label>Ранг<select name="rank">${['gray','green','blue','purple','gold'].map(r=>`<option value="${r}" ${(b.rank==='epic'?'purple':b.rank)===r?'selected':''}>${rankLabelV8(r)}</option>`).join('')}</select></label><label>Дедлайн<input name="deadline" type="date" value="${b.deadline||''}"></label></div>
      <label>Награда себе<input name="reward" value="${esc(b.reward||'')}" placeholder="например видеокарта / гитара / поездка"></label>
      <label>Что изменится после победы<textarea name="victoryOutcome" placeholder="Что эта победа реально даст жизни, работе, свободе, возможностям...">${esc(b.victoryOutcome||'')}</textarea></label>
      <label>Этапы <small>каждая строка: название | сделано | всего | единица; для неизвестного объёма добавь | unknown</small><textarea name="stages">${esc(stages)}</textarea></label>
      <label>Фаталити <small>задачи через ;</small><textarea name="finals">${esc(finals)}</textarea></label>
      <label>Заметка<textarea name="note">${esc(b.note||'')}</textarea></label>
      <div class="modal-actions"><button class="primary">Сохранить</button>${b.id?`<button type="button" class="danger-soft" id="deleteBossV8">Удалить босса</button>`:''}</div>
    </form>`;
  }
  function editBossV8(id=null){
    const b=id?state.bosses.find(x=>x.id===id):null;
    openModal(bossFormV8(b||{}));
    document.querySelector('#bossFormV8').onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.currentTarget),old=b||{id:uid(),status:'active',victoryConfirmed:false};
      const oldStages=new Map((b?.stages||[]).map(s=>[s.name,s]));
      const stages=String(f.get('stages')||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const [name,done,total,unit,kind]=line.split('|').map(x=>x.trim()),prev=oldStages.get(name);return {id:prev?.id||uid(),name,done:Number(done)||0,total:kind==='unknown'||!total?null:Number(total),unit:unit||'',kind:kind==='unknown'?'unknown':'fixed'}});
      const oldFinal=new Map((b?.final||[]).map(x=>[x.label,x]));
      const final=String(f.get('finals')||'').split(';').map(x=>x.trim()).filter(Boolean).map(label=>({id:oldFinal.get(label)?.id||uid(),label,done:!!oldFinal.get(label)?.done}));
      Object.assign(old,{title:f.get('title'),rank:f.get('rank'),deadline:f.get('deadline')||null,reward:f.get('reward')||'',victoryOutcome:f.get('victoryOutcome')||'',note:f.get('note')||'',stages,final});
      if(!b)state.bosses.push(old);save();document.querySelector('#modal').close();render();
    };
    document.querySelector('#deleteBossV8')?.addEventListener('click',()=>{if(confirm('Удалить босса?')){state.bosses=state.bosses.filter(x=>x.id!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  function victoryModal(b){
    openModal(`<div class="victory-modal"><button class="close victory-close">×</button><div class="victory-sigil">✦</div><div class="v2-kicker">${rankLabelV8(b.rank==='epic'?'purple':b.rank)} босс повержен</div><h2>ПОБЕДА!</h2><h3>${esc(b.title)}</h3>${b.victoryOutcome?`<div class="victory-modal-outcome"><small>После этой победы:</small><p>${esc(b.victoryOutcome)}</p></div>`:''}${b.reward?`<div class="victory-modal-reward">🎁 ${esc(b.reward)}</div>`:''}<button class="primary victory-confirm" id="confirmVictory">Зафиксировать победу</button></div>`);
    document.querySelector('#confirmVictory').onclick=()=>{
      const date=localISO();
      b.victoryConfirmed=true;b.victoryDate=date;b.status='defeated';
      const existing=(state.achievements||[]).find(a=>a.bossId===b.id&&a.type==='bossVictory');
      if(!existing){state.achievements=state.achievements||[];state.achievements.push({id:uid(),date,title:`Победа над боссом: ${b.title}`,tier:b.rank==='gold'?'legendary':'epic',type:'bossVictory',bossId:b.id,note:b.victoryOutcome||''})}
      save();document.querySelector('#modal').close();render();
    };
  }

  // Calendar: boss victories get their own unmistakable frame.
  monthHTML=function(year,month){
    const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7,names=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    let cells='<div class="month-weekdays">'+names.map(x=>`<small>${x}</small>`).join('')+'</div><div class="month-days">'+Array.from({length:offset},()=>'<span></span>').join('');
    for(let d=1;d<=days;d++){
      const date=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        achievements=(state.achievements||[]).filter(a=>a.date===date),
        bossWin=achievements.find(a=>a.type==='bossVictory'),
        tier=achievements.find(a=>a.tier)?.tier||'',n=logsForDate(date).length+creativeForDate(date).length;
      cells+=`<button data-calendar-date="${date}" class="calendar-day ${tier} ${bossWin?'boss-win-day':''} ${date===selectedDate?'selected':''}" ${bossWin?`title="${esc(bossWin.title)}"`:''}><b>${d}</b>${bossWin?'<strong class="boss-win-mark">⚔</strong>':''}${n?`<i>${n}</i>`:''}</button>`;
    }
    return `<article class="month-card"><h3>${new Intl.DateTimeFormat('ru-RU',{month:'long'}).format(first)}</h3>${cells}</div></article>`;
  };
  memoryView=function(){return `<div class="v2-wrap"><h1 class="v2-title">Память персонажа</h1><div class="v2-card">${(state.achievements||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>`<div class="legendary-note ${a.type==='bossVictory'?'boss-memory':''}"><b>${a.type==='bossVictory'?'⚔ ':''}${fmt(a.date)} · ${esc(a.title)}</b>${a.note?`<small>${esc(a.note)}</small>`:''}</div>`).join('')}</div></div>`};

  const oldBindV8=bind;
  bind=function(){
    oldBindV8();
    // Replace fatality inputs to remove the old v7 listener that auto-won the boss.
    document.querySelectorAll('[data-final]').forEach(input=>{
      const clone=input.cloneNode(true);input.replaceWith(clone);
      clone.addEventListener('change',()=>{
        const [bid,fid]=clone.dataset.final.split(':'),b=state.bosses.find(x=>x.id===bid),f=b?.final.find(x=>x.id===fid);if(!f)return;
        f.done=clone.checked;
        if(!b.victoryConfirmed)b.status=finalReady(b)?'defeated_pending_fatality':'active';
        save();render();
      });
    });
    document.querySelector('#addBoss')?.addEventListener('click',()=>editBossV8());
    document.querySelectorAll('[data-edit-boss]').forEach(btn=>btn.onclick=()=>editBossV8(btn.dataset.editBoss));
    document.querySelectorAll('[data-claim-victory]').forEach(btn=>btn.onclick=()=>{const b=state.bosses.find(x=>x.id===btn.dataset.claimVictory);if(b&&victoryReady(b))victoryModal(b)});
  };
  render();
})();