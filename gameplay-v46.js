// RPG Life v46 — visual practice statistics under Year.
(function(){
  const PREF_ITEM='rpg-life-stats-item-v46';
  const PREF_METRIC='rpg-life-stats-metric-v46';
  const PREF_PERIOD='rpg-life-stats-period-v46';
  const PREF_CHART='rpg-life-stats-chart-v46';
  let statItem46=localStorage.getItem(PREF_ITEM)||'';
  let statMetric46=localStorage.getItem(PREF_METRIC)||'';
  let statPeriod46=localStorage.getItem(PREF_PERIOD)||'month';
  let statChart46=localStorage.getItem(PREF_CHART)||'line';

  const pad46=n=>String(n).padStart(2,'0');
  const iso46=d=>`${d.getFullYear()}-${pad46(d.getMonth()+1)}-${pad46(d.getDate())}`;
  const parse46=s=>new Date(`${s}T12:00:00`);
  const addDays46=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const addMonths46=(d,n)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x};
  const startWeek46=d=>{const x=new Date(d),n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);return x};
  const inRange46=(date,r)=>date>=r.start&&date<=r.end;
  const num46=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=String(v??'').trim().replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
  const many46=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const xs=String(v??'').match(/-?\d+(?:[.,]\d+)?/g);return (xs||[]).reduce((n,x)=>n+Number(x.replace(',','.')),0)};
  const fmtNum46=n=>Number(n||0).toLocaleString('ru-RU',{maximumFractionDigits:1});

  function eligiblePractices46(){return (state.practices||[]).filter(p=>!p.hideFromTimeline)}
  function sources46(){
    const ps=eligiblePractices46().map(p=>({id:`p:${p.id}`,type:'practice',name:p.name||'Практика',obj:p}));
    const cs=(state.creativeLines||[]).map(c=>({id:`c:${c.id}`,type:'creative',name:c.title||'Творчество',obj:c}));
    return [...ps,...cs];
  }
  function sourceLogs46(src){
    if(src.type==='practice')return (state.practiceLogs||[]).filter(l=>l.practiceId===src.obj.id);
    return (state.creativeLogs||[]).filter(l=>l.lineId===src.obj.id);
  }
  function allMetricNames46(p){
    const out=[...(p.metrics||[])];
    (state.practiceLogs||[]).filter(l=>l.practiceId===p.id).forEach(l=>Object.keys(l.metrics||{}).forEach(k=>{if(!out.includes(k))out.push(k)}));
    return out;
  }
  function metricDefs46(src){
    if(src.type==='creative'){
      const units=[];
      sourceLogs46(src).forEach(l=>{const u=String(l.unit||'').trim();if(l.amount!=null&&u&&!units.some(x=>x.toLowerCase()===u.toLowerCase()))units.push(u)});
      const defs=units.map(u=>({key:`amount:${u}`,label:u.toLowerCase().includes('слов')?'Слова':u,unit:u,value:l=>String(l.unit||'').trim().toLowerCase()===u.toLowerCase()?num46(l.amount):0}));
      defs.push({key:'count',label:'Количество сессий',unit:'сессий',value:()=>1});
      return defs;
    }
    const p=src.obj,names=allMetricNames46(p),seconds=names.filter(k=>/(?:сек|секунд)/i.test(k)),defs=[];
    if(seconds.length>1||p.id==='hof'||p.id==='cold'){
      const label=p.id==='hof'?'Задержки, всего':p.id==='cold'?'Закаливание, всего':'Секунды, всего';
      defs.push({key:'seconds-total',label,unit:'сек',value:l=>seconds.reduce((n,k)=>n+many46(l.metrics?.[k]),0)});
    }
    names.filter(k=>!seconds.includes(k)||seconds.length===1&&p.id!=='hof'&&p.id!=='cold').forEach(k=>{
      const unit=(String(k).split(',')[1]||'').trim();
      defs.push({key:`metric:${k}`,label:k,unit,value:l=>num46(l.metrics?.[k])});
    });
    defs.push({key:'count',label:'Количество выполнений',unit:'раз',value:()=>1});
    return defs;
  }
  function chosenSource46(){
    const list=sources46();
    let src=list.find(x=>x.id===statItem46);
    if(!src)src=list.find(x=>sourceLogs46(x).length)||list[0];
    statItem46=src?.id||'';
    return src||null;
  }
  function chosenMetric46(src){
    const defs=src?metricDefs46(src):[];
    let d=defs.find(x=>x.key===statMetric46);
    if(!d)d=defs.find(x=>x.key!=='count')||defs[0];
    statMetric46=d?.key||'';
    return d||null;
  }

  function allRange46(){
    const dates=[];
    eligiblePractices46().forEach(p=>(state.practiceLogs||[]).filter(l=>l.practiceId===p.id).forEach(l=>dates.push(l.date)));
    (state.creativeLogs||[]).forEach(l=>dates.push(l.date));
    dates.sort();
    return {start:dates[0]||selectedDate,end:dates[dates.length-1]||selectedDate};
  }
  function range46(period=statPeriod46){
    const a=parse46(selectedDate);
    if(period==='week'){const s=startWeek46(a);return{start:iso46(s),end:iso46(addDays46(s,6))}}
    if(period==='month'){const s=new Date(a.getFullYear(),a.getMonth(),1),e=new Date(a.getFullYear(),a.getMonth()+1,0);return{start:iso46(s),end:iso46(e)}}
    if(period==='quarter'){const s=new Date(a.getFullYear(),a.getMonth()-2,1),e=new Date(a.getFullYear(),a.getMonth()+1,0);return{start:iso46(s),end:iso46(e)}}
    if(period==='year'){return{start:`${a.getFullYear()}-01-01`,end:`${a.getFullYear()}-12-31`}}
    return allRange46();
  }
  function rangeLabel46(r,period=statPeriod46){
    const s=parse46(r.start),e=parse46(r.end);
    if(period==='week')return `${s.getDate()} ${new Intl.DateTimeFormat('ru-RU',{month:'short'}).format(s)} — ${e.getDate()} ${new Intl.DateTimeFormat('ru-RU',{month:'short',year:'numeric'}).format(e)}`;
    if(period==='month')return new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(s);
    if(period==='quarter')return `${new Intl.DateTimeFormat('ru-RU',{month:'short'}).format(s)} — ${new Intl.DateTimeFormat('ru-RU',{month:'short',year:'numeric'}).format(e)}`;
    if(period==='year')return `${s.getFullYear()} год`;
    return 'всё время';
  }

  function buckets46(r,period){
    const out=[];
    if(period==='week'||period==='month'){
      for(let d=parse46(r.start),end=parse46(r.end);d<=end;d=addDays46(d,1)){
        const date=iso46(d);out.push({start:date,end:date,label:period==='week'?new Intl.DateTimeFormat('ru-RU',{weekday:'short'}).format(d):String(d.getDate())});
      }
      return out;
    }
    if(period==='quarter'){
      let d=parse46(r.start),end=parse46(r.end);
      while(d<=end){const s=new Date(d),e=addDays46(s,6);if(e>end)e.setTime(end.getTime());out.push({start:iso46(s),end:iso46(e),label:`${s.getDate()}.${pad46(s.getMonth()+1)}`});d=addDays46(e,1)}
      return out;
    }
    let d=new Date(parse46(r.start).getFullYear(),parse46(r.start).getMonth(),1),end=parse46(r.end);
    while(d<=end){const s=new Date(d),e=new Date(d.getFullYear(),d.getMonth()+1,0);out.push({start:iso46(s),end:iso46(e>end?end:e),label:new Intl.DateTimeFormat('ru-RU',{month:'short'}).format(s)});d=addMonths46(d,1)}
    return out;
  }
  function data46(src,metric,r,period){
    const logs=sourceLogs46(src).filter(l=>inRange46(l.date,r));
    return buckets46(r,period).map(b=>({label:b.label,value:logs.filter(l=>l.date>=b.start&&l.date<=b.end).reduce((n,l)=>n+metric.value(l),0)}));
  }

  function chart46(points,type,unit){
    const W=860,H=270,L=52,R=18,T=18,B=42,pw=W-L-R,ph=H-T-B,max=Math.max(1,...points.map(x=>x.value));
    const x=i=>points.length<=1?L+pw/2:L+(pw*i/(points.length-1));
    const y=v=>T+ph-(v/max)*ph;
    const grids=[0,.25,.5,.75,1].map(q=>{const yy=T+ph-q*ph;return `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="stats-grid46"/><text x="${L-8}" y="${yy+4}" text-anchor="end" class="stats-axis46">${esc(fmtNum46(max*q))}</text>`}).join('');
    let data='';
    if(type==='bar'){
      const step=pw/Math.max(1,points.length),bw=Math.max(3,Math.min(30,step*.62));
      data=points.map((p,i)=>{const xx=L+step*i+step/2-bw/2,yy=y(p.value),hh=T+ph-yy;return `<rect x="${xx}" y="${yy}" width="${bw}" height="${Math.max(1,hh)}" rx="4" class="stats-bar46"><title>${esc(p.label)} · ${esc(fmtNum46(p.value))} ${esc(unit||'')}</title></rect>`}).join('');
    }else{
      const path=points.map((p,i)=>`${i?'L':'M'} ${x(i)} ${y(p.value)}`).join(' ');
      const area=points.length?`${path} L ${x(points.length-1)} ${T+ph} L ${x(0)} ${T+ph} Z`:'';
      data=`${area?`<path d="${area}" class="stats-area46"/>`:''}${path?`<path d="${path}" class="stats-line46"/>`:''}${points.length<=35?points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="4" class="stats-dot46"><title>${esc(p.label)} · ${esc(fmtNum46(p.value))} ${esc(unit||'')}</title></circle>`).join(''):''}`;
    }
    const labelIds=[0,Math.floor((points.length-1)/2),points.length-1].filter((v,i,a)=>v>=0&&a.indexOf(v)===i);
    const labels=labelIds.map(i=>`<text x="${x(i)}" y="${H-12}" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}" class="stats-axis46">${esc(points[i]?.label||'')}</text>`).join('');
    return `<div class="stats-chart-scroll46"><svg class="stats-chart46" viewBox="0 0 ${W} ${H}" role="img" aria-label="График статистики">${grids}${data}${labels}</svg></div>`;
  }

  function compactPractice46(src,r){
    const logs=sourceLogs46(src).filter(l=>inRange46(l.date,r));if(!logs.length)return null;
    const defs=metricDefs46(src).filter(d=>d.key!=='count');
    const bits=[];
    defs.slice(0,3).forEach(d=>{const sum=logs.reduce((n,l)=>n+d.value(l),0);if(sum)bits.push(`${fmtNum46(sum)} ${d.unit||d.label}`)});
    return {name:src.name,count:logs.length,bits,type:src.type};
  }
  function summary46(r){
    const rows=sources46().map(s=>compactPractice46(s,r)).filter(Boolean).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ru'));
    if(!rows.length)return '<div class="empty-v2">За этот период пока ничего не записано.</div>';
    return `<div class="stats-summary-list46">${rows.map(x=>`<div class="stats-summary-row46"><div><b>${esc(x.name)}</b><small>${x.type==='creative'?`${x.count} сессий`:`${x.count} раз`}</small></div><strong>${x.bits.length?esc(x.bits.join(' · ')):'выполнено'}</strong></div>`).join('')}</div>`;
  }

  function itemOptions46(src){
    const ps=eligiblePractices46().map(p=>`<option value="p:${esc(p.id)}" ${src?.id===`p:${p.id}`?'selected':''}>${esc(p.name)}</option>`).join('');
    const cs=(state.creativeLines||[]).map(c=>`<option value="c:${esc(c.id)}" ${src?.id===`c:${c.id}`?'selected':''}>${esc(c.title)}</option>`).join('');
    return `${ps?`<optgroup label="Практики">${ps}</optgroup>`:''}${cs?`<optgroup label="Творческие линии">${cs}</optgroup>`:''}`;
  }
  function statsBlock46(){
    const src=chosenSource46();if(!src)return '<article class="v2-card year-stats46"><div class="empty-v2">Пока нечего строить в статистику.</div></article>';
    const metric=chosenMetric46(src),r=range46(),points=metric?data46(src,metric,r,statPeriod46):[],total=points.reduce((n,p)=>n+p.value,0),defs=metricDefs46(src);
    return `<section class="year-stats46">
      <div class="stats-head46"><div><div class="v2-kicker">История персонажа</div><h2 class="v2-title">Статистика практик</h2><div class="v2-sub">${esc(rangeLabel46(r))}</div></div><div class="stats-total46"><b>${esc(fmtNum46(total))}</b><small>${esc(metric?.unit||metric?.label||'')}</small></div></div>
      <div class="stats-controls46">
        <label><span>Что смотрим</span><select id="statsItem46">${itemOptions46(src)}</select></label>
        <label><span>Показатель</span><select id="statsMetric46">${defs.map(d=>`<option value="${esc(d.key)}" ${metric?.key===d.key?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label>
        <label><span>Период</span><select id="statsPeriod46"><option value="week" ${statPeriod46==='week'?'selected':''}>Неделя</option><option value="month" ${statPeriod46==='month'?'selected':''}>Месяц</option><option value="quarter" ${statPeriod46==='quarter'?'selected':''}>3 месяца</option><option value="year" ${statPeriod46==='year'?'selected':''}>Год</option><option value="all" ${statPeriod46==='all'?'selected':''}>Всё время</option></select></label>
        <div class="stats-chart-toggle46"><span>Вид</span><div><button type="button" data-chart46="line" class="${statChart46==='line'?'active':''}">⌁ Линия</button><button type="button" data-chart46="bar" class="${statChart46==='bar'?'active':''}">▥ Столбики</button></div></div>
      </div>
      <article class="v2-card stats-graph-card46"><div class="stats-graph-title46"><div><b>${esc(src.name)}</b><small>${esc(metric?.label||'')}</small></div><span>${esc(rangeLabel46(r))}</span></div>${chart46(points,statChart46,metric?.unit||'')}</article>
      <article class="v2-card stats-summary46"><div class="v2-kicker">Сводка периода</div><h3 class="v2-title">Сколько всего сделано</h3>${summary46(r)}</article>
    </section>`;
  }

  const yearBefore46=yearView;
  yearView=function(){
    const html=yearBefore46();
    const i=html.lastIndexOf('</div>');
    return i>=0?html.slice(0,i)+statsBlock46()+html.slice(i):html+statsBlock46();
  };

  const bindBefore46=bind;
  bind=function(){
    bindBefore46();
    const item=document.querySelector('#statsItem46');
    if(item)item.onchange=()=>{statItem46=item.value;statMetric46='';localStorage.setItem(PREF_ITEM,statItem46);localStorage.removeItem(PREF_METRIC);render()};
    const metric=document.querySelector('#statsMetric46');
    if(metric)metric.onchange=()=>{statMetric46=metric.value;localStorage.setItem(PREF_METRIC,statMetric46);render()};
    const period=document.querySelector('#statsPeriod46');
    if(period)period.onchange=()=>{statPeriod46=period.value;localStorage.setItem(PREF_PERIOD,statPeriod46);render()};
    document.querySelectorAll('[data-chart46]').forEach(b=>b.onclick=()=>{statChart46=b.dataset.chart46;localStorage.setItem(PREF_CHART,statChart46);render()});
  };

  window.rpgStats46={sources:sources46,range:range46};
  render();
})();
