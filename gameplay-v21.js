// RPG Life v21 — manual buff activation/rewards + robust calendar cleanup placement
(function(){
  const localDate21=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  state.buffClaims=state.buffClaims||[];

  function rewardBuff21(b,date){
    const key=`${b.id}:${date}`;if(state.buffClaims.some(x=>x.key===key))return;
    const gold=Math.max(0,Number(b.rewardGold||0)),diamonds=Math.max(0,Number(b.rewardDiamonds||0));
    state.wallet=state.wallet||{gold:0,diamonds:0};
    state.wallet.gold=Number(state.wallet.gold||0)+gold;state.wallet.diamonds=Number(state.wallet.diamonds||0)+diamonds;
    state.buffClaims.push({id:uid(),key,buffId:b.id,date,gold,diamonds});
  }
  function manualActive21(b){return (state.states||[]).some(s=>s.type==='buff'&&(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()))}

  const prevBuffsView21=buffsView20;
  buffsView20=function(){
    let html=prevBuffsView21();
    (state.buffDefinitions||[]).filter(b=>b.mode==='manual').forEach(b=>{
      const active=manualActive21(b),needle=`<button class="soft" data-edit-buff20="${b.id}">⚙</button>`;
      html=html.replace(needle,`<div class="buff-card-actions"><button class="${active?'ghost':'primary'}" data-toggle-buff21="${b.id}">${active?'Снять':'Активировать'}</button>${needle}</div>`);
    });
    return html;
  };

  // Replace v20's year wrapper with exact insertion into calendar-detail.
  yearView=function(){
    let html=prevYear20();const add=calendarCleanup20(selectedDate);if(!add)return html;
    const marker='<div class="v2-card calendar-detail">',start=html.indexOf(marker);if(start<0)return html;
    const close=html.lastIndexOf('</div></div>');if(close<0)return html;
    return html.slice(0,close)+add+html.slice(close);
  };

  const bindBefore21=bind;
  bind=function(){
    bindBefore21();
    document.querySelectorAll('[data-toggle-buff21]').forEach(btn=>btn.onclick=()=>{
      const b=state.buffDefinitions.find(x=>x.id===btn.dataset.toggleBuff21);if(!b)return;
      const active=manualActive21(b);
      if(active){state.states=(state.states||[]).filter(s=>!(s.buffId===b.id||String(s.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase()));}
      else{state.states=state.states||[];state.states.push({id:uid(),type:'buff',buffId:b.id,title:b.title,note:b.description||'',strength:null});rewardBuff21(b,localDate21());}
      save();render();
    });
  };
  render();
})();
