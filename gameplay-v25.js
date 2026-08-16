// RPG Life v25 — make creative practice defaults survive cloud state hydration
(function(){
  const defaults25=[
    {id:'creative-sentir-morning',creativeLineId:'sentir',name:'Утреннее письмо',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Слов','Минут'],variants:[],resourceEffects:{inspiration:3},resourceEffectDays:1},
    {id:'creative-sentir-world',creativeLineId:'sentir',name:'Разработка Сентира',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Обдумывание',kcal:0},{name:'Миростроение',kcal:0},{name:'Структура',kcal:0},{name:'Сцена',kcal:0},{name:'Исследование',kcal:0}],resourceEffects:{inspiration:3},resourceEffectDays:1},
    {id:'creative-sentir-material',creativeLineId:'sentir',name:'Сбор материала',branches:{creative:15},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Чтение',kcal:0},{name:'Исследование',kcal:0},{name:'Референсы',kcal:0},{name:'Заметки',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1},
    {id:'creative-music-practice',creativeLineId:'music',name:'Музыкальная практика',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Вокал',kcal:0},{name:'Гитара',kcal:0},{name:'Слух',kcal:0},{name:'Техника',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1},
    {id:'creative-music-making',creativeLineId:'music',name:'Создание музыки',branches:{creative:20},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Текст',kcal:0},{name:'Мелодия',kcal:0},{name:'Аранжировка',kcal:0},{name:'Запись',kcal:0}],resourceEffects:{inspiration:4},resourceEffectDays:1},
    {id:'creative-painting-practice',creativeLineId:'painting',name:'Живописная практика',branches:{creative:15},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Практика',kcal:0},{name:'Этюд',kcal:0},{name:'Картина',kcal:0},{name:'Исследование',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1},
    {id:'creative-calligraphy-practice',creativeLineId:'calligraphy',name:'Каллиграфическая практика',branches:{creative:15},rhythm:{type:'timesWeek',value:1},metrics:['Минут'],variants:[{name:'Практика',kcal:0},{name:'Композиция',kcal:0},{name:'Эксперимент',kcal:0}],resourceEffects:{inspiration:2},resourceEffectDays:1}
  ];
  function ensure25(){
    state.practices=state.practices||[];
    let changed=false;
    defaults25.forEach(seed=>{if(!state.practices.some(p=>p.id===seed.id||(p.creativeLineId===seed.creativeLineId&&String(p.name||'').trim().toLowerCase()===seed.name.toLowerCase()))){state.practices.push(JSON.parse(JSON.stringify(seed)));changed=true}});
    return changed;
  }
  const previousRender25=render;
  render=function(){if(ensure25())save();return previousRender25()};
  if(ensure25())save();
  render();
})();