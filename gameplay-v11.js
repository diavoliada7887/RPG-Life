// RPG Life v11 — human-friendly boss editor
(function(){
  const rankLabel=r=>({gray:'Серый',green:'Зелёный',blue:'Синий',purple:'Фиолетовый',gold:'Золотой',epic:'Фиолетовый'})[r]||r||'Без ранга';

  function rowsHTML(stages=[]){
    return (stages||[]).map(s=>progressRow({id:s.id,name:s.name,done:s.done,total:s.total})).join('');
  }
  function progressRow(s={}){
    return `<div class="simple-progress-row" data-stage-id="${s.id||''}">
      <label>Что делаем<input class="sp-name" value="${esc(s.name||'')}" placeholder="Сканирование"></label>
      <label>Сколько надо<input class="sp-total" type="number" min="0" step="1" value="${s.total??''}" placeholder="28888"></label>
      <label>Сколько сделано<input class="sp-done" type="number" min="0" step="1" value="${Number(s.done||0)}" placeholder="2000"></label>
      <button type="button" class="ghost sp-remove" aria-label="Удалить этап">×</button>
    </div>`;
  }
  const lines=a=>(a||[]).map(x=>x.label).join('\n');

  function bossFormSimple(b={}){
    return `<div class="modal-head"><div><div class="v2-kicker">Настройки босса</div><h2>${b.id?'Редактировать':'Добавить босса'}</h2></div><button class="close">×</button></div>
      <form id="bossFormV11">
        <label>Название<input name="title" required value="${esc(b.title||'')}"></label>
        <div class="form-grid">
          <label>Ранг<select name="rank">${['gray','green','blue','purple','gold'].map(r=>`<option value="${r}" ${(b.rank==='epic'?'purple':b.rank)===r?'selected':''}>${rankLabel(r)}</option>`).join('')}</select></label>
          <label>Дедлайн<input name="deadline" type="date" value="${b.deadline||''}"></label>
        </div>
        <div class="form-section"><b>Награда за победу</b><div class="form-grid"><label>Золото<input name="rewardGold" type="number" min="0" step="1" value="${Number(b.rewardGold||0)}"></label><label>Алмазы<input name="rewardDiamonds" type="number" min="0" step="1" value="${Number(b.rewardDiamonds||0)}"></label></div></div>
        <label>Золотой приз <small>необязательно — большая реальная награда себе</small><input name="goldenPrize" value="${esc(b.goldenPrize||'')}"></label>
        <label>Что изменится после победы<textarea name="victoryOutcome" placeholder="Что эта победа реально даст...">${esc(b.victoryOutcome||'')}</textarea></label>

        <div class="simple-progress-editor">
          <div class="simple-section-head"><div><b>Численный прогресс</b><small>Если работу можно посчитать.</small></div><button type="button" class="soft" id="addProgressRow">＋ численный этап</button></div>
          <div id="progressRows">${rowsHTML(b.stages||[])}</div>
          <div class="empty-progress-hint ${(b.stages||[]).length?'hidden':''}" id="emptyProgressHint">Например: Сканирование · надо 28 888 · сделано 2 000</div>
        </div>

        <label>Микрозадачи <small>по одной на строку</small><textarea name="microtasks" placeholder="Поменять обложку\nВыложить пост с новой песней\nОтветить рекламщику">${esc(lines(b.microtasks))}</textarea></label>
        <label>Фаталити <small>последние действия перед кнопкой Победа, тоже по одной на строку</small><textarea name="finals">${esc(lines(b.final))}</textarea></label>
        <label>Заметка<textarea name="note">${esc(b.note||'')}</textarea></label>
        <div class="modal-actions"><button class="primary">Сохранить</button>${b.id?'<button type="button" class="danger-soft" id="deleteBossV11">Удалить босса</button>':''}</div>
      </form>`;
  }

  function makeTasks(text,oldArr){
    const old=new Map((oldArr||[]).map(x=>[x.label,x]));
    return String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(label=>({id:old.get(label)?.id||uid(),label,done:!!old.get(label)?.done}));
  }

  function editBossSimple(id=null){
    const b=id?state.bosses.find(x=>x.id===id):null;
    openModal(bossFormSimple(b||{}));
    const rows=document.querySelector('#progressRows'),hint=document.querySelector('#emptyProgressHint');
    const refreshHint=()=>hint?.classList.toggle('hidden',!!rows?.children.length);
    document.querySelector('#addProgressRow')?.addEventListener('click',()=>{rows.insertAdjacentHTML('beforeend',progressRow());refreshHint();rows.lastElementChild?.querySelector('.sp-name')?.focus()});
    rows?.addEventListener('click',e=>{const btn=e.target.closest('.sp-remove');if(!btn)return;btn.closest('.simple-progress-row')?.remove();refreshHint()});

    document.querySelector('#bossFormV11').onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget),oldBoss=b||{id:uid(),status:'active',victoryConfirmed:false};
      const oldStages=new Map((b?.stages||[]).map(s=>[s.id,s]));
      const stages=[...document.querySelectorAll('.simple-progress-row')].map(row=>{
        const name=row.querySelector('.sp-name').value.trim();
        if(!name)return null;
        const totalRaw=row.querySelector('.sp-total').value.trim();
        const done=Number(row.querySelector('.sp-done').value)||0;
        const id=row.dataset.stageId||uid(),prev=oldStages.get(id);
        return {id,name,done,total:totalRaw===''?null:Number(totalRaw),unit:prev?.unit||'',kind:totalRaw===''?'unknown':'fixed'};
      }).filter(Boolean);
      Object.assign(oldBoss,{
        title:f.get('title'),rank:f.get('rank'),deadline:f.get('deadline')||null,
        rewardGold:Math.max(0,Number(f.get('rewardGold'))||0),rewardDiamonds:Math.max(0,Number(f.get('rewardDiamonds'))||0),
        goldenPrize:f.get('goldenPrize')||'',victoryOutcome:f.get('victoryOutcome')||'',note:f.get('note')||'',stages,
        microtasks:makeTasks(f.get('microtasks'),b?.microtasks),final:makeTasks(f.get('finals'),b?.final)
      });
      if(!b)state.bosses.push(oldBoss);
      save();document.querySelector('#modal').close();render();
    };
    document.querySelector('#deleteBossV11')?.addEventListener('click',()=>{if(confirm('Удалить босса?')){state.bosses=state.bosses.filter(x=>x.id!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  battlesView=function(){return `<div class="v2-wrap"><div class="v2-row battles-title-row"><div><div class="v2-kicker">Арена</div><h1 class="v2-title">Боссы</h1></div><button class="primary" id="addBossV11">＋ Босс</button></div><div class="v2-grid">${state.bosses.map(b=>bossHTML(b)).join('')}</div></div>`};

  const oldBind=bind;
  bind=function(){
    oldBind();
    document.querySelector('#addBossV11')?.addEventListener('click',()=>editBossSimple());
    document.querySelectorAll('[data-edit-boss-v10]').forEach(btn=>btn.onclick=()=>editBossSimple(btn.dataset.editBossV10));
  };
  render();
})();