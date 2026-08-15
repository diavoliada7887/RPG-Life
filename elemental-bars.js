(() => {
  const BASE = 'assets/rpg/';
  const bars = [
    {key:'тело', file:'bar_body_earth_01.png', name:'Земля', left:24.5, width:61.5, top:55.2},
    {key:'работа', file:'bar_work_fire_01.png', name:'Огонь', left:24.0, width:62.0, top:55.0},
    {key:'публич', file:'bar_publicity_water_01.png', name:'Вода', left:24.2, width:61.8, top:57.6},
    {key:'творч', file:'bar_creative_air_01.png', name:'Воздух', left:24.2, width:61.0, top:54.8},
    {key:'обуч', file:'bar_study_arcane_01.png', name:'Аркана', left:24.0, width:61.5, top:55.0},
    {key:'инфраструктур', file:'bar_infrastructure_home_01.png', name:'Очаг', left:24.4, width:61.2, top:55.0}
  ];

  function decorateBars(){
    document.querySelectorAll('.branch-card').forEach(card => {
      const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
      const cfg = bars.find(x => title.includes(x.key));
      if (!cfg) return;

      card.querySelectorAll(':scope > .rpg-branch-mascot').forEach(el => el.remove());
      card.classList.remove('has-rpg-mascot');

      if (card.querySelector('.elemental-progress')) return;
      const rhythm = card.querySelector('.rhythm');
      if (!rhythm) return;

      const total = rhythm.querySelectorAll('i').length || 8;
      const active = rhythm.querySelectorAll('i.on').length;
      const percent = Math.max(0, Math.min(100, Math.round(active / total * 100)));

      const wrap = document.createElement('div');
      wrap.className = 'elemental-progress';
      wrap.dataset.element = cfg.name;
      wrap.dataset.progress = String(percent);

      wrap.innerHTML = `
        <div class="elemental-progress-stage">
          <img class="elemental-progress-art" src="${BASE + cfg.file}" alt="${cfg.name}: прогресс ветки ${percent}%" draggable="false">
          <div class="elemental-progress-track" aria-hidden="true" style="left:${cfg.left}%;width:${cfg.width}%;top:${cfg.top}%">
            <div class="elemental-progress-marker" style="left:${percent}%"><i></i></div>
          </div>
        </div>
        <div class="elemental-progress-value"><b>${percent}%</b><span>${cfg.name}</span></div>`;

      rhythm.insertAdjacentElement('afterend', wrap);
      card.classList.add('has-elemental-progress');
    });
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorateBars();
    });
  };

  const start = () => {
    decorateBars();
    const root = document.querySelector('#app') || document.body;
    new MutationObserver(schedule).observe(root,{subtree:true,childList:true});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
