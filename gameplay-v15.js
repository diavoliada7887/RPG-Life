// RPG Life v15 — resources are sums of active effects; zero is the natural baseline
(function(){
  const meta={
    inspiration:{name:'Вдохновение',icon:'✦'},
    calm:{name:'Спокойствие',icon:'☾'},
    energy:{name:'Энергия',icon:'⚡'},
    recognition:{name:'Узнавание',icon:'◈'}
  };
  const signed=n=>Math.max(-20,Math.min(20,Math.round(Number(n)||0)));
  const parseDate=d=>new Date(d+'T12:00:00');
  const ageDays=(date,start)=>Math.floor((parseDate(date)-parseDate(start))/86400000);
  const isSunday=d=>parseDate(d).getDay()===0;

  // Every practice effect has a lifetime. Existing practices default to one day.
  (state.practices||[]).forEach(p=>{
    if(p.resourceEffectDays===undefined) p.resourceEffectDays=1;
    if(/^макияж$/i.test(String(p.name||'').trim())){
      p.resourceEffects=p.resourceEffects||{};
      if(p.resourceEffects.recognition===undefined) p.resourceEffects.recognition=1;
      if(!p.resourceEffectDays) p.resourceEffectDays=1;
    }
  });
  // Old manual resource baselines are intentionally retired; resources now start from zero.
  state.resources={inspiration:0,calm:0,energy:0,recognition:0};
  save();

  function activePracticeEffects(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0};
    const sources=[];
    (state.practiceLogs||[]).forEach(l=>{
      if(l.date>date)return;
      const p=state.practices.find(x=>x.id===l.practiceId);if(!p)return;
      const days=Math.max(1,Number(p.resourceEffectDays||1));
      const age=ageDays(date,l.date);
      if(age<0||age>=days)return;
      const fx=p.resourceEffects||{};
      let used=false;
      Object.keys(out).forEach(k=>{const n=Number(fx[k]||0);if(n){out[k]+=n;used=true}});
      if(used)sources.push({name:p.name,date:l.date,days,effects:fx,remaining:Math.max(1,days-age)});
    });
    return {out,sources};
  }

  function buffEffects(date){
    const out={inspiration:0,calm:0,energy:0,recognition:0},sources=[];
    const logs=(state.practiceLogs||[]).filter(l=>l.date<=date),todayLogs=logs.filter(l=>l.date===date);
    if(['train','hof','cold'].every(id=>todayLogs.some(l=>l.practiceId===id))){out.energy+=5;sources.push({name:'Утренний разгон',key:'energy',value:5})}
    if(todayLogs.some(l=>l.practiceId==='kitchen-morning')){out.inspiration+=4;sources.push({name:'Чистый старт',key:'inspiration',value:4})}
    const clothes=[...logs].filter(l=>l.practiceId==='clothes-week'&&isSunday(l.date)&&ageDays(date,l.date)>=0&&ageDays(date,l.date)<=6).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(clothes){const opts=new Set(clothes.options||[]);if(['Выстирана','Поглажена','Развешена'].every(x=>opts.has(x))){out.calm+=5;sources.push({name:'Спокойная неделя',key:'calm',value:5})}}
    const prep=[...logs].filter(l=>l.practiceId==='meal-prep'&&ageDays(date,l.date)>=0).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(prep){const days=Math.max(0,Number(prep.metrics?.['Дней запаса']||0)),age=ageDays(date,prep.date);if(days>0&&age<days){out.calm+=4;sources.push({name:'Кладовая полна, милорд',key:'calm',value:4})}}
    if((state.states||[]).some(s=>s.type==='buff'&&String(s.title||'').trim().toLowerCase()==='красотка')){out.recognition+=4;sources.push({name:'Красотка',key:'recognition',value:4})}
    return {out,sources};
  }

  function values(date){
    const p=activePracticeEffects(date),b=buffEffects(date),out={};
    Object.keys(meta).forEach(k=>out[k]=signed(p.out[k]+b.out[k]));
    return {out,p,b};
  }
  const pos=n=>((signed(n)+20)/40)*100;
  const klass=v=>v>6?'high':v<-6?'low':'mid';
  function card(date){
    const x=values(date);
    return `<article class="v2-card v2-span-12 resources-card signed-resources" id="derivedResourcesCard"><div class="v2-row"><div><div class="v2-kicker">Ресурсы</div><h3 class="v2-title">Состояние сейчас</h3></div><small class="v2-sub">складывается автоматически</small></div><div class="resource-grid resource-grid-v7">${Object.entries(meta).map(([k,m])=>{const v=x.out[k],p=x.p.out[k],b=x.b.out[k];return `<div class="resource-item"><div class="resource-line"><span>${m.icon} ${m.name}</span><b class="resource-number ${klass(v)}">${v>0?'+':''}${v}</b></div><div class="signed-bar"><span class="zero-mark"></span><i class="resource-dot" style="left:${pos(v)}%"></i></div><small>−20 <em>0</em> +20</small>${p||b?`<div class="resource-delta">${p?`практики ${p>0?'+':''}${p}`:''}${p&&b?' · ':''}${b?`бафы ${b>0?'+':''}${b}`:''}</div>`:''}</div>`}).join('')}</div>${x.p.sources.length?`<div class="resource-buffs active-effect-list">${x.p.sources.map(s=>`<span>${esc(s.name)} · ещё ${s.remaining} дн.</span>`).join('')}</div>`:''}</article>`;
  }

  // Extend the current practice editor with effect duration without bringing back manual resource baselines.
  const oldOpenPracticeEditor=openPracticeEditor;
  openPracticeEditor=function(id,branch){
    const p=id?state.practices.find(x=>x.id===id):null;
    oldOpenPracticeEditor(id,branch);
    const form=document.querySelector('#practiceForm13');
    if(!form)return;
    const quiet=form.querySelector('.quiet-practice-toggle');
    const wrap=document.createElement('label');
    wrap.innerHTML=`Эффект на ресурсы действует, дней <input name="resourceEffectDays" type="number" min="1" max="365" step="1" value="${Math.max(1,Number(p?.resourceEffectDays||1))}"><small>Например: макияж — 1 день, покраска волос — 30 дней.</small>`;
    form.insertBefore(wrap,quiet||form.querySelector('.modal-actions'));
    const previous=form.onsubmit;
    form.onsubmit=e=>{
      const days=Math.max(1,Math.min(365,Number(new FormData(form).get('resourceEffectDays'))||1));
      previous.call(form,e);
      // previous handler has saved the practice. For a new one, find the newest matching name.
      const name=String(new FormData(form).get('name')||'').trim();
      const target=p||[...(state.practices||[])].reverse().find(x=>x.name===name);
      if(target){target.resourceEffectDays=days;save()}
    };
  };

  const prevToday=todayView;
  todayView=function(){
    let html=prevToday();
    html=html.replace(/<article class="v2-card v2-span-12 resources-card[\s\S]*?<\/article>/,card(selectedDate));
    return html;
  };

  render();
})();