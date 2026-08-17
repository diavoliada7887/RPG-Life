// RPG Life v30 — three-set metrics for Hof breathing and cold exposure
(function(){
  const originals={hof:['Задержка, сек','Отжимания'],cold:['Холод, сек']};

  function ensureThreeSetMetrics30(){
    let changed=false;
    const hof=(state.practices||[]).find(p=>p.id==='hof');
    if(hof){
      const wanted=['Задержка 1, сек','Задержка 2, сек','Задержка 3, сек','Отжимания'];
      if(JSON.stringify(hof.metrics||[])!==JSON.stringify(wanted)){hof.metrics=wanted;changed=true}
    }
    const cold=(state.practices||[]).find(p=>p.id==='cold');
    if(cold){
      const wanted=['Подход 1, сек','Подход 2, сек','Подход 3, сек'];
      if(JSON.stringify(cold.metrics||[])!==JSON.stringify(wanted)){cold.metrics=wanted;changed=true}
    }
    return changed;
  }

  // Preserve old single-value logs by copying the old value into the first set only.
  function migrateOldLogs30(){
    let changed=false;
    (state.practiceLogs||[]).forEach(l=>{
      if(!l.metrics)return;
      if(l.practiceId==='hof'&&l.metrics['Задержка, сек']!==undefined){
        if(l.metrics['Задержка 1, сек']===undefined)l.metrics['Задержка 1, сек']=l.metrics['Задержка, сек'];
        delete l.metrics['Задержка, сек'];changed=true;
      }
      if(l.practiceId==='cold'&&l.metrics['Холод, сек']!==undefined){
        if(l.metrics['Подход 1, сек']===undefined)l.metrics['Подход 1, сек']=l.metrics['Холод, сек'];
        delete l.metrics['Холод, сек'];changed=true;
      }
    });
    return changed;
  }

  function decorateThreeSetForm30(){
    const form=document.querySelector('#logForm');
    if(!form)return;
    const title=document.querySelector('#modal h2')?.textContent||'';
    const isHof=title.includes('Хоф');
    const isCold=title.includes('Закаливание');
    if(!isHof&&!isCold)return;
    const labels=[...form.querySelectorAll(':scope > label')];
    const targetNames=isHof?['Задержка 1, сек','Задержка 2, сек','Задержка 3, сек']:['Подход 1, сек','Подход 2, сек','Подход 3, сек'];
    const targets=labels.filter(l=>targetNames.some(n=>l.firstChild?.textContent?.trim()===n));
    if(targets.length!==3)return;
    const wrap=document.createElement('div');
    wrap.className='three-set-metrics30';
    const legend=document.createElement('div');legend.className='three-set-title30';legend.textContent=isHof?'Задержки дыхания':'Холодные подходы';
    wrap.appendChild(legend);
    const grid=document.createElement('div');grid.className='three-set-grid30';
    targets.forEach((label,i)=>{
      label.classList.add('three-set-field30');
      const input=label.querySelector('input');
      label.childNodes[0].textContent=`${i+1}`;
      if(input)input.placeholder='сек';
      grid.appendChild(label);
    });
    wrap.appendChild(grid);
    form.insertBefore(wrap,form.firstChild);
  }

  const logPracticeBefore30=logPractice;
  logPractice=function(id,logId=null){
    logPracticeBefore30(id,logId);
    requestAnimationFrame(decorateThreeSetForm30);
  };

  let changed=ensureThreeSetMetrics30();
  if(migrateOldLogs30())changed=true;
  if(changed)save();
  render();
})();
