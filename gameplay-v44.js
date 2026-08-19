// RPG Life v44 — Houses: cumulative life architecture instead of meaningless branch weights.
(function(){
  const houseMeta44={
    health:{name:'Дом Тела',short:'Тело',icon:'✚',element:'Земля',art:'assets/rpg/bar_body_earth_01.png',note:'Сила, выносливость, восстановление и телесная опора.'},
    presence:{name:'Дом Присутствия',short:'Присутствие',icon:'✦',element:'Сияние',art:'',note:'Уход, внешний облик и ощущение собранного персонажа.'},
    work:{name:'Кузница Дела',short:'Работа',icon:'⚒',element:'Огонь',art:'assets/rpg/bar_work_fire_01.png',note:'Работа, производство, большие законченные вещи и удары по боссам.'},
    creative:{name:'Башня Творчества',short:'Творчество',icon:'✒',element:'Воздух',art:'assets/rpg/bar_creative_air_01.png',note:'Письмо, музыка, живопись и всё, чего раньше не существовало.'},
    study:{name:'Обсерватория Знания',short:'Обучение',icon:'⌁',element:'Аркана',art:'assets/rpg/bar_study_arcane_01.png',note:'Учёба, исследование, освоение нового и расширение карты мира.'},
    publicity:{name:'Маяк',short:'Публичность',icon:'◉',element:'Вода',art:'assets/rpg/bar_publicity_water_01.png',note:'Выход в мир: публикации, выступления, релизы и видимость.'},
    infrastructure:{name:'Усадьба',short:'Инфраструктура',icon:'⌂',element:'Очаг',art:'assets/rpg/bar_infrastructure_home_01.png',note:'Быт, порядок, подготовленная среда и невидимая работа, на которой всё стоит.'}
  };
  const thresholds44=[0,80,200,420,750,1200,1800,2600,3600,4800,6300,8200,10500];
  const stageNames44=['Пустырь','Фундамент','Первые стены','Дом','Обжитый дом','Усадьба','Квартал','Поселение','Малый город','Город','Большой город','Столица','Легендарное владение'];
  const RESOURCE_META44={inspiration:{name:'Вдохновение',icon:'✦'},calm:{name:'Спокойствие',icon:'☾'},energy:{name:'Энергия',icon:'⚡'},recognition:{name:'Узнавание',icon:'◈'}};
  const DAY=86400000;
  const parse44=d=>new Date(String(d)+'T12:00:00');
  const localDate44=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const clamp44=(n,a,b)=>Math.max(a,Math.min(b,n));

  function branchOrder44(p){
    return Object.entries(p?.branches||{}).filter(([k,v])=>houseMeta44[k]&&Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1])).map(([k])=>k);
  }
  function primary44(p){return p?.housePrimary&&houseMeta44[p.housePrimary]?p.housePrimary:branchOrder44(p)[0]||'health'}
  function secondary44(p){
    if(p?.houseSecondary&&houseMeta44[p.houseSecondary]&&p.houseSecondary!==primary44(p))return p.houseSecondary;
    return branchOrder44(p).find(k=>k!==primary44(p))||'';
  }
  function contribution44(p,key){
    if(primary44(p)===key)return 10;
    if(secondary44(p)===key)return 4;
    return 0;
  }

  function buildLedger44(){
    const perDay={};
    const add=(date,key,n,source)=>{
      if(!date||!houseMeta44[key]||!n)return;
      const bucket=perDay[date]||(perDay[date]={});
      const h=bucket[key]||(bucket[key]={raw:0,bonus:0,sources:[]});
      h.raw+=n;h.sources.push(source);
    };

    const uniquePractice=new Set();
    (state.practiceLogs||[]).forEach(log=>{
      const token=`${log.date}:${log.practiceId}`;if(uniquePractice.has(token))return;uniquePractice.add(token);
      const p=(state.practices||[]).find(x=>x.id===log.practiceId);if(!p)return;
      const pk=primary44(p),sk=secondary44(p);
      add(log.date,pk,10,p.name||'Практика');
      if(sk)add(log.date,sk,4,p.name||'Практика');
    });

    const uniqueCreative=new Set();
    (state.creativeLogs||[]).forEach(log=>{
      const token=`${log.date}:${log.lineId||'creative'}`;if(uniqueCreative.has(token))return;uniqueCreative.add(token);
      const line=(state.creativeLines||[]).find(x=>x.id===log.lineId);
      add(log.date,'creative',10,line?.title||'Творчество');
    });

    const uniqueBoss=new Set();
    (state.bossHitLog||[]).forEach(hit=>{
      const token=`${hit.date}:${hit.bossId}`;if(uniqueBoss.has(token))return;uniqueBoss.add(token);
      const boss=(state.bosses||[]).find(x=>x.id===hit.bossId);
      add(hit.date,'work',10,boss?.title||'Босс');
    });

    (state.achievements||[]).filter(a=>a.type==='bossVictory'&&a.date).forEach(a=>{
      const bucket=perDay[a.date]||(perDay[a.date]={}),h=bucket.work||(bucket.work={raw:0,bonus:0,sources:[]});
      h.bonus+=100;h.sources.push(a.title||'Победа над боссом');
    });

    const houses={};Object.keys(houseMeta44).forEach(k=>houses[k]={xp:0,days:0,last:'',lastGain:0});
    Object.entries(perDay).forEach(([date,buckets])=>{
      Object.entries(buckets).forEach(([key,data])=>{
        // Ordinary construction is capped per House per day. Boss victories are landmarks and sit outside the cap.
        const normal=Math.min(20,Math.max(0,data.raw||0));
        const finalGain=normal+Math.max(0,data.bonus||0);
        houses[key].xp+=finalGain;
        if(finalGain>0){houses[key].days++;if(!houses[key].last||date>houses[key].last){houses[key].last=date;houses[key].lastGain=finalGain}}
      });
    });
    return houses;
  }

  function level44(xp){let l=0;for(let i=0;i<thresholds44.length;i++)if(xp>=thresholds44[i])l=i;return l}
  function stats44(key,ledger){
    const x=ledger[key]||{xp:0,days:0,last:'',lastGain:0},level=level44(x.xp),start=thresholds44[level]||0,next=thresholds44[level+1]??null;
    const pct=next===null?100:clamp44(Math.round((x.xp-start)/(next-start)*100),0,100);
    return {...x,level,start,next,pct,stage:stageNames44[level]||`Уровень ${level}`};
  }
  function formatLast44(date){if(!date)return'ещё не строился';const age=Math.floor((parse44(localDate44())-parse44(date))/DAY);if(age===0)return'сегодня';if(age===1)return'вчера';return fmt(date)}
  function practicesFor44(key){return (state.practices||[]).filter(p=>primary44(p)===key||secondary44(p)===key)}

  function houseCard44(key,ledger){
    const m=houseMeta44[key],s=stats44(key,ledger),ps=practicesFor44(key),art=m.art?`<img src="${m.art}" alt="" draggable="false">`:'';
    const nextText=s.next===null?'Максимальная стадия':`До следующей стадии ${(s.next-s.xp).toLocaleString('ru-RU')} строительства`;
    const practiceTags=key==='creative'
      ? (state.creativeLines||[]).map(l=>`<button class="house-practice44" data-edit-line="${l.id}">${esc(l.title)}</button>`).join('')
      : key==='work'
        ? (state.projects||[]).filter(p=>p.status==='active').map(p=>`<span class="house-practice44 static">${esc(p.title)}</span>`).join('')
        : ps.map(p=>`<button class="house-practice44" data-edit-practice="${p.id}">${esc(p.name)}${primary44(p)===key?'':' · +4'}</button>`).join('');
    const addButton=!['work','creative'].includes(key)?`<button class="soft house-add44" data-add-practice="${key}">＋ практика</button>`:'';
    return `<article class="house-card44 house-${key}44">
      <div class="house-art44">${art}<span class="house-icon44">${m.icon}</span></div>
      <div class="house-body44">
        <div class="house-title44"><div><div class="v2-kicker">${esc(m.element)} · стадия ${s.level}/${thresholds44.length-1}</div><h2>${esc(m.name)}</h2></div><strong>${s.xp.toLocaleString('ru-RU')}</strong></div>
        <p>${esc(m.note)}</p>
        <div class="house-stage44"><span>${esc(s.stage)}</span><small>${nextText}</small></div>
        <div class="house-progress44"><i style="width:${s.pct}%"></i></div>
        <div class="house-facts44"><span><b>${s.days}</b><small>дней строительства</small></span><span><b>${formatLast44(s.last)}</b><small>последний вклад</small></span></div>
        <details class="house-details44"><summary>Что строит это владение <span>▾</span></summary><div class="house-practices44">${practiceTags||'<span class="v2-sub">Пока ничто.</span>'}${addButton}</div></details>
      </div>
    </article>`;
  }

  function economyLegend44(){return `<article class="house-rules44">
    <div><div class="v2-kicker">Как строится мир</div><h2>Действие становится кирпичом</h2></div>
    <div class="house-rule-grid44">
      <div><b>+10</b><span>основному Дому за выполненную практику</span></div>
      <div><b>+4</b><span>дополнительному Дому, если он указан</span></div>
      <div><b>20</b><span>максимум строительства одного Дома за день — фарм не нужен</span></div>
      <div><b>+100</b><span>Кузнице за настоящую победу над боссом</span></div>
    </div>
    <p>Ничего не сгорает. Неделя тишины не отнимает ни стену, ни этаж, ни уже прожитую историю.</p>
  </article>`}

  branchesView=function(){
    const ledger=buildLedger44();
    return `<div class="v2-wrap houses-page44">
      <div class="houses-hero44"><div><div class="v2-kicker">Владения персонажа</div><h1 class="v2-title">То, что уже построено жизнью</h1><p>Домики — накопленная часть персонажа. Ресурсы на экране дня — погода сейчас. Одно не заменяет другое.</p></div></div>
      ${economyLegend44()}
      <div class="houses-grid44">${Object.keys(houseMeta44).map(k=>houseCard44(k,ledger)).join('')}</div>
    </div>`;
  };

  function houseOptions44(selected='',empty=false){
    const first=empty?'<option value="">Нет</option>':'';
    return first+Object.entries(houseMeta44).map(([k,m])=>`<option value="${k}" ${selected===k?'selected':''}>${esc(m.name)}</option>`).join('');
  }
  function variantsText44(p){return (p?.variants||[]).map(v=>`${v.name}|${v.kcal||0}`).join('; ')}
  function split44(v){return String(v||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean)}
  function signed44(n){return Math.max(-20,Math.min(20,Math.round(Number(n)||0)))}

  // Replace the old engineering-style branch weights with one main House + optional secondary House.
  openPracticeEditor=function(id,branch){
    const p=id?(state.practices||[]).find(x=>x.id===id):null;
    const main=p?primary44(p):(houseMeta44[branch]?branch:'health'),second=p?secondary44(p):'';
    const r=p?.rhythm||{type:'timesWeek',value:1},fx=p?.resourceEffects||{};
    openModal(`<div class="modal-head"><div><div class="v2-kicker">Практика</div><h2>${p?'Изменить':'Добавить'}</h2></div><button class="close">×</button></div><form id="practiceFormV44">
      <label>Название<input name="name" required value="${esc(p?.name||'')}"></label>
      <section class="house-editor44"><div><b>Что это строит</b><small>Это накопленная часть персонажа. Выполнение не сгорает со временем.</small></div><label>Основной Дом<select name="housePrimary">${houseOptions44(main)}</select></label><label>Дополнительный Дом <small>необязательно, получает меньший вклад</small><select name="houseSecondary">${houseOptions44(second,true)}</select></label></section>
      <section class="house-editor44 resource-editor44"><div><b>Состояние после действия</b><small>Это временная погода персонажа, а не развитие Дома.</small></div>${Object.entries(RESOURCE_META44).map(([k,m])=>`<div class="weight-row"><span>${m.icon} ${m.name}</span><input name="resource_${k}" type="number" min="-20" max="20" step="1" value="${Number(fx[k]||0)}"></div>`).join('')}<label>Эффект действует, дней<input name="resourceEffectDays" type="number" min="1" max="365" value="${Math.max(1,Number(p?.resourceEffectDays||1))}"></label></section>
      <label>Желательный ритм<select name="rhythmType"><option value="timesWeek" ${r.type==='timesWeek'?'selected':''}>N раз в неделю</option><option value="weeklyAmount" ${r.type==='weeklyAmount'?'selected':''}>Количество за неделю</option><option value="daily" ${r.type==='daily'?'selected':''}>Ежедневно</option><option value="everyDays" ${r.type==='everyDays'?'selected':''}>Раз в N дней</option><option value="soft" ${r.type==='soft'?'selected':''}>Без жёсткой частоты</option></select></label>
      <div class="form-grid"><label>Число<input name="rhythmValue" type="number" min="0" value="${r.value??''}"></label><label>Единица<input name="unit" value="${esc(r.unit||'')}"></label></div>
      <label>Показатели<input name="metrics" value="${esc((p?.metrics||[]).join('; '))}"></label>
      <label>Варианты дневной записи и расход<input name="variants" value="${esc(variantsText44(p))}" placeholder="Интервалка|200; Ноги|150"></label>
      ${p?.id==='steps'?`<div class="form-grid"><label>Шагов в правиле<input name="stepAmount" type="number" value="${p.calorieRule?.amount||10000}"></label><label>ккал за это количество<input name="stepKcal" type="number" value="${p.calorieRule?.kcal||0}"></label></div>`:''}
      <label class="quiet-practice-toggle"><input type="checkbox" name="hideFromTimeline" ${p?.hideFromTimeline?'checked':''}><span><b>Не отмечать в глобальном календаре и неделе</b><small>Практика всё равно строит Дом и влияет на ресурсы.</small></span></label>
      <div class="modal-actions"><button class="primary">Сохранить</button>${p?`<button type="button" class="danger-soft" id="deletePracticeV44">Удалить</button>`:''}</div>
    </form>`);
    const form=document.querySelector('#practiceFormV44');
    form.onsubmit=e=>{
      e.preventDefault();const f=new FormData(form),target=p||{id:uid()},main=String(f.get('housePrimary')||'health'),second=String(f.get('houseSecondary')||'');
      const branches={[main]:10};if(second&&second!==main)branches[second]=4;
      const effects={};Object.keys(RESOURCE_META44).forEach(k=>{const v=signed44(f.get('resource_'+k));if(v)effects[k]=v});
      const type=String(f.get('rhythmType')||'soft'),val=Number(f.get('rhythmValue'))||null,rhythm={type};
      if(['timesWeek','everyDays'].includes(type))rhythm.value=val||1;
      if(type==='weeklyAmount'){rhythm.value=val||1;rhythm.unit=String(f.get('unit')||'ед.');}
      const variants=split44(f.get('variants')).map(x=>{const [name,kcal]=x.split('|');return {name:String(name||'').trim(),kcal:Number(kcal)||0}}).filter(x=>x.name);
      Object.assign(target,{name:String(f.get('name')||'').trim(),housePrimary:main,houseSecondary:second&&second!==main?second:'',branches,rhythm,metrics:split44(f.get('metrics')),variants,resourceEffects:effects,resourceEffectDays:Math.max(1,Math.min(365,Number(f.get('resourceEffectDays'))||1)),hideFromTimeline:f.get('hideFromTimeline')==='on'});
      if(target.id==='steps')target.calorieRule={amount:Number(f.get('stepAmount'))||10000,kcal:Number(f.get('stepKcal'))||0};
      if(!p)state.practices.push(target);save();document.querySelector('#modal')?.close();render();
    };
    document.querySelector('#deletePracticeV44')?.addEventListener('click',()=>{if(confirm('Удалить практику? Старые записи останутся в истории.')){state.practices=state.practices.filter(x=>x.id!==p.id);save();document.querySelector('#modal')?.close();render()}});
  };

  // One-time normalization: preserve existing meaning but make future editing explicit.
  let changed44=false;
  (state.practices||[]).forEach(p=>{
    const main=primary44(p),second=secondary44(p);
    if(!p.housePrimary){p.housePrimary=main;changed44=true}
    if(p.houseSecondary===undefined){p.houseSecondary=second;changed44=true}
  });
  if(changed44)save();

  function patchNav44(){
    const memory=document.querySelector('[data-nav="memory"]');if(memory)memory.remove();
    const branches=document.querySelector('[data-nav="branches"] small');if(branches)branches.textContent='Владения';
  }
  patchNav44();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchNav44,{once:true});
  render();
})();
