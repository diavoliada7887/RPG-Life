// RPG Life v14 — stable resource calculation; practice effects never overwrite base state
(function(){
  const meta={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  const signed=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  state.resources=state.resources||{};
  Object.keys(meta).forEach(k=>{if(!Number.isFinite(Number(state.resources[k])))state.resources[k]=0});
  save();

  const parseDate=d=>new Date(d+'T12:00:00');
  const dayDiff=(a,b)=>Math.round((parseDate(a)-parseDate(b))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;

  function practiceEffects(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0};
    (state.practiceLogs||[]).filter(l=>l.date===date).forEach(l=>{
      const p=state.practices.find(x=>x.id===l.practiceId);if(!p)return;
      Object.keys(out).forEach(k=>out[k]+=Number(p.resourceEffects?.[k]||0));
    });
    return out;
  }

  function buffEffects(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0},logs=(state.practiceLogs||[]).filter(l=>l.date<=date),todayLogs=logs.filter(l=>l.date===date);
    if(['train','hof','cold'].every(id=>todayLogs.some(l=>l.practiceId===id))) out.energy+=5;
    if(todayLogs.some(l=>l.practiceId==='kitchen-morning')) out.inspiration+=4;
    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&dayDiff(date,l.date)>=0&&dayDiff(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){const opts=new Set(clothes.options||[]);if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x)))out.calm+=5}
    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&dayDiff(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0)),age=dayDiff(date,prep.date);if(days>0&&age<days)out.calm+=4}
    if((state.states||[]).some(s=>s.type==='buff'&&String(s.title||'').trim().toLowerCase()==='красотка'))out.recognition+=4;
    return out;
  }

  function values(date){
    const p=practiceEffects(date),b=buffEffects(date),out={};
    Object.keys(meta).forEach(k=>out[k]=signed(Number(state.resources[k]||0)+p[k]+b[k]));
    return out;
  }
  const pos=n=>((signed(n)+20)/40)*100;
  const klass=v=>v>6?'high':v<-6?'low':'mid';
  function card(date){
    const v=values(date),p=practiceEffects(date),b=buffEffects(date);
    return `<article class="v2-card v2-span-12 resources-card signed-resources" id="stableResourcesCard"><div class="v2-row"><div><div class="v2-kicker">Ресурсы</div><h3 class="v2-title">Состояние сейчас</h3></div><button class="ghost" id="editResourcesV14">⚙ шкалы</button></div><div class="resource-grid resource-grid-v7">${Object.entries(meta).map(([k,m])=>`<div class="resource-item"><div class="resource-line"><span>${m.icon} ${m.name}</span><b class="resource-number ${klass(v[k])}">${v[k]>0?'+':''}${v[k]}</b></div><div class="signed-bar"><span class="zero-mark"></span><i class="resource-dot" style="left:${pos(v[k])}%"></i></div><small>−20 <em>0</em> +20</small>${p[k]||b[k]?`<div class="resource-delta">${p[k]?`практики ${p[k]>0?'+':''}${p[k]}`:''}${p[k]&&b[k]?' · ':''}${b[k]?`бафы ${b[k]>0?'+':''}${b[k]}`:''}</div>`:''}</div>`).join('')}</div></article>`;
  }

  function editor(){
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Базовое состояние</div><h2>Ресурсы</h2></div><button class="close">×</button></div><form id="resourcesFormV14"><div class="v2-sub">Это только база. Практики и бафы считаются отдельно и не могут её перезаписать.</div>${Object.entries(meta).map(([k,m])=>`<label>${m.icon} ${m.name}<div class="signed-input-row"><input name="${k}" type="range" min="-20" max="20" step="1" value="${signed(state.resources[k])}"><output id="v14_${k}">${signed(state.resources[k])>0?'+':''}${signed(state.resources[k])}</output></div></label>`).join('')}<button class="primary">Сохранить</button></form>`);
    Object.keys(meta).forEach(k=>{const i=document.querySelector(`[name="${k}"]`),o=document.querySelector(`#v14_${k}`);if(i&&o)i.oninput=()=>o.textContent=(Number(i.value)>0?'+':'')+i.value});
    document.querySelector('#resourcesFormV14').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);Object.keys(meta).forEach(k=>state.resources[k]=signed(f.get(k)));save();document.querySelector('#modal').close();render()};
  }

  const prevToday=todayView;
  todayView=function(){
    let html=prevToday();
    html=html.replace(/<article class="v2-card v2-span-12 resources-card[\s\S]*?<\/article>/,card(selectedDate));
    return html;
  };

  const prevBind=bind;
  bind=function(){prevBind();document.querySelector('#editResourcesV14')?.addEventListener('click',editor)};
  render();
})();