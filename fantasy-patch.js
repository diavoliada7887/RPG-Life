(() => {
  const pairs = [
    ['Архивариус собственной жизни','Хозяйка собственной саги'],
    ['архивариус собственной жизни','хозяйка собственной саги'],
    ['игровой мастер · архивариус · адвокат фактов','игровой мастер · хранитель хроник · адвокат фактов'],
    ['Архивариус, адвокат и хранитель длинной правды.','Хранитель хроник, адвокат и хранитель длинной правды.'],
    ['архивариус, адвокат и хранитель длинной правды.','хранитель хроник, адвокат и хранитель длинной правды.'],
    ['Сайт архивного бизнеса','Сайт бизнеса'],
    ['сайт архивного бизнеса','сайт бизнеса'],
    ['Собрать и запустить новый сайт архивного бизнеса.','Собрать и запустить новый сайт бизнеса.'],
    ['Прожить персонажа.','Прожить свою сагу.'],
    ['Не закрыть карту.','Не выжечь карту.']
  ];

  const replaceText = value => {
    let out = value;
    for (const [from,to] of pairs) out = out.split(from).join(to);
    return out;
  };

  const patchNode = root => {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const next = replaceText(root.nodeValue || '');
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const next = replaceText(n.nodeValue || '');
      if (next !== n.nodeValue) n.nodeValue = next;
    });
  };

  try {
    const key = 'rpg-live-v1';
    const raw = localStorage.getItem(key);
    if (raw) {
      const patched = replaceText(raw);
      if (patched !== raw) localStorage.setItem(key, patched);
    }
  } catch (_) {}

  const run = () => patchNode(document.body);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();

  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) patchNode(node);
      if (m.type === 'characterData') patchNode(m.target);
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
