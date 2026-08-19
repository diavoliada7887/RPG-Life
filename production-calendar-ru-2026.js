// RPG Life — производственный календарь РФ, пятидневная рабочая неделя, 2026.
// Источник: Постановление Правительства РФ от 24.09.2025 № 1466
// и производственный календарь Государственной Думы РФ.
(function(){
  const range=(from,to)=>{
    const out=[];
    const d=new Date(from+'T12:00:00');
    const end=new Date(to+'T12:00:00');
    while(d<=end){
      out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
      d.setDate(d.getDate()+1);
    }
    return out;
  };

  window.RPGProductionCalendarRU=window.RPGProductionCalendarRU||{};
  window.RPGProductionCalendarRU[2026]={
    country:'RU',
    week:'5/2',
    workingDays:247,
    nonWorking:[
      ...range('2026-01-01','2026-01-11'),
      ...range('2026-02-21','2026-02-23'),
      ...range('2026-03-07','2026-03-09'),
      ...range('2026-05-01','2026-05-03'),
      ...range('2026-05-09','2026-05-11'),
      ...range('2026-06-12','2026-06-14'),
      '2026-11-04',
      '2026-12-31'
    ],
    workingWeekends:[],
    shortened:['2026-04-30','2026-05-08','2026-06-11','2026-11-03'],
    source:'Постановление Правительства РФ от 24.09.2025 № 1466'
  };
})();
