// RPG Life v37 — checklist drafts count only when complete + Gryzlik rewards
(function(){
  state.practiceChecklistDrafts=state.practiceChecklistDrafts||{};
  state.currencyLedger=state.currencyLedger||[];
  state.wallet=state.wallet||{gold:0,diamonds:0};
  state.gryzliki=state.gryzliki||[];
  const gold37=()=>'<img class="currency-img35 currency-gold35" src="assets/currency-gold.png" alt="золото">';
  const draftKey37=(pid,date)=>`${date}:${pid}`;

  // Old incomplete checklist logs were treated as full completions in v36. Convert them to drafts and revoke any reward.
  function migrateIncomplete37(){
    let changed=false;
    const keep=[];
    (state.practiceLogs||[]).forEach(l=>{
      const p=(state.practices||[]).find(x=>x.id===l.practiceId);
      if(p?.practiceType==='checklist' && (p.checkItems||[]).length && (l.checks||[]).length<(p.checkItems||[]).length){
        state.practiceChecklistDrafts[draftKey37(l.practiceId,l.date)]={checks:[...(l.checks||[])],note:l.note||'',updatedAt:new Date().toISOString()};
        const reward=Math.max(0,Number(l.rewardGoldGranted||0));
        if(reward)state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-reward);
        state.currencyLedger=state.currencyLedger.filter(x=>x.ledgerKey!==`practice:${l.id}` && x.sourceLogId!==l.id);
        changed=true;
      }else keep.push(l);
    });
    if(changed)state.practiceLogs=keep;
    return changed;
  }

  const standardLog37=logPractice;
  logPractice=function(id,logId=null){
    const p=(state.practices||[]).find(x=>x.id===id);
    if(!p||p.practiceType!=='checklist')return standardLog37(id,logId);
    const existing=logId?(state.practiceLogs||[]).find(x=>x.id===logId):null;
    const key=draftKey37(id,selectedDate),draft=!existing?state.practiceChecklistDrafts[key]:null;
    const selected=existing?.checks||draft?.checks||[],note=existing?.note??draft?.note??'';
    const total=(p.checkItems||[]).length;
    openModal(`<div class="modal-head"><div><div class="v2-kicker">${fmt(selectedDate)}</div><h2>${esc(p.name)}</h2><div class="check-status37">${selected.length}/${total} · ${selected.length===total&&total?'выполнено':'ещё не выполнено'}</div>${Number(p.rewardGold||0)?`<div class="practice-log-reward">Награда за полный комплект: ${gold37()} <b>${Number(p.rewardGold)}</b></div>`:''}</div><button class="close">×</button></div><form id="checkPracticeForm37"><fieldset class="option-field checklist-practice36"><legend>Что сделано?</legend><div class="option-grid">${(p.checkItems||[]).map(item=>`<label><input type="checkbox" name="check" value="${esc(item)}" ${selected.includes(item)?'checked':''}><span>${esc(item)}</span></label>`).join('')}</div></fieldset><label>Заметка<input name="note" value="${esc(note)}"></label><div class="check-hint37">Можно сохранить часть. В ритм и награды практика попадёт только при ${total}/${total}.</div><button class="primary">Сохранить</button></form>`);
    document.querySelector('#checkPracticeForm37').onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget),checks=f.getAll('check'),note=String(f.get('note')||''),complete=total>0&&checks.length===total;
      if(!complete){
        // If editing a previously complete log and making it incomplete, revoke completion and turn it into a draft.
        if(existing){
          const reward=Math.max(0,Number(existing.rewardGoldGranted||0));
          if(reward)state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-reward);
          state.currencyLedger=state.currencyLedger.filter(x=>x.ledgerKey!==`practice:${existing.id}`&&x.sourceLogId!==existing.id);
          state.practiceLogs=state.practiceLogs.filter(x=>x.id!==existing.id);
        }
        state.practiceChecklistDrafts[key]={checks,note,updatedAt:new Date().toISOString()};
        save();document.querySelector('#modal').close();render();toast(`Сохранено ${checks.length}/${total} · практика ещё не засчитана`);return;
      }
      delete state.practiceChecklistDrafts[key];
      const data={practiceId:id,date:selectedDate,metrics:{},options:[],checks,note,kcal:0,amount:null};
      if(existing){Object.assign(existing,data)}else{
        const reward=Math.max(0,Math.round(Number(p.rewardGold||0))),row={id:uid(),...data,rewardGoldGranted:reward};
        state.practiceLogs.push(row);
        if(reward){state.wallet.gold=Number(state.wallet.gold||0)+reward;state.currencyLedger.push({id:uid(),ledgerKey:`practice:${row.id}`,date:row.date,at:new Date().toISOString(),kind:'practice',sourceId:id,sourceLogId:row.id,title:`Практика · ${p.name}`,gold:reward,diamonds:0})}
      }
      save();document.querySelector('#modal').close();render();toast(`Готово ${total}/${total} ✦`);
    };
  };

  // Show saved partial checklist progress in practice menus without counting it as completion.
  const menusBefore37=practiceMenus;
  practiceMenus=function(){
    let html=menusBefore37();
    (state.practices||[]).filter(p=>p.practiceType==='checklist').forEach(p=>{
      const d=state.practiceChecklistDrafts[draftKey37(p.id,selectedDate)];if(!d)return;
      const n=(d.checks||[]).length,total=(p.checkItems||[]).length;
      const needle=`<b>${esc(p.name)}</b>`;
      html=html.replace(needle,`${needle}<span class="check-progress37">${n}/${total}</span>`);
    });
    return html;
  };

  function gryzLedger37(g){return `gryzlik:${g.id}`}
  function grantGryz37(g){
    const reward=Math.max(0,Math.round(Number(g.rewardGold||0))),key=gryzLedger37(g);
    if(!reward||state.currencyLedger.some(x=>x.ledgerKey===key))return;
    state.wallet.gold=Number(state.wallet.gold||0)+reward;
    state.currencyLedger.push({id:uid(),ledgerKey:key,date:today(),at:new Date().toISOString(),kind:'gryzlik',sourceId:g.id,title:`Грызлик · ${g.title}`,gold:reward,diamonds:0});
  }
  function revokeGryz37(g){
    const key=gryzLedger37(g),row=state.currencyLedger.find(x=>x.ledgerKey===key);if(!row)return;
    state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-Number(row.gold||0));
    state.currencyLedger=state.currencyLedger.filter(x=>x.ledgerKey!==key);
  }

  function resizePng37(file){return new Promise((resolve,reject)=>{if(!file||file.type!=='image/png')return reject(new Error('Нужен PNG'));const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=256,s=Math.min(1,max/img.width,max/img.height),w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/png'))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)})}
  function gryzPortrait37(g){return g?.imageData?`<img class="gryz-portrait33" src="${g.imageData}" alt="">`:'<div class="gryz-portrait33 empty">?</div>'}
  function editGryz37(id=null){
    const g=id?state.gryzliki.find(x=>x.id===id):null;let imageData=g?.imageData||'';
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Мелкая нечисть</div><h2>${g?'Настроить Грызлика':'Новый Грызлик'}</h2></div><button class="close">×</button></div><form id="gryzForm37"><div class="gryz-image-editor33"><div id="gryzPreview37">${gryzPortrait37(g)}</div><label class="soft file-button23">PNG<input id="gryzImage37" type="file" accept="image/png"></label>${imageData?'<button type="button" class="ghost" id="removeGryzImage37">Убрать</button>':''}</div><label>Что грызёт?<input name="title" required value="${esc(g?.title||'')}" placeholder="Дослать акт"></label><label>Комментарий<input name="note" value="${esc(g?.note||'')}"></label><label>${gold37()} Награда за прибитого Грызлика<input name="rewardGold" type="number" min="0" step="1" value="${Math.max(0,Number(g?.rewardGold||0))}"></label><button class="primary">Сохранить</button></form>`);
    document.querySelector('#gryzImage37').onchange=async e=>{try{imageData=await resizePng37(e.target.files[0]);document.querySelector('#gryzPreview37').innerHTML=`<img class="gryz-portrait33" src="${imageData}" alt="">`}catch{toast('Нужен PNG')}};
    document.querySelector('#removeGryzImage37')?.addEventListener('click',()=>{imageData='';document.querySelector('#gryzPreview37').innerHTML='<div class="gryz-portrait33 empty">?</div>'});
    document.querySelector('#gryzForm37').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=g||{id:uid(),done:false,createdAt:new Date().toISOString()};Object.assign(target,{title:String(f.get('title')||'').trim(),note:String(f.get('note')||'').trim(),imageData,rewardGold:Math.max(0,Math.round(Number(f.get('rewardGold'))||0))});if(!g)state.gryzliki.push(target);save();document.querySelector('#modal').close();render()};
  }

  const battlesBefore37=battlesView;
  battlesView=function(){
    let html=battlesBefore37();
    (state.gryzliki||[]).forEach(g=>{const reward=Math.max(0,Number(g.rewardGold||0));if(!reward)return;const title=`<b>${esc(g.title)}</b>`;html=html.replace(title,`${title}<span class="gryz-reward37">${gold37()} ${reward}</span>`)});
    return html;
  };

  const bindBefore37=bind;
  bind=function(){
    bindBefore37();
    document.querySelectorAll('[data-gryzlik-done32]').forEach(x=>x.onchange=()=>{const g=state.gryzliki.find(v=>v.id===x.dataset.gryzlikDone32);if(!g)return;const was=!!g.done,gonna=!!x.checked;if(!was&&gonna)grantGryz37(g);if(was&&!gonna)revokeGryz37(g);g.done=gonna;g.doneAt=gonna?new Date().toISOString():null;save();render()});
    document.querySelector('#addGryzlik32')?.addEventListener('click',e=>{e.stopImmediatePropagation();editGryz37()},true);
    document.querySelectorAll('[data-gryz-edit33]').forEach(x=>x.addEventListener('click',e=>{e.stopImmediatePropagation();editGryz37(x.dataset.gryzEdit33)},true));
  };

  if(migrateIncomplete37())save();
  render();
})();
