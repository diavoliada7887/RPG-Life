(() => {
  const BASE = 'assets/rpg/';
  const bars = [
    {key:'тело', file:'bar_body_earth_01.png', name:'Земля'},
    {key:'работа', file:'bar_work_fire_01.png', name:'Огонь'},
    {key:'публич', file:'bar_publicity_water_01.png', name:'Вода'},
    {key:'творч', file:'bar_creative_air_01.png', name:'Воздух'},
    {key:'обуч', file:'bar_study_arcane_01.png', name:'Аркана'},
    {key:'инфраструктур', file:'bar_infrastructure_home_01.png', name:'Очаг'}
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
        <img class="elemental-progress-art" src="${BASE + cfg.file}" alt="${cfg.name}: прогресс ветки ${percent}%" draggable="false">
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
