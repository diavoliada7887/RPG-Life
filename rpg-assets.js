(() => {
  const BASE = 'assets/rpg/';

  const makeImg = (file, cls, alt = '') => {
    const img = document.createElement('img');
    img.src = BASE + file;
    img.className = cls;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    return img;
  };

  const addMascot = (el, file, extra = '', alt = '') => {
    if (!el || el.querySelector(':scope > .rpg-mascot')) return;
    const img = makeImg(file, `rpg-mascot ${extra}`.trim(), alt);
    el.appendChild(img);
    el.classList.add('has-rpg-mascot');
  };

  function decorateMainQuest() {
    const main = document.querySelector('.quest-main');
    if (main) addMascot(main, 'dragon_mainquest_01.png', 'rpg-dragon', 'Дракон главного квеста');
  }

  function decorateStates() {
    document.querySelectorAll('.state').forEach(card => {
      if (card.querySelector('.rpg-state-creature')) return;
      const text = (card.textContent || '').toLowerCase();
      const isDebuff = text.includes('временное состояние') || text.includes('дебаф') || text.includes('устал') || text.includes('расфокус') || text.includes('похмел');
      const file = isDebuff ? 'gremlin_debuff_01.png' : 'spirit_buff_01.png';
      const img = makeImg(file, `rpg-state-creature ${isDebuff ? 'is-debuff' : 'is-buff'}`, isDebuff ? 'Пакостник дебафа' : 'Дух бафа');
      card.prepend(img);
      card.classList.add(isDebuff ? 'has-debuff-creature' : 'has-buff-creature');
    });
  }

  function decorateBranches() {
    document.querySelectorAll('.branch-card').forEach(card => {
      if (card.querySelector('.rpg-mascot')) return;
      const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
      let file = null;
      let kind = '';
      if (title.includes('инфраструктур')) { file = 'dwarf_supplier_01.png'; kind = 'rpg-dwarf'; }
      else if (title.includes('публич')) { file = 'bard_herald_01.png'; kind = 'rpg-bard'; }
      else if (title.includes('обуч')) { file = 'elf_chronist_01.png'; kind = 'rpg-elf'; }
      else if (title.includes('творч')) { file = 'spirit_buff_01.png'; kind = 'rpg-spirit'; }
      if (file) addMascot(card, file, `rpg-branch-mascot ${kind}`);
    });
  }

  function decorateMemory() {
    document.querySelectorAll('#app .card').forEach(card => {
      const text = card.textContent || '';
      if (text.includes('Память персонажа')) addMascot(card, 'elf_chronist_01.png', 'rpg-memory-elf', 'Эльф-хронист');
    });
  }

  function decorateQuestRows() {
    document.querySelectorAll('.quest-row').forEach(row => {
      if (row.querySelector('.rpg-quest-creature')) return;
      const text = (row.textContent || '').toLowerCase();
      let file = null;
      if (text.includes('главный')) file = 'dragon_mainquest_01.png';
      else if (text.includes('🔒')) file = 'gremlin_debuff_01.png';
      if (!file) return;
      const img = makeImg(file, 'rpg-quest-creature', 'Квестовый спутник');
      row.appendChild(img);
      row.classList.add('has-quest-creature');
    });
  }

  function ensureQuestPopup() {
    let popup = document.querySelector('#rpgQuestPopup');
    if (popup) return popup;
    popup = document.createElement('div');
    popup.id = 'rpgQuestPopup';
    popup.className = 'rpg-quest-popup';
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML = `
      <img src="${BASE}popup_quest_accepted_01.png" alt="" draggable="false">
      <div class="rpg-quest-popup-copy"><b>Квест принят</b><small>Сюжетная линия открыта</small></div>`;
    document.body.appendChild(popup);
    return popup;
  }

  let popupTimer;
  function showQuestPopup() {
    const popup = ensureQuestPopup();
    popup.classList.remove('show');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => popup.classList.add('show'));
    });
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => popup.classList.remove('show'), 2900);
  }

  function decorate() {
    decorateMainQuest();
    decorateStates();
    decorateBranches();
    decorateMemory();
    decorateQuestRows();
  }

  let scheduled = false;
  const scheduleDecorate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorate();
    });
  };

  document.addEventListener('click', e => {
    const accept = e.target.closest('[data-quest-action="accept"]');
    if (accept) setTimeout(() => { if (!accept.isConnected) showQuestPopup(); }, 100);
  });

  const observer = new MutationObserver(scheduleDecorate);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      decorate();
      observer.observe(document.querySelector('#app') || document.body, {subtree:true, childList:true});
    }, {once:true});
  } else {
    decorate();
    observer.observe(document.querySelector('#app') || document.body, {subtree:true, childList:true});
  }
})();
