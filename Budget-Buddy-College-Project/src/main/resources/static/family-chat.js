(()=>{
  const dashboard=document.querySelector('.dashboard');
  if(!dashboard)return;

  const section=document.createElement('section');
  section.className='family-collab';
  section.innerHTML=`
    <article class="money-circle" aria-labelledby="moneyCircleTitle">
      <header class="circle-header">
        <div class="circle-title"><div class="circle-mark">💬</div><div><h2 id="moneyCircleTitle">Money Circle</h2><p>Discuss the goal, agree together, save fairly.</p></div></div>
        <div class="circle-presence" aria-label="4 family members online"><span class="avatar">D</span><span class="avatar" style="background:var(--mint)">M</span><span class="avatar" style="background:var(--cyan)">Y</span><span class="avatar" style="background:var(--purple)">B</span><i class="online-dot"></i></div>
      </header>
      <div class="circle-messages" id="familyMessages" aria-live="polite"><div class="circle-day">Family plan · Today</div></div>
      <div class="quick-money-prompts" aria-label="Quick money discussion prompts">
        <button class="money-prompt" type="button">Can we save equally this month?</button>
        <button class="money-prompt" type="button">Should we reduce the trip budget?</button>
        <button class="money-prompt" type="button">Who can contribute this week?</button>
      </div>
      <form class="circle-composer" id="familyChatForm"><input id="familyChatInput" maxlength="240" autocomplete="off" aria-label="Family money message" placeholder="Discuss the family saving plan…"><button type="submit" aria-label="Send message">➤</button></form>
    </article>
    <aside class="fair-share" aria-labelledby="fairShareTitle">
      <div class="fair-share-head"><div><h3 id="fairShareTitle">Fair Share Plan</h3><small class="muted">Equal effort, shared dream</small></div><span class="pill">6 MONTHS</span></div>
      <div class="fair-share-ring"><div><b>47.5%</b><small>funded</small></div></div>
      <div class="split-number"><small>EACH MEMBER SAVES</small><strong>₹4,375</strong><span class="muted">per month</span></div>
      <div class="split-list"><div class="split-person"><span><i></i>Dad</span><b>₹4,375</b></div><div class="split-person"><span><i style="background:var(--cyan)"></i>Mom</span><b>₹4,375</b></div><div class="split-person"><span><i style="background:var(--purple)"></i>You</span><b>₹4,375</b></div><div class="split-person"><span><i style="background:#ffc95a"></i>Brother</span><b>₹4,375</b></div></div>
      <button class="btn btn-primary equal-plan" id="equalPlanButton" type="button">✦ Start equal saving plan</button>
      <p class="plan-note">₹1,05,000 remaining ÷ 4 members ÷ 6 months.<br>Everyone contributes the same amount.</p>
    </aside>`;
  dashboard.insertAdjacentElement('afterend',section);

  const storageKey='budgetBuddyFamilyMoneyChat';
  const planKey='budgetBuddyEqualFamilyPlan';
  const defaults=[
    {sender:'Mom',avatar:'M',color:'var(--mint)',text:'We are nearly halfway to Goa! Can we choose one amount that feels fair for everyone?',time:'9:12 AM'},
    {sender:'Dad',avatar:'D',color:'var(--purple)',text:'I like the equal plan. If all four of us save ₹4,375 monthly, we can complete the remaining amount in six months.',amount:'₹4,375 each / month',time:'9:15 AM'},
    {sender:'Budget Buddy',system:true,text:'Fair plan suggested: ₹1,05,000 remaining ÷ 4 members ÷ 6 months = ₹4,375 each per month.',time:'Plan assistant'}
  ];
  let messages;
  try{messages=JSON.parse(localStorage.getItem(storageKey))||defaults}catch{messages=defaults}
  if(!Array.isArray(messages))messages=defaults;

  const list=section.querySelector('#familyMessages');
  const input=section.querySelector('#familyChatInput');
  const form=section.querySelector('#familyChatForm');
  const planButton=section.querySelector('#equalPlanButton');

  function renderMessage(message){
    const item=document.createElement('div');
    item.className=`circle-message${message.mine?' mine':''}${message.system?' system':''}`;
    if(!message.system){const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=message.avatar||'Y';if(message.color)avatar.style.background=message.color;item.appendChild(avatar)}
    const wrap=document.createElement('div');wrap.className='message-wrap';
    const meta=document.createElement('div');meta.className='message-meta';
    const name=document.createElement('b');name.textContent=message.sender||'You';
    const time=document.createElement('span');time.textContent=message.time||'Now';
    meta.append(name,time);
    const bubble=document.createElement('div');bubble.className='money-bubble';bubble.textContent=message.text;
    if(message.amount){const amount=document.createElement('span');amount.className='money-amount';amount.textContent=message.amount;bubble.append(document.createElement('br'),amount)}
    wrap.append(meta,bubble);item.appendChild(wrap);list.appendChild(item);
  }

  function persist(){localStorage.setItem(storageKey,JSON.stringify(messages.slice(-30)))}
  function render(){list.querySelectorAll('.circle-message').forEach(item=>item.remove());messages.forEach(renderMessage);list.scrollTop=list.scrollHeight}
  function send(text){const clean=text.trim();if(!clean)return;messages.push({sender:'You',avatar:'Y',color:'var(--cyan)',text:clean,time:'Now',mine:true});persist();render();input.value=''}

  form.addEventListener('submit',event=>{event.preventDefault();send(input.value)});
  section.querySelectorAll('.money-prompt').forEach(button=>button.addEventListener('click',()=>{input.value=button.textContent;input.focus()}));
  planButton.addEventListener('click',()=>{
    const active=localStorage.getItem(planKey)==='true';
    localStorage.setItem(planKey,String(!active));
    syncPlan();
    if(!active){messages.push({sender:'Budget Buddy',system:true,text:'Equal Saving Plan started. Each family member will aim for ₹4,375 per month for the next six months.',time:'Plan activated'});persist();render();if(typeof showToast==='function')showToast('Equal family saving plan started')}
    else if(typeof showToast==='function')showToast('Equal saving plan paused');
  });

  function syncPlan(){const active=localStorage.getItem(planKey)==='true';planButton.classList.toggle('active',active);planButton.textContent=active?'✓ Equal saving plan active':'✦ Start equal saving plan'}
  render();syncPlan();
})();
