// RPG Life v33 — Gryzlik PNG portraits + true award deletion + currency icons everywhere
(function(){
  state.currencyLedger=state.currencyLedger||[];
  state.currencyDeletedKeys=state.currencyDeletedKeys||[];
  state.gryzliki=state.gryzliki||[];
  state.wallet=state.wallet||{gold:0,diamonds:0};

  const coin33=()=>'<span class="currency-symbol32 gold32" aria-label="золото"></span>';
  const gem33=()=>'<span class="currency-symbol32 diamond32" aria-label="алмазы"></span>';

  function patchCurrencyHtml33(html){
    return String(html||'')
      .replace(/<span class="currency-symbol32 gold32"[^>]*>[\s\S]*?<\/span>/g,coin33())
      .replace(/<span class="currency-symbol32 diamond32"[^>]*>[\s\S]*?<\/span>/g,gem33())
      .replace(/<span class="currency-icon coin-icon"[^>]*>G<\/span>/g,coin33())
      .replace(/<span class="currency-icon diamond-icon"[^>]*>D<\/span>/g,gem33())
      .replace(/<strong class="ledger-gold26">([+-]?\d+) G<\/strong>/g,`<strong class="ledger-gold26 currency-ledger-value33">${coin33()} <span>$1</span></strong>`)
      .replace(/<strong class="ledger-diamond26">([+-]?\d+) D<\/strong>/g,`<strong class="ledger-diamond26 currency-ledger-value33">${gem33()} <span>$1</span></strong>`);
  }

  const todayBefore33=todayView;
  todayView=function(){return patchCurrencyHtml33(todayBefore33())};

  function deleted33(key){return key&&state.currencyDeletedKeys.includes(key)}
  function ledgerRows33(){return [...state.currencyLedger].filter(x=>!deleted33(x.ledgerKey)).sort((a,b)=>String(b.at||b.date||'').localeCompare(String(a.at||a.date||''))).slice(0,80)}
  function awardValues33(x){return `${Number(x.gold||0)?`${coin33()} <b>${Number(x.gold)>0?'+':''}${Number(x.gold)}</b>`:''}${Number(x.diamonds||0)?`${gem33()} <b>${Number(x.diamonds)>0?'+':''}${Number(x.diamonds)}</b>`:''}`}
  function currencyHistory33(){const rows=ledgerRows33();return `<div class="ledger32">${rows.map(x=>`<div class="ledger-row32"><span><b>${esc(x.title||'Начисление')}</b><small>${x.date?fmt(x.date):''}${x.note?` · ${esc(x.note)}`:''}</small></span><span class="ledger-actions33"><span class="ledger-values32">${awardValues33(x)}</span><button class="ledger-delete33" data-delete-ledger33="${x.id}" title="Удалить начисление">×</button></span></div>`).join('')||'<div class="v2-sub">История пока пуста.</div>'}</div>`}

  function deleteLedger33(id){
    const x=state.currencyLedger.find(r=>r.id===id);if(!x)return;
    const gold=Number(x.gold||0),diamonds=Number(x.diamonds||0);
    if(!confirm(`Удалить начисление${gold?` ${gold>0?'+':''}${gold} золота`:''}${diamonds?` ${diamonds>0?'+':''}${diamonds} алмазов`:''}? Баланс изменится обратно.`))return;
    state.wallet.gold=Math.max(0,Number(state.wallet.gold||0)-gold);
    state.wallet.diamonds=Math.max(0,Number(state.wallet.diamonds||0)-diamonds);
    if(x.ledgerKey&&!state.currencyDeletedKeys.includes(x.ledgerKey))state.currencyDeletedKeys.push(x.ledgerKey);
    if(x.kind==='practice'){
      const log=(state.practiceLogs||[]).find(l=>`practice:${l.id}`===x.ledgerKey || l.id===x.sourceLogId);
      if(log)log.rewardGoldGranted=0;
    }
    if(x.kind==='buff'){
      const claim=(state.buffClaims||[]).find(c=>`claim:${c.id}`===x.ledgerKey || c.id===x.claimId);
      if(claim)claim.voided=true;
    }
    state.currencyLedger=state.currencyLedger.filter(r=>r.id!==id);
    save();render();
  }

  rewardsView=function(){return `<div class="v2-wrap"><div class="v2-row"><div><div class="v2-kicker">Сокровищница</div><h1 class="v2-title">Награды</h1></div></div><section class="treasury-wallet treasury-wallet32"><div><h2>На руках</h2></div><div class="treasury-wallet-values"><div>${coin33()}<span><b>${Number(state.wallet.gold||0).toLocaleString('ru-RU')}</b><small>золото</small></span></div><div>${gem33()}<span><b>${Number(state.wallet.diamonds||0).toLocaleString('ru-RU')}</b><small>алмазы</small></span></div></div></section><div class="v2-card"><div class="reward-grid">${(state.rewards||[]).map(r=>`<div class="reward"><b>${esc(r.title)}</b><span>${r.currency==='gold'?coin33():gem33()} ${Number(r.price||0)}</span></div>`).join('')}</div></div><article class="v2-card ledger-card32"><div class="v2-row"><div><div class="v2-kicker">Экономика</div><h3 class="v2-title">История начислений</h3><div class="v2-sub">Ошибочное начисление можно удалить целиком — баланс откатится автоматически.</div></div></div>${currencyHistory33()}</article></div>`};

  function resizePng33(file){return new Promise((resolve,reject)=>{if(!file||file.type!=='image/png')return reject(new Error('Нужен PNG'));const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=256,s=Math.min(1,max/img.width,max/img.height),w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/png'))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)})}
  function gryzPortrait33(g){return g.imageData?`<img class="gryz-portrait33" src="${g.imageData}" alt="">`:'<div class="gryz-portrait33 empty">?</div>'}
  function gryzlikCard33(g){return `<div class="gryzlik32 gryzlik33 ${g.done?'done':''}">${gryzPortrait33(g)}<label><input type="checkbox" data-gryzlik-done32="${g.id}" ${g.done?'checked':''}><span><b>${esc(g.title)}</b>${g.note?`<small>${esc(g.note)}</small>`:''}</span></label><button class="gryz-edit33" data-gryz-edit33="${g.id}" title="Изменить">✎</button><button data-gryzlik-del32="${g.id}">×</button></div>`}
  function editGryzlik33(id=null){const g=id?state.gryzliki.find(x=>x.id===id):null;let imageData=g?.imageData||'';openModal(`<div class="modal-head"><div><div class="v2-kicker">Мелкая нечисть</div><h2>${g?'Поймать Грызлика за хвост':'Новый Грызлик'}</h2></div><button class="close">×</button></div><form id="gryzlikForm33"><div class="gryz-image-editor33"><div id="gryzPreview33">${gryzPortrait33(g||{})}</div><label class="soft file-button23">PNG<input id="gryzImage33" type="file" accept="image/png"></label>${imageData?'<button type="button" class="ghost" id="removeGryzImage33">Убрать</button>':''}</div><label>Что грызёт?<input name="title" required value="${esc(g?.title||'')}" placeholder="Дослать акт"></label><label>Комментарий<input name="note" value="${esc(g?.note||'')}" placeholder="неприятно, но на 20 минут"></label><button class="primary">${g?'Сохранить Грызлика':'Выпустить Грызлика'}</button></form>`);document.querySelector('#gryzImage33').onchange=async e=>{try{imageData=await resizePng33(e.target.files[0]);document.querySelector('#gryzPreview33').innerHTML=`<img class="gryz-portrait33" src="${imageData}" alt="">`}catch{toast('Нужен PNG')}};document.querySelector('#removeGryzImage33')?.addEventListener('click',()=>{imageData='';document.querySelector('#gryzPreview33').innerHTML='<div class="gryz-portrait33 empty">?</div>'});document.querySelector('#gryzlikForm33').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=g||{id:uid(),done:false,createdAt:new Date().toISOString()};Object.assign(target,{title:String(f.get('title')||'').trim(),note:String(f.get('note')||'').trim(),imageData});if(!g)state.gryzliki.push(target);save();document.querySelector('#modal').close();render()}}

  const battlesBefore33=battlesView;
  battlesView=function(){let html=battlesBefore33();(state.gryzliki||[]).forEach(g=>{const old=new RegExp(`<div class=\\"gryzlik32 ${g.done?'done':''}\\"[\\s\\S]*?data-gryzlik-del32=\\"${g.id}\\"[\\s\\S]*?<\\/div>`);if(old.test(html))html=html.replace(old,gryzlikCard33(g))});return html};

  const bindBefore33=bind;
  bind=function(){bindBefore33();document.querySelectorAll('[data-delete-ledger33]').forEach(b=>b.onclick=()=>deleteLedger33(b.dataset.deleteLedger33));document.querySelectorAll('[data-gryz-edit33]').forEach(b=>b.onclick=()=>editGryzlik33(b.dataset.gryzEdit33));const add=document.querySelector('#addGryzlik32');if(add)add.onclick=()=>editGryzlik33()};

  render();
})();
