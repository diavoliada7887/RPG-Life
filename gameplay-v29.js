// RPG Life v29 — writer buff tiers + move character states to the bottom
(function(){
  const DAY=86400000;
  const localDate29=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const parse29=d=>new Date(d+'T12:00:00');
  const iso29=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const shift29=(date,n)=>{const d=parse29(date);d.setDate(d.getDate()+n);return iso29(d)};

  state.buffDefinitions=state.buffDefinitions||[];
  state.states=state.states||[];

  const writerSeed29={id:'buff-writer',title:'Ты — писатель!',description:'Сентир был живой работой как минимум в пяти разных днях за последние семь дней. Любая работа над линией считается.',mode:'manual',practiceIds:[],windowDays:7,startOffsetDays:0,resourceEffects:{},rewardGold:0,rewardDiamonds:0,imageData:''};
  const writerStrongSeed29={id:'buff-writer-strong',title:'Голос набрал силу',description:'Писательская неделя усилена объёмом: работа над Сентиром шла минимум пять дней, а за последние семь дней написано не меньше 5000 слов.',mode:'manual',practiceIds:[],windowDays:7,startOffsetDays:0,resourceEffects:{},rewardGold:0,rewardDiamonds:0,imageData:''};

  function ensureWriterBuffs29(){
    let changed=false;
    [writerSeed29,writerStrongSeed29].forEach(seed=>{
      if(!state.buffDefinitions.some(b=>b.id===seed.id)){
        state.buffDefinitions.push(JSON.parse(JSON.stringify(seed)));changed=true;
      }
    });
    return changed;
  }

  function sentirStats29(date=localDate29()){
    const from=shift29(date,-6),days=new Set();let words=0;
    const sentirPracticeIds=new Set((state.practices||[]).filter(p=>p.creativeLineId==='sentir').map(p=>p.id));
    (state.practiceLogs||[]).forEach(l=>{
      if(!sentirPracticeIds.has(l.practiceId)||l.date<from||l.date>date)return;
      days.add(l.date);
      Object.entries(l.metrics||{}).forEach(([k,v])=>{if(String(k).toLowerCase().includes('слов'))words+=Math.max(0,Number(v)||0)});
    });
    (state.creativeLogs||[]).forEach(l=>{
      if(l.lineId!=='sentir'||l.date<from||l.date>date)return;
      days.add(l.date);
      if(String(l.unit||'').toLowerCase().includes('слов'))words+=Math.max(0,Number(l.amount)||0);
    });
    return {days:days.size,words:Math.round(words)};
  }

  function syncWriterState29(){
    const stats=sentirStats29(),strong=stats.days>=5&&stats.words>=5000,basic=stats.days>=5;
    const before=JSON.stringify((state.states||[]).filter(s=>s.buffId==='buff-writer'||s.buffId==='buff-writer-strong'));
    state.states=(state.states||[]).filter(s=>s.buffId!=='buff-writer'&&s.buffId!=='buff-writer-strong');
    if(strong){
      state.states.push({id:'auto-buff-writer-strong',type:'buff',buffId:'buff-writer-strong',title:'Голос набрал силу',note:`${stats.days} дней работы над Сентиром · ${stats.words.toLocaleString('ru-RU')} слов за 7 дней`,date:localDate29(),auto:true});
    }else if(basic){
      state.states.push({id:'auto-buff-writer',type:'buff',buffId:'buff-writer',title:'Ты — писатель!',note:`${stats.days} дней работы над Сентиром за последние 7 дней`,date:localDate29(),auto:true});
    }
    const after=JSON.stringify((state.states||[]).filter(s=>s.buffId==='buff-writer'||s.buffId==='buff-writer-strong'));
    return before!==after;
  }

  function moveStatesBottom29(html){
    const re=/<article class="v2-card v2-span-12 states-top">[\s\S]*?<\/article>/;
    const m=html.match(re);if(!m)return html;
    const without=html.replace(re,'');
    return without.replace('</section></div>',`${m[0]}</section></div>`);
  }

  const todayBefore29=todayView;
  todayView=function(){return moveStatesBottom29(todayBefore29())};

  const renderBefore29=render;
  render=function(){
    let changed=ensureWriterBuffs29();
    if(syncWriterState29())changed=true;
    if(changed)save();
    return renderBefore29();
  };

  let changed=ensureWriterBuffs29();if(syncWriterState29())changed=true;if(changed)save();
  render();
})();