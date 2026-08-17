// RPG Life v34 — boss hit history / production journal
(function(){
  state.bossHitLog=state.bossHitLog||[];

  function localDate34(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function getBoss34(id){return (state.bosses||[]).find(b=>b.id===id)}
  function getStage34(b,id){return (b?.stages||[]).find(s=>s.id===id)}
  function hitRows34(bid){return (state.bossHitLog||[]).filter(h=>h.bossId===bid).sort((a,b)=>String(b.at||b.date||'').localeCompare(String(a.at||a.date||'')))}

  function history34(b){
    const rows=hitRows34(b.id),sum=rows.reduce((n,h)=>n+Number(h.amount||0),0);
    return `<details class="boss-hit-history34"><summary><span>История ударов</span><b>${rows.length?`${rows.length} · ${sum.toLocaleString('ru-RU')}`:'0'} ▾</b></summary>${rows.length?`<div class="boss-hit-list34">${rows.map(h=>{const s=getStage34(b,h.stageId);return `<div class="boss-hit-row34"><div><b>+${Number(h.amount||0).toLocaleString('ru-RU')} ${esc(h.unit||s?.unit||'')}</b><small>${esc(s?.name||h.stageName||'Этап')} · ${h.date?fmt(h.date):''}${h.note?` · ${esc(h.note)}`:''}</small></div><button class="icon-button23 danger" data-del-hit34="${h.id}" title="Удалить удар">×</button></div>`}).join('')}</div>`:'<div class="v2-sub boss-hit-empty34">Пока ударов нет.</div>'}</details>`;
  }

  function decorate34(){
    document.querySelectorAll('.boss-card22').forEach(card=>{
      if(card.querySelector('.boss-hit-history34'))return;
      const id=card.querySelector('[data-edit-v12]')?.dataset.editV12,b=getBoss34(id);if(!b)return;
      card.insertAdjacentHTML('beforeend',history34(b));
    });
    document.querySelectorAll('[data-del-hit34]').forEach(x=>x.onclick=()=>deleteHit34(x.dataset.delHit34));
  }

  function addHit34(token){
    const [bid,sid]=token.split(':'),b=getBoss34(bid),s=getStage34(b,sid);if(!b||!s)return;
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Удар по боссу</div><h2>${esc(s.name)}</h2></div><button class="close">×</button></div><form id="hitStageForm34"><label>Сколько сделано сейчас<input name="delta" type="number" min="0.01" step="0.01" required autofocus></label><label>Дата<input name="date" type="date" value="${selectedDate||localDate34()}"></label><label>Заметка<input name="note" placeholder="например: партия 3, тома 41–57"></label><small>Было: ${Number(s.done||0).toLocaleString('ru-RU')} ${esc(s.unit||'')}${s.total!==null?` · всего ${Number(s.total).toLocaleString('ru-RU')}`:''}</small><button class="primary">Добавить удар</button></form>`);
    document.querySelector('#hitStageForm34').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),requested=Math.max(0,Number(f.get('delta'))||0),before=Number(s.done||0),next=s.total===null?before+requested:Math.min(Number(s.total),before+requested),actual=Math.max(0,next-before);if(!actual)return;s.done=next;state.bossHitLog.push({id:uid(),bossId:bid,stageId:sid,stageName:s.name||'',unit:s.unit||'',amount:actual,date:String(f.get('date')||localDate34()),note:String(f.get('note')||'').trim(),at:new Date().toISOString()});save();document.querySelector('#modal').close();render()};
  }

  function deleteHit34(id){
    const h=(state.bossHitLog||[]).find(x=>x.id===id);if(!h)return;
    if(!confirm(`Удалить удар +${Number(h.amount||0).toLocaleString('ru-RU')}? Прогресс этапа откатится.`))return;
    const b=getBoss34(h.bossId),s=getStage34(b,h.stageId);if(s)s.done=Math.max(0,Number(s.done||0)-Number(h.amount||0));
    state.bossHitLog=state.bossHitLog.filter(x=>x.id!==id);save();render();
  }

  const bindBefore34=bind;
  bind=function(){
    bindBefore34();
    document.querySelectorAll('[data-hit32]').forEach(x=>x.onclick=()=>addHit34(x.dataset.hit32));
    decorate34();
  };

  render();
})();
