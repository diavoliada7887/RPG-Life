// RPG Life v47 — calendar focus, positive period reports, home reorder, buff start dates, deficit history.
(function(){
  const REPORTS_KEY47='periodReports47';
  const FOCUS_KEY47='rpg-life-calendar-focus-v47';
  let calendarFocus47=localStorage.getItem(FOCUS_KEY47)||'all';

  const HOUSE47={
    health:{name:'Дом Тела',short:'Тело'},
    presence:{name:'Дом Присутствия',short:'Присутствие'},
    work:{name:'Кузница Дела',short:'Дело'},
    creative:{name:'Башня Творчества',short:'Творчество'},
    study:{name:'Обсерватория Знания',short:'Знание'},
    publicity:{name:'Маяк',short:'Публичность'},
    infrastructure:{name:'Усадьба',short:'Усадьба'}
  };

  const pad47=n=>String(n).padStart(2,'0');
  const localISO47=(d=new Date())=>`${d.getFullYear()}-${pad47(d.getMonth()+1)}-${pad47(d.getDate())}`;
  const parse47=s=>new Date(`${s}T12:00:00`);
  const iso47=d=>`${d.getFullYear()}-${pad47(d.getMonth()+1)}-${pad47(d.getDate())}`;
  const shift47=(date,n)=>{const d=parse47(date);d.setDate(d.getDate()+n);return iso47(d)};
  const startWeek47=date=>{const d=parse47(date),n=(d.getDay()+6)%7;d.setDate(d.getDate()-n);return iso47(d)};
  const endWeek47=date=>shift47(startWeek47(date),6);
  const endMonth47=date=>{const d=parse47(date);return iso47(new Date(d.getFullYear(),d.getMonth()+1,0))};
  const startMonth47=date=>{const d=parse47(date);return `${d.getFullYear()}-${pad47(d.getMonth()+1)}-01`};
  const quarter47=date=>Math.floor(parse47(date).getMonth()/3);
  const startQuarter47=date=>{const d=parse47(date),m=quarter47(date)*3;return iso47(new Date(d.getFullYear(),m,1))};
  const endQuarter47=date=>{const d=parse47(date),m=quarter47(date)*3;return iso47(new Date(d.getFullYear(),m+3,0))};
  const inRange47=(date,start,end)=>date>=start&&date<=end;
  const num47=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0};
  const fmtNum47=n=>Number(n||0).toLocaleString('ru-RU',{maximumFractionDigits:1});
  const esc47=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtShort47=date=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(parse47(date));
  const fmtMonth47=date=>new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(parse47(date));
  const fmtFull47=date=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(parse47(date));

  state[REPORTS_KEY47]=Array.isArray(state[REPORTS_KEY47])?state[REPORTS_KEY47]:[];

  function houseKey47(p){
    if(p?.housePrimary&&HOUSE47[p.housePrimary])return p.housePrimary;
    return Object.entries(p?.branches||{}).filter(([k,v])=>HOUSE47[k]&&Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0]||'health';
  }
  function visiblePractices47(){return (state.practices||[]).filter(p=>!p.hideFromTimeline)}
  function visiblePracticeIds47(){return new Set(visiblePractices47().map(p=>p.id))}
  function practice47(id){return (state.practices||[]).find(p=>p.id===id)}
  function line47(id){return (state.creativeLines||[]).find(l=>l.id===id)}

  function bossVictories47(date=null){
    const rows=[];
    (state.achievements||[]).filter(a=>a.type==='bossVictory'&&(!date||a.date===date)).forEach(a=>rows.push({key:`a:${a.id}`,date:a.date,title:String(a.title||'Победа над боссом').replace(/^Победа над боссом:\s*/,'')}));
    (state.bosses||[]).forEach(b=>(b.victoryHistory||[]).forEach(v=>{
      if(date&&v.date!==date)return;
      const key=`b:${b.id}:${v.run||1}:${v.date}`;
      if(rows.some(x=>x.date===v.date&&x.title.startsWith(b.title)))return;
      rows.push({key,date:v.date,title:`${b.title}${v.run&&v.run>1?` · ${v.run} пришествие`:''}`});
    }));
    return rows.filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date));
  }

  function metricSummary47(p,logs){
    const minutes=new Set(),seconds=new Set(),steps=new Set(),others=new Set();
    logs.forEach(l=>Object.keys(l.metrics||{}).forEach(k=>{
      if(/мин/i.test(k))minutes.add(k);
      else if(/сек/i.test(k))seconds.add(k);
      else if(/шаг/i.test(k))steps.add(k);
      else others.add(k);
    }));
    const out=[];
    const sumKeys=keys=>logs.reduce((n,l)=>n+[...keys].reduce((m,k)=>m+num47(l.metrics?.[k]),0),0);
    const min=sumKeys(minutes);if(min)out.push(`${fmtNum47(min)} мин`);
    const sec=sumKeys(seconds);if(sec)out.push(`${fmtNum47(sec)} сек`);
    const st=sumKeys(steps);if(st)out.push(`${fmtNum47(st)} шагов`);
    [...others].forEach(k=>{const n=logs.reduce((s,l)=>s+num47(l.metrics?.[k]),0);if(n)out.push(`${fmtNum47(n)} ${k.toLowerCase()}`)});
    return out.slice(0,4);
  }

  function collectPeriod47(start,end){
    const allowed=visiblePracticeIds47(),items=[];
    visiblePractices47().forEach(p=>{
      const logs=(state.practiceLogs||[]).filter(l=>l.practiceId===p.id&&inRange47(l.date,start,end));
      if(!logs.length)return;
      items.push({type:'practice',id:p.id,name:p.name||'Практика',count:logs.length,house:houseKey47(p),details:metricSummary47(p,logs)});
    });
    (state.creativeLines||[]).forEach(line=>{
      const logs=(state.creativeLogs||[]).filter(l=>l.lineId===line.id&&inRange47(l.date,start,end));
      if(!logs.length)return;
      const byUnit=new Map();
      logs.forEach(l=>{if(l.amount==null)return;const unit=String(l.unit||'ед.').trim()||'ед.',key=unit.toLowerCase();byUnit.set(key,{unit,total:(byUnit.get(key)?.total||0)+num47(l.amount)})});
      const details=[...byUnit.values()].filter(x=>x.total).map(x=>`${fmtNum47(x.total)} ${x.unit}`).slice(0,4);
      items.push({type:'creative',id:line.id,name:line.title||'Творчество',count:logs.length,house:'creative',details});
    });
    const victories=bossVictories47().filter(v=>inRange47(v.date,start,end));
    const bosses=victories.map(v=>v.title);
    const dates=new Set();
    (state.practiceLogs||[]).filter(l=>allowed.has(l.practiceId)&&inRange47(l.date,start,end)).forEach(l=>dates.add(l.date));
    (state.creativeLogs||[]).filter(l=>inRange47(l.date,start,end)).forEach(l=>dates.add(l.date));
    victories.forEach(v=>dates.add(v.date));
    const actionCount=items.reduce((n,x)=>n+x.count,0)+bosses.length;
    return {items,bosses,days:dates.size,actionCount,directions:items.length+(bosses.length?1:0)};
  }

  function reportTitle47(type,end){
    if(type==='week')return `Итоги недели · ${fmtShort47(shift47(end,-6))} — ${fmtShort47(end)}`;
    if(type==='month')return `Итоги месяца · ${fmtMonth47(end)}`;
    const q=quarter47(end)+1;return `Итоги ${q} квартала · ${parse47(end).getFullYear()}`;
  }
  function praise47(type,data){
    const span=type==='week'?'За эту неделю':type==='month'?'За этот месяц':'За этот квартал';
    const noun=data.actionCount===1?'зафиксированное действие':'зафиксированных действий';
    const dirs=data.directions===1?'направлении':'направлениях';
    return `${span} ты накопила ${data.actionCount} ${noun} в ${Math.max(1,data.directions)} ${dirs}. Это уже не намерение и не список дел — это прожитая масса. Хорошая, настоящая работа.`;
  }
  function buildReport47(type,start,end){
    const data=collectPeriod47(start,end);if(!data.actionCount)return null;
    return {id:`report:${type}:${end}`,type,date:end,start,end,title:reportTitle47(type,end),praise:praise47(type,data),...data,generatedAt:new Date().toISOString()};
  }
  function sameReport47(a,b){
    if(!a||!b)return false;
    const pick=x=>({type:x.type,date:x.date,start:x.start,end:x.end,title:x.title,praise:x.praise,items:x.items,bosses:x.bosses,days:x.days,actionCount:x.actionCount,directions:x.directions});
    return JSON.stringify(pick(a))===JSON.stringify(pick(b));
  }

  function earliestActivity47(){
    const allowed=visiblePracticeIds47(),dates=[];
    (state.practiceLogs||[]).forEach(l=>{if(allowed.has(l.practiceId)&&l.date)dates.push(l.date)});
    (state.creativeLogs||[]).forEach(l=>{if(l.date)dates.push(l.date)});
    bossVictories47().forEach(v=>dates.push(v.date));
    dates.sort();return dates[0]||localISO47();
  }
  function ensureReports47(){
    const today47=localISO47(),first=earliestActivity47(),reports=state[REPORTS_KEY47];let changed=false;
    const upsert=(type,start,end)=>{
      if(end>today47)return;
      const next=buildReport47(type,start,end),i=reports.findIndex(r=>r.id===`report:${type}:${end}`);
      if(!next){if(i>=0&&end===today47){reports.splice(i,1);changed=true}return}
      if(i<0){reports.push(next);changed=true}
      else if(end===today47&&!sameReport47(reports[i],next)){reports[i]=next;changed=true}
    };

    let ws=startWeek47(first),we=endWeek47(ws),guard=0;
    while(we<=today47&&guard++<800){upsert('week',ws,we);ws=shift47(ws,7);we=shift47(we,7)}

    let md=parse47(startMonth47(first));guard=0;
    while(guard++<300){const ms=iso47(md),me=endMonth47(ms);if(me>today47)break;upsert('month',ms,me);md=new Date(md.getFullYear(),md.getMonth()+1,1)}

    let qd=parse47(startQuarter47(first));guard=0;
    while(guard++<100){const qs=iso47(qd),qe=endQuarter47(qs);if(qe>today47)break;upsert('quarter',qs,qe);qd=new Date(qd.getFullYear(),qd.getMonth()+3,1)}

    if(changed){reports.sort((a,b)=>a.date.localeCompare(b.date)||a.type.localeCompare(b.type));save()}
    return changed;
  }

  function reportTypeLabel47(type){return type==='week'?'Неделя':type==='month'?'Месяц':'Квартал'}
  function reportCard47(r,compact=false){
    const rows=(r.items||[]).map(x=>`<div class="report-row47 house-${esc47(x.house)}47"><span><b>${esc47(x.name)}</b><small>${x.count} ${x.type==='creative'?'сесс.':'раз'}</small></span><strong>${esc47((x.details||[]).join(' · ')||'сделано')}</strong></div>`).join('');
    const bosses=(r.bosses||[]).length?`<div class="report-bosses47"><small>⚔ Победы</small>${r.bosses.map(x=>`<b>${esc47(x)}</b>`).join('')}</div>`:'';
    if(compact)return `<button class="report-mini47" type="button" data-report-date47="${r.date}"><span>${reportTypeLabel47(r.type)}</span><b>${esc47(r.title.replace(/^Итоги (?:недели|месяца|\d квартала) · /,''))}</b><small>${r.actionCount} действий · ${r.days} дней</small></button>`;
    return `<article class="period-report47 report-${r.type}47"><div class="report-top47"><div><div class="v2-kicker">${reportTypeLabel47(r.type)} · только сделанное</div><h3>${esc47(r.title)}</h3></div><span>✦</span></div><p class="report-praise47">${esc47(r.praise)}</p><div class="report-numbers47"><span><b>${r.days}</b><small>дней с жизнью</small></span><span><b>${r.actionCount}</b><small>действий</small></span><span><b>${r.directions}</b><small>направлений</small></span></div>${rows?`<div class="report-rows47">${rows}</div>`:''}${bosses}</article>`;
  }
  function reportsOnDate47(date){return (state[REPORTS_KEY47]||[]).filter(r=>r.date===date).sort((a,b)=>({week:1,month:2,quarter:3}[a.type]-({week:1,month:2,quarter:3}[b.type])))}

  function sourceOptions47(){
    const practices=visiblePractices47().map(p=>`<option value="p:${esc47(p.id)}" ${calendarFocus47===`p:${p.id}`?'selected':''}>${esc47(p.name)}</option>`).join('');
    const creative=(state.creativeLines||[]).map(l=>`<option value="c:${esc47(l.id)}" ${calendarFocus47===`c:${l.id}`?'selected':''}>${esc47(l.title)}</option>`).join('');
    return `<option value="all" ${calendarFocus47==='all'?'selected':''}>Все события</option><option value="reports" ${calendarFocus47==='reports'?'selected':''}>📜 Отчёты</option><option value="bosses" ${calendarFocus47==='bosses'?'selected':''}>⚔ Победы над боссами</option>${practices?`<optgroup label="Практики">${practices}</optgroup>`:''}${creative?`<optgroup label="Творческие линии">${creative}</optgroup>`:''}`;
  }

  function compact47(n){n=Number(n)||0;if(Math.abs(n)>=1000000)return`${(n/1000000).toFixed(n>=10000000?0:1)}м`;if(Math.abs(n)>=1000)return`${(n/1000).toFixed(n>=10000?0:1)}к`;return fmtNum47(n)}
  function preferredMetric47(p,logs){
    const keys=[];logs.forEach(l=>Object.keys(l.metrics||{}).forEach(k=>{if(!keys.includes(k))keys.push(k)}));
    const mins=keys.filter(k=>/мин/i.test(k)),secs=keys.filter(k=>/сек/i.test(k)),steps=keys.filter(k=>/шаг/i.test(k));
    const sum=arr=>logs.reduce((n,l)=>n+arr.reduce((m,k)=>m+num47(l.metrics?.[k]),0),0);
    let v=sum(mins);if(v)return{value:v,label:`${fmtNum47(v)} мин`,short:`${compact47(v)}м`};
    v=sum(secs);if(v)return{value:v,label:`${fmtNum47(v)} сек`,short:`${compact47(v)}с`};
    v=sum(steps);if(v)return{value:v,label:`${fmtNum47(v)} шагов`,short:compact47(v)};
    for(const k of keys){v=logs.reduce((n,l)=>n+num47(l.metrics?.[k]),0);if(v)return{value:v,label:`${fmtNum47(v)} ${k}`,short:compact47(v)}}
    return{value:logs.length,label:`${logs.length} раз`,short:`${logs.length}×`};
  }

  function dayFocus47(date){
    if(calendarFocus47==='reports'){
      const rs=reportsOnDate47(date);return{count:rs.length,short:rs.length?'📜':'',label:rs.map(r=>r.title).join(' · '),house:'reports'};
    }
    if(calendarFocus47==='bosses'){
      const bs=bossVictories47(date);return{count:bs.length,short:bs.length?'⚔':'',label:bs.map(x=>x.title).join(' · '),house:'bosses'};
    }
    if(calendarFocus47.startsWith('p:')){
      const id=calendarFocus47.slice(2),p=practice47(id);if(!p||p.hideFromTimeline)return{count:0,short:'',label:'',house:'all'};
      const logs=(state.practiceLogs||[]).filter(l=>l.practiceId===id&&l.date===date);if(!logs.length)return{count:0,short:'',label:'',house:houseKey47(p)};
      const m=preferredMetric47(p,logs);return{count:logs.length,short:m.short,label:`${p.name}: ${m.label}`,house:houseKey47(p),metric:m};
    }
    if(calendarFocus47.startsWith('c:')){
      const id=calendarFocus47.slice(2),line=line47(id),logs=(state.creativeLogs||[]).filter(l=>l.lineId===id&&l.date===date);if(!line||!logs.length)return{count:0,short:'',label:'',house:'creative'};
      const units=new Map();logs.forEach(l=>{if(l.amount!=null){const u=String(l.unit||'ед.').trim()||'ед.';units.set(u,(units.get(u)||0)+num47(l.amount))}});
      const first=[...units.entries()][0];const metric=first?{value:first[1],label:`${fmtNum47(first[1])} ${first[0]}`,short:/мин/i.test(first[0])?`${compact47(first[1])}м`:compact47(first[1])}:{value:logs.length,label:`${logs.length} сесс.`,short:`${logs.length}×`};
      return{count:logs.length,short:metric.short,label:`${line.title}: ${metric.label}`,house:'creative',metric};
    }
    const allowed=visiblePracticeIds47();
    const n=(state.practiceLogs||[]).filter(l=>allowed.has(l.practiceId)&&l.date===date).length+(state.creativeLogs||[]).filter(l=>l.date===date).length;
    return{count:n,short:n?String(n):'',label:n?`${n} событий`:'',house:'all'};
  }

  function monthHTML47(year,month){
    const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7,names=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    let cells=`<div class="month-weekdays">${names.map(x=>`<small>${x}</small>`).join('')}</div><div class="month-days">${Array.from({length:offset},()=>'<span></span>').join('')}`;
    for(let d=1;d<=days;d++){
      const date=`${year}-${pad47(month+1)}-${pad47(d)}`,ach=(state.achievements||[]).find(a=>a.date===date),focus=dayFocus47(date),reportN=reportsOnDate47(date).length,bossN=bossVictories47(date).length;
      const heat=Math.min(3,focus.count||0),title=focus.label?` title="${esc47(focus.label)}"`:'';
      cells+=`<button data-calendar-date="${date}" class="calendar-day calendar-day47 ${ach?.tier||''} ${date===selectedDate?'selected':''} ${focus.count?'focus-hit47':''} heat-${heat}47 house-${focus.house}47 ${reportN?'has-report47':''} ${bossN?'has-boss47':''}"${title}><b>${d}</b>${focus.short?`<em>${esc47(focus.short)}</em>`:''}${calendarFocus47==='all'&&reportN?'<i class="special47">📜</i>':''}${calendarFocus47==='all'&&bossN?'<i class="boss-special47">⚔</i>':''}</button>`;
    }
    return `<article class="month-card"><h3>${new Intl.DateTimeFormat('ru-RU',{month:'long'}).format(first)}</h3>${cells}</div></article>`;
  }

  function focusDetail47(date){
    if(calendarFocus47==='all')return'';
    const f=dayFocus47(date);if(!f.count)return '<div class="calendar-focus-detail47"><small>По выбранному фильтру</small><b>В этот день записей нет.</b></div>';
    return `<div class="calendar-focus-detail47 house-${esc47(f.house)}47"><small>По выбранному фильтру</small><b>${esc47(f.label)}</b></div>`;
  }
  function bossCardsForDate47(date){const rows=bossVictories47(date);return rows.map(x=>`<div class="calendar-boss-win47"><span>⚔</span><div><small>Победа над боссом</small><b>${esc47(x.title)}</b></div></div>`).join('')}

  yearView=function(){
    ensureReports47();
    const y=new Date().getFullYear(),memory=state.dayMemories?.[selectedDate]||'',reports=reportsOnDate47(selectedDate);
    return `<div class="v2-wrap year-page45 year-page47"><div class="year-title47"><div><div class="v2-kicker">История персонажа</div><h1 class="v2-title">Карта года · ${y}</h1></div></div><article class="v2-card calendar-filter47"><label><span>Что подсветить в календаре</span><select id="calendarFocus47">${sourceOptions47()}</select></label><small>Цвет показывает Дом практики, число внутри дня — фактический объём или количество.</small></article><div class="months-grid">${Array.from({length:12},(_,m)=>monthHTML47(y,m)).join('')}</div><div class="v2-card calendar-detail year-detail45 year-detail47"><h3>${fmt(selectedDate)}</h3>${focusDetail47(selectedDate)}<div class="year-day-events45">${todayLog()}</div>${bossCardsForDate47(selectedDate)}${reports.map(r=>reportCard47(r)).join('')}${memory?`<div class="calendar-memory36 year-memory45"><div class="v2-kicker">Чем запомнился день</div><p>${esc47(memory)}</p></div>`:''}</div></div>`;
  };

  function recentReportsCard47(){
    const rows=[...(state[REPORTS_KEY47]||[])].sort((a,b)=>b.date.localeCompare(a.date)||({quarter:3,month:2,week:1}[b.type]-({quarter:3,month:2,week:1}[a.type]))).slice(0,8);
    if(!rows.length)return'';
    return `<article class="v2-card v2-span-12 reports-home47"><details><summary><div><div class="v2-kicker">Отчёты</div><h3 class="v2-title">Что уже прожито</h3></div><span>Последние ${rows.length} ▾</span></summary><div class="report-mini-grid47">${rows.map(r=>reportCard47(r,true)).join('')}</div></details></article>`;
  }
  function reorderHome47(html){
    const quick=html.match(/<article class="v2-card v2-span-8 quick-card23">[\s\S]*?<\/article>/)?.[0]||'';
    const logged=html.match(/<article class="v2-card v2-span-4"><div class="v2-kicker">Зафиксировано<\/div>[\s\S]*?<\/article>/)?.[0]||'';
    const calendar=html.match(/<article class="v2-card v2-span-12 calendar-head27">[\s\S]*?<\/article>/)?.[0]||'';
    if(!quick||!calendar)return html;
    html=html.replace(quick,'');if(logged)html=html.replace(logged,'');
    html=html.replace(calendar,calendar+quick+logged);
    const reports=recentReportsCard47();
    return reports?html.replace('</section></div>',reports+'</section></div>'):html;
  }

  function withBuffStart47(date,fn){
    const held=[];
    (state.buffDefinitions||[]).forEach(b=>{
      if(!b.startDate||date>=b.startDate)return;
      held.push([b,b.mode,b.practiceIds,b.customRule,b.conditionKind]);
      b.mode='all';b.practiceIds=[];b.customRule=null;b.conditionKind='recentWindow';
    });
    try{return fn()}finally{held.forEach(([b,mode,ids,custom,kind])=>{b.mode=mode;b.practiceIds=ids;b.customRule=custom;b.conditionKind=kind})}
  }

  const todayBefore47=todayView;
  todayView=function(){ensureReports47();return withBuffStart47(selectedDate,()=>reorderHome47(todayBefore47()))};

  function deficitHistory47(){
    if(typeof ensureCalorieBank!=='function')return'';
    const c=ensureCalorieBank(),tx=c.transactions||[];
    const food=tx.filter(t=>t.source==='food').reduce((n,t)=>n+Number(t.delta||0),0);
    const sport=tx.filter(t=>t.source==='practice').reduce((n,t)=>n+Number(t.delta||0),0);
    const other=tx.filter(t=>!['food','practice'].includes(t.source)).reduce((n,t)=>n+Number(t.delta||0),0);
    const byDate=new Map();tx.forEach(t=>{if(!t.date)return;const row=byDate.get(t.date)||{food:0,sport:0,other:0};if(t.source==='food')row.food+=Number(t.delta||0);else if(t.source==='practice')row.sport+=Number(t.delta||0);else row.other+=Number(t.delta||0);byDate.set(t.date,row)});
    const dates=[...byDate.keys()].sort().reverse().slice(0,14);
    const signed=n=>`${n>0?'+':''}${Math.round(n).toLocaleString('ru-RU')}`;
    return `<details class="deficit-history47"><summary><span>История дефицита</span><small>🍽 ${signed(food)} · 🔥 ${signed(sport)} ккал</small><i>▾</i></summary><div class="deficit-total47"><div><span>За счёт еды</span><b>${signed(food)} ккал</b></div><div><span>За счёт спорта</span><b>${signed(sport)} ккал</b></div>${Number(c.baseDone||0)?`<div><span>Стартовая база</span><b>${signed(Number(c.baseDone||0))} ккал</b></div>`:''}${other?`<div><span>Прочие корректировки</span><b>${signed(other)} ккал</b></div>`:''}</div><div class="deficit-days47">${dates.map(date=>{const r=byDate.get(date);return `<div><time>${fmtShort47(date)}</time><span>${r.food?`🍽 ${signed(r.food)}`:''}</span><span>${r.sport?`🔥 ${signed(r.sport)}`:''}</span>${r.other?`<span>± ${signed(r.other)}</span>`:''}</div>`}).join('')||'<small>Подробная история начнёт заполняться с новыми днями.</small>'}</div></details>`;
  }
  const bankCardBefore47=bankCard;
  bankCard=function(){return bankCardBefore47()+deficitHistory47()};

  const buffsBefore47=typeof buffsView==='function'?buffsView:null;
  if(buffsBefore47)buffsView=function(){return withBuffStart47(selectedDate,()=>buffsBefore47())};

  function addBuffStartBadge47(){
    document.querySelectorAll('[data-edit-buff38]').forEach(btn=>{
      const b=(state.buffDefinitions||[]).find(x=>x.id===btn.dataset.editBuff38);if(!b?.startDate)return;
      const main=btn.closest('.buff-card23')?.querySelector('.buff-main23');if(!main||main.querySelector('.buff-start-badge47'))return;
      const badge=document.createElement('div');badge.className='buff-start-badge47';badge.textContent=`С ${fmtFull47(b.startDate)}`;main.querySelector('.buff-head23')?.after(badge);
    });
  }
  function decorateBuffStart47(id=null){
    const form=document.querySelector('#buffForm38');if(!form||form.querySelector('#buffStartDate47'))return;
    const b=id?(state.buffDefinitions||[]).find(x=>x.id===id):null,before=new Set((state.buffDefinitions||[]).map(x=>x.id));
    const label=document.createElement('label');label.id='buffStartDate47';label.innerHTML=`Дата начала бафа<input name="startDate" type="date" value="${b?.startDate||''}"><small>До этой даты баф считается ещё не начавшимся.</small>`;
    const section=form.querySelector('.buff-section23');section?.before(label);
    form.addEventListener('submit',()=>{
      const value=String(form.querySelector('[name="startDate"]')?.value||'');
      if(b)b.startDate=value||null;
      setTimeout(()=>{
        const target=b||[...(state.buffDefinitions||[])].reverse().find(x=>!before.has(x.id));if(!target)return;
        target.startDate=value||null;save();render();
      },10);
    },{capture:true,once:true});
  }

  const bindBefore47=bind;
  bind=function(){
    bindBefore47();
    document.querySelector('#calendarFocus47')?.addEventListener('change',e=>{calendarFocus47=e.currentTarget.value;localStorage.setItem(FOCUS_KEY47,calendarFocus47);render()});
    document.querySelectorAll('[data-report-date47]').forEach(b=>b.onclick=()=>{selectedDate=b.dataset.reportDate47;view='year';render();setTimeout(()=>document.querySelector('.year-detail47')?.scrollIntoView({behavior:'smooth',block:'start'}),20)});
    document.querySelectorAll('[data-edit-buff38]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>decorateBuffStart47(b.dataset.editBuff38),0)));
    document.querySelector('#addBuff38')?.addEventListener('click',()=>setTimeout(()=>decorateBuffStart47(null),0));
    requestAnimationFrame(addBuffStartBadge47);
  };

  ensureReports47();
  render();
})();