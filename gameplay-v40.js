// RPG Life v40 — explicit delete action on buff cards
(function(){
  function addBuffDeleteButtons40(){
    document.querySelectorAll('[data-edit-buff38]').forEach(editButton=>{
      const id=editButton.dataset.editBuff38;
      if(!id)return;
      const actions=editButton.closest('.buff-actions23');
      if(!actions||actions.querySelector(`[data-delete-buff40="${CSS.escape(id)}"]`))return;
      const button=document.createElement('button');
      button.type='button';
      button.className='icon-button23';
      button.dataset.deleteBuff40=id;
      button.title='Удалить баф';
      button.setAttribute('aria-label','Удалить баф');
      button.textContent='×';
      actions.appendChild(button);
    });
  }

  function deleteBuff40(id){
    const buff=(state.buffDefinitions||[]).find(x=>x.id===id);
    if(!buff)return;
    if(!confirm(`Удалить баф «${buff.title||'Без названия'}»?`))return;
    state.buffDefinitions=(state.buffDefinitions||[]).filter(x=>x.id!==id);
    state.states=(state.states||[]).filter(x=>x.buffId!==id);
    save();
    render();
    if(typeof toast==='function')toast('Баф удалён');
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-delete-buff40]');
    if(!button)return;
    e.preventDefault();
    e.stopPropagation();
    deleteBuff40(button.dataset.deleteBuff40);
  });

  const renderBefore40=render;
  render=function(){
    const result=renderBefore40();
    requestAnimationFrame(addBuffDeleteButtons40);
    return result;
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(addBuffDeleteButtons40),{once:true});
  }else requestAnimationFrame(addBuffDeleteButtons40);
})();
