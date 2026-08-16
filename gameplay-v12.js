// RPG Life v12 — boss portraits + Second Coming
(function(){
  const localISO=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
  const rankLabel=r=>({gray:'Серый',green:'Зелёный',blue:'Синий',purple:'Фиолетовый',gold:'Золотой',epic:'Фиолетовый'})[r]||r||'Без ранга';
  const rankOrder=['gray','green','blue','purple','gold'];
  const lowerRank=r=>{r=r==='epic'?'purple':r;const i=rankOrder.indexOf(r);return i>0?rankOrder[i-1]:'gray'};
  const coin=()=>'<span class="currency-icon coin-icon">G</span>';
  const gem=()=>'<span class="currency-icon diamond-icon">D</span>';

  // Migrate old multiline tasks that were accidentally stored as one item.
  (state.bosses||[]).forEach(b=>{
    b.run=Number(b.run||1);b.victoryHistory=b.victoryHistory||[];b.microtasks=b.microtasks||[];b.final=b.final||[];
    const splitTasks=arr=>(arr||[]).flatMap(x=>String(x.label||'').split(/\n+/).map(s=>s.trim()).filter(Boolean).map(label=>({id:label===x.label?x.id:uid(),label,done:!!x.done})));
    b.microtasks=splitTasks(b.microtasks);b.final=splitTasks(b.final);
    if(b.victoryConfirmed&&b.victoryDate&&!b.victoryHistory.some(v=>v.run===b.run)) b.victoryHistory.push({run:b.run,date:b.victoryDate,rank:b.rank,rewardGold:Number(b.rewardGold||0),rewardDiamonds:Number(b.rewardDiamonds||0),goldenPrize:b.goldenPrize||'',outcome:b.victoryOutcome||''});
  });
  save();

  const numericReady=b=>(b.stages||[]).every(s=>s.total===null||Number(s.done||0)>=Number(s.total||0));
  const tasksReady=a=>!(a||[]).length||(a||[]).every(x=>x.done);
  const hasWork=b=>(b.stages||[]).length||(b.microtasks||[]).length||(b.final||[]).length;
  const victoryReady=b=>!!hasWork(b)&&numericReady(b)&&tasksReady(b.microtasks)&&tasksReady(b.final)&&!b.victoryConfirmed;
  const roman=n=>['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n]||String(n);

  function portrait(b){return b.imageData?`<img class="boss-portrait" src="${b.imageData}" alt="">`:`<div class="boss-portrait boss-portrait-empty">⚔</div>`}
  function numericHTML(b){if(!(b.stages||[]).length)return'';return `<div class="boss-section"><div class="v2-kicker">Численный прогресс</div>${b.stages.map(s=>{const done=Number(s.done||0);if(s.total===null)return `<div class="numeric-stage"><div class="stage-line"><b>${esc(s.name)}</b><span>${done.toLocaleString('ru-RU')}</span></div><input type="number" min="0" value="${done}" data-stage-v12="${b.id}:${s.id}"></div>`;const total=Number(s.total||0);return `<div class="numeric-stage"><div class="stage-line"><b>${esc(s.name)}</b><span>${done.toLocaleString('ru-RU')} / ${total.toLocaleString('ru-RU')}</span></div><div class="bar"><i style="width:${pct(done,total)}%"></i></div><input type="number" min="0" max="${total}" value="${done}" data-stage-v12="${b.id}:${s.id}"></div>`}).join('')}</div>`}
  function checks(title,arr,attr,b){if(!(arr||[]).length)return'';return `<div class="boss-section"><div class="v2-kicker">${title}</div><div class="microtask-list">${arr.map(x=>`<label><input type="checkbox" ${attr}="${b.id}:${x.id}" ${x.done?'checked':''} ${b.victoryConfirmed?'disabled':''}><span>${esc(x.label)}</span></label>`).join('')}</div></div>`}
  function bossCard(b){
    const rank=b.rank==='epic'?'purple':b.rank,rew=[];if(Number(b.rewardGold||0))rew.push(`${coin()} <b>${Number(b.rewardGold)}</b>`);if(Number(b.rewardDiamonds||0))rew.push(`${gem()} <b>${Number(b.rewardDiamonds)}</b>`);
    const status=b.victoryConfirmed?'Побеждён':victoryReady(b)?'Всё готово к победе':b.deadline?bossThreat(b):'Активен';
    return `<article class="v2-card v2-span-12 boss-card ${rank||''}">
      <div class="boss-title-line">${portrait(b)}<div class="boss-title-copy"><div class="v2-kicker">${rankLabel(rank)} босс${b.run>1?` · Пришествие ${roman(b.run)}`:''}</div><h2 class="v2-title">${esc(b.title)}</h2>${b.note?`<div class="v2-sub">${esc(b.note)}</div>`:''}</div><div class="boss-actions"><button class="soft" data-edit-v12="${b.id}">⚙</button></div></div>
      <div class="boss-meta">${b.deadline?`<span>Дедлайн ${fmt(b.deadline)}</span>`:''}<span>${esc(status)}</span>${rew.length?`<span class="boss-reward-mini">${rew.join(' ')}</span>`:''}</div>
      ${numericHTML(b)}${checks('Микрозадачи',b.microtasks,'data-micro-v12',b)}${checks('Фаталити',b.final,'data-final-v12',b)}
      ${b.victoryOutcome?`<div class="victory-outcome"><div class="v2-kicker">После победы</div><p>${esc(b.victoryOutcome)}</p></div>`:''}
      ${b.goldenPrize?`<div class="golden-prize"><div class="v2-kicker">Золотой приз</div><b>★ ${esc(b.goldenPrize)}</b></div>`:''}
      ${b.victoryConfirmed?`<div class="boss-after-victory"><div class="boss-victory boss-victory-confirmed"><span>✦</span><b>ПОБЕДА!</b><small>${fmt(b.victoryDate)}</small></div><button class="second-coming" data-second-coming="${b.id}">↻ 2 ПРИШЕСТВИЕ</button></div>`:victoryReady(b)?`<button class="boss-victory-button" data-win-v12="${b.id}"><span>✦</span><b>ПОБЕДА!</b><small>Получить награду</small></button>`:`<div class="victory-locked"><small>Победа откроется, когда обязательная работа будет закрыта.</small></div>`}
    </article>`;
  }
  bossHTML=bossCard;
  battlesView=function(){return `<div class="v2-wrap"><div class="v2-row battles-title-row"><div><div class="v2-kicker">Арена</div><h1 class="v2-title">Боссы</h1></div><button class="primary" id="addBossV12">＋ Босс</button></div><div class="v2-grid">${state.bosses.map(b=>bossCard(b)).join('')}</div></div>`};

  function progressRow(s={}){return `<div class="simple-progress-row" data-stage-id="${s.id||''}"><label>Что делаем<input class="sp-name" value="${esc(s.name||'')}"></label><label>Сколько надо<input class="sp-total" type="number" min="0" value="${s.total??''}"></label><label>Сколько сделано<input class="sp-done" type="number" min="0" value="${Number(s.done||0)}"></label><button type="button" class="ghost sp-remove">×</button></div>`}
  const taskLines=a=>(a||[]).map(x=>x.label).join('\n');
  function makeTasks(text,oldArr){const old=new Map((oldArr||[]).map(x=>[x.label,x]));return String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(label=>({id:old.get(label)?.id||uid(),label,done:!!old.get(label)?.done}))}

  function editorHTML(b={},second=false){
    const rank=second?lowerRank(b.rank):b.rank;
    const stages=second?[]:(b.stages||[]),micro=second?[]:(b.microtasks||[]),finals=second?[]:(b.final||[]);
    return `<div class="modal-head"><div><div class="v2-kicker">${second?'2 пришествие':'Настройки босса'}</div><h2>${second?esc(b.title):(b.id?'Редактировать':'Добавить босса')}</h2></div><button class="close">×</button></div><form id="bossFormV12">
      ${second?'<div class="second-coming-note">Первая победа остаётся в истории. Здесь настраивается новая, ослабленная или просто надоедливая версия босса 😈</div>':''}
      <label>Название<input name="title" required value="${esc(b.title||'')}"></label>
      <div class="boss-image-editor"><div id="bossImagePreview">${b.imageData?`<img src="${b.imageData}" alt="">`:'<span>PNG</span>'}</div><label>Картинка босса <small>PNG, будет автоматически уменьшена</small><input id="bossImageInput" type="file" accept="image/png"></label><button type="button" class="ghost" id="removeBossImage">Убрать</button></div>
      <div class="form-grid"><label>Ранг<select name="rank">${rankOrder.map(r=>`<option value="${r}" ${(rank==='epic'?'purple':rank)===r?'selected':''}>${rankLabel(r)}</option>`).join('')}</select></label><label>Дедлайн<input name="deadline" type="date" value="${second?'':(b.deadline||'')}"></label></div>
      <div class="form-section"><b>Награда за победу</b><div class="form-grid"><label>Золото<input name="rewardGold" type="number" min="0" value="${second?0:Number(b.rewardGold||0)}"></label><label>Алмазы<input name="rewardDiamonds" type="number" min="0" value="${second?0:Number(b.rewardDiamonds||0)}"></label></div></div>
      <label>Золотой приз <small>необязательно</small><input name="goldenPrize" value="${second?'':esc(b.goldenPrize||'')}"></label>
      <label>Что изменится после победы<textarea name="victoryOutcome">${second?'':esc(b.victoryOutcome||'')}</textarea></label>
      <div class="simple-progress-editor"><div class="simple-section-head"><div><b>Численный прогресс</b><small>Если работу можно посчитать.</small></div><button type="button" class="soft" id="addProgressV12">＋ численный этап</button></div><div id="progressRowsV12">${stages.map(progressRow).join('')}</div></div>
      <label>Микрозадачи <small>по одной на строку</small><textarea name="microtasks">${esc(taskLines(micro))}</textarea></label>
      <label>Фаталити <small>по одной на строку</small><textarea name="finals">${esc(taskLines(finals))}</textarea></label>
      <label>Заметка<textarea name="note">${second?'':esc(b.note||'')}</textarea></label>
      <div class="modal-actions"><button class="primary">${second?'ВОЗВРАТИТЬ ЭТУ СВОЛОЧЬ':'Сохранить'}</button>${b.id&&!second?'<button type="button" class="danger-soft" id="deleteBossV12">Удалить босса</button>':''}</div>
    </form>`;
  }

  function resizePng(file){return new Promise((resolve,reject)=>{if(!file||file.type!=='image/png')return reject(new Error('Нужен PNG'));const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=96,scale=Math.min(1,max/img.width,max/img.height),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/png'))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)});}

  function openEditor(id=null,second=false){
    const b=id?state.bosses.find(x=>x.id===id):null,base=b||{};openModal(editorHTML(base,second));let imageData=base.imageData||'';
    const rows=document.querySelector('#progressRowsV12');document.querySelector('#addProgressV12')?.addEventListener('click',()=>{rows.insertAdjacentHTML('beforeend',progressRow());rows.lastElementChild.querySelector('.sp-name').focus()});rows?.addEventListener('click',e=>{const x=e.target.closest('.sp-remove');if(x)x.closest('.simple-progress-row').remove()});
    document.querySelector('#bossImageInput')?.addEventListener('change',async e=>{try{imageData=await resizePng(e.target.files[0]);document.querySelector('#bossImagePreview').innerHTML=`<img src="${imageData}" alt="">`}catch{toast('Нужен небольшой PNG')}});
    document.querySelector('#removeBossImage')?.addEventListener('click',()=>{imageData='';document.querySelector('#bossImagePreview').innerHTML='<span>PNG</span>'});
    document.querySelector('#bossFormV12').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=b||{id:uid(),run:1,victoryHistory:[]};
      if(second){if(target.victoryConfirmed&&target.victoryDate&&!target.victoryHistory.some(v=>v.run===target.run))target.victoryHistory.push({run:target.run,date:target.victoryDate,rank:target.rank,rewardGold:Number(target.rewardGold||0),rewardDiamonds:Number(target.rewardDiamonds||0),goldenPrize:target.goldenPrize||'',outcome:target.victoryOutcome||''});target.run=Number(target.run||1)+1;target.victoryConfirmed=false;target.victoryRewardClaimed=false;target.victoryDate=null;target.status='active';}
      const oldStages=new Map((second?[]:(b?.stages||[])).map(s=>[s.id,s]));const stages=[...document.querySelectorAll('.simple-progress-row')].map(r=>{const name=r.querySelector('.sp-name').value.trim();if(!name)return null;const totalRaw=r.querySelector('.sp-total').value.trim(),id=r.dataset.stageId||uid(),prev=oldStages.get(id);return{id,name,total:totalRaw===''?null:Number(totalRaw),done:Number(r.querySelector('.sp-done').value)||0,unit:prev?.unit||'',kind:totalRaw===''?'unknown':'fixed'}}).filter(Boolean);
      Object.assign(target,{title:f.get('title'),imageData,rank:f.get('rank'),deadline:f.get('deadline')||null,rewardGold:Math.max(0,Number(f.get('rewardGold'))||0),rewardDiamonds:Math.max(0,Number(f.get('rewardDiamonds'))||0),goldenPrize:f.get('goldenPrize')||'',victoryOutcome:f.get('victoryOutcome')||'',note:f.get('note')||'',stages,microtasks:makeTasks(f.get('microtasks'),second?[]:b?.microtasks),final:makeTasks(f.get('finals'),second?[]:b?.final)});if(!b)state.bosses.push(target);save();document.querySelector('#modal').close();render();};
    document.querySelector('#deleteBossV12')?.addEventListener('click',()=>{if(confirm('Удалить босса?')){state.bosses=state.bosses.filter(x=>x.id!==b.id);save();document.querySelector('#modal').close();render()}});
  }

  function win(b){const g=Number(b.rewardGold||0),d=Number(b.rewardDiamonds||0);openModal(`<div class="victory-modal"><button class="close">×</button><div class="victory-sigil">✦</div><div class="v2-kicker">Пришествие ${roman(b.run)} завершено</div><h2>ПОБЕДА!</h2><h3>${esc(b.title)}</h3>${b.victoryOutcome?`<div class="victory-modal-outcome"><p>${esc(b.victoryOutcome)}</p></div>`:''}<div class="victory-currency"><span>${coin()}<b>+${g}</b><small>золото</small></span><span>${gem()}<b>+${d}</b><small>алмазы</small></span></div>${b.goldenPrize?`<div class="victory-golden-prize"><small>Золотой приз</small><b>★ ${esc(b.goldenPrize)}</b></div>`:''}<button class="primary" id="confirmWinV12">Зафиксировать победу</button></div>`);document.querySelector('#confirmWinV12').onclick=()=>{const date=localISO();if(!b.victoryRewardClaimed){state.wallet.gold=Number(state.wallet.gold||0)+g;state.wallet.diamonds=Number(state.wallet.diamonds||0)+d;b.victoryRewardClaimed=true}b.victoryConfirmed=true;b.victoryDate=date;b.status='defeated';b.victoryHistory=b.victoryHistory||[];b.victoryHistory.push({run:b.run,date,rank:b.rank,rewardGold:g,rewardDiamonds:d,goldenPrize:b.goldenPrize||'',outcome:b.victoryOutcome||''});state.achievements=state.achievements||[];state.achievements.push({id:uid(),date,title:`Победа над боссом: ${b.title} · ${roman(b.run)}`,tier:b.rank==='gold'?'legendary':'epic',type:'bossVictory',bossId:b.id,bossRun:b.run,note:b.victoryOutcome||''});save();document.querySelector('#modal').close();render()};}

  const oldBind=bind;bind=function(){oldBind();document.querySelector('#addBossV12')?.addEventListener('click',()=>openEditor());document.querySelectorAll('[data-edit-v12]').forEach(x=>x.onclick=()=>openEditor(x.dataset.editV12));document.querySelectorAll('[data-second-coming]').forEach(x=>x.onclick=()=>openEditor(x.dataset.secondComing,true));document.querySelectorAll('[data-win-v12]').forEach(x=>x.onclick=()=>{const b=state.bosses.find(y=>y.id===x.dataset.winV12);if(b&&victoryReady(b))win(b)});document.querySelectorAll('[data-micro-v12]').forEach(x=>x.onchange=()=>{const[bid,id]=x.dataset.microV12.split(':'),b=state.bosses.find(y=>y.id===bid),t=b?.microtasks.find(y=>y.id===id);if(t){t.done=x.checked;save();render()}});document.querySelectorAll('[data-final-v12]').forEach(x=>x.onchange=()=>{const[bid,id]=x.dataset.finalV12.split(':'),b=state.bosses.find(y=>y.id===bid),t=b?.final.find(y=>y.id===id);if(t){t.done=x.checked;save();render()}});document.querySelectorAll('[data-stage-v12]').forEach(x=>x.onchange=()=>{const[bid,id]=x.dataset.stageV12.split(':'),b=state.bosses.find(y=>y.id===bid),s=b?.stages.find(y=>y.id===id);if(s){s.done=Math.max(0,Number(x.value)||0);save();render()}})};
  render();
})();