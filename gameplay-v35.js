// RPG Life v35 — one currency renderer everywhere
(function(){
  const gold35=()=>'<img class="currency-img35 currency-gold35" src="assets/currency-gold.png" alt="золото">';
  const diamond35=()=>'<img class="currency-img35 currency-diamond35" src="assets/currency-diamond.png" alt="алмазы">';

  function patchCurrency35(html){
    return String(html||'')
      .replace(/🪙/g,gold35())
      .replace(/💎/g,diamond35())
      .replace(/<span class="currency-symbol32 gold32"[^>]*>[\s\S]*?<\/span>/g,gold35())
      .replace(/<span class="currency-symbol32 diamond32"[^>]*>[\s\S]*?<\/span>/g,diamond35())
      .replace(/<span class="currency-icon coin-icon"[^>]*>[\s\S]*?<\/span>/g,gold35())
      .replace(/<span class="currency-icon diamond-icon"[^>]*>[\s\S]*?<\/span>/g,diamond35())
      .replace(/([+-]?\d[\d\s]*)\s*G(?=(?:<|\s|$))/g,`${gold35()} <span>$1</span>`)
      .replace(/([+-]?\d[\d\s]*)\s*D(?=(?:<|\s|$))/g,`${diamond35()} <span>$1</span>`);
  }

  if(typeof todayView==='function'){
    const before=todayView;
    todayView=function(){return patchCurrency35(before())};
  }
  if(typeof battlesView==='function'){
    const before=battlesView;
    battlesView=function(){return patchCurrency35(before())};
  }
  if(typeof rewardsView==='function'){
    const before=rewardsView;
    rewardsView=function(){return patchCurrency35(before())};
  }
  if(typeof buffsView==='function'){
    const before=buffsView;
    buffsView=function(){return patchCurrency35(before())};
  }
  render();
})();
