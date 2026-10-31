(()=>{
  const root=document.documentElement;
  const nav=document.querySelector('#landingNav');
  const stage=document.querySelector('#heroStage');
  const dashboard=document.querySelector('#dashboard3d');
  const themeButton=document.querySelector('#landingTheme');
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

  addEventListener('scroll',()=>nav?.classList.toggle('scrolled',scrollY>20),{passive:true});

  if(stage&&dashboard&&!reduceMotion&&matchMedia('(pointer:fine)').matches){
    stage.addEventListener('pointermove',event=>{
      const box=stage.getBoundingClientRect();
      const x=(event.clientX-box.left)/box.width-.5;
      const y=(event.clientY-box.top)/box.height-.5;
      dashboard.style.setProperty('--ry',`${x*15-5}deg`);
      dashboard.style.setProperty('--rx',`${y*-12+4}deg`);
    });
    stage.addEventListener('pointerleave',()=>{dashboard.style.setProperty('--ry','-7deg');dashboard.style.setProperty('--rx','5deg')});
  }

  themeButton?.addEventListener('click',()=>{
    const next=root.dataset.theme==='light'?'dark':'light';
    root.dataset.theme=next;
    localStorage.setItem('budgetBuddyTheme',next);
    themeButton.textContent=next==='light'?'☀':'◐';
  });
  if(themeButton)themeButton.textContent=root.dataset.theme==='light'?'☀':'◐';

  const items=document.querySelectorAll('.reveal');
  if(reduceMotion){items.forEach(item=>item.classList.add('visible'))}
  else{
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
    items.forEach(item=>observer.observe(item));
  }
})();
