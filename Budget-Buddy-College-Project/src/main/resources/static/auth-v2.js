(()=>{
  const root=document.documentElement;
  const body=document.body;
  const card=document.querySelector('#authFlipCard');
  const signInFace=document.querySelector('#signinFace');
  const signUpFace=document.querySelector('#signupFace');
  const signInStatus=document.querySelector('#signInStatus');
  const signUpStatus=document.querySelector('#signUpStatus');
  let signupMode=false;

  function setMode(signup,updateUrl=true){
    signupMode=signup;
    body.classList.add('flipping');
    card.classList.toggle('flipped',signup);
    signInFace.toggleAttribute('inert',signup);
    signUpFace.toggleAttribute('inert',!signup);
    signInFace.setAttribute('aria-hidden',String(signup));
    signUpFace.setAttribute('aria-hidden',String(!signup));
    document.title=`${signup?'Create account':'Sign in'} — Budget Buddy`;
    if(updateUrl){const url=new URL(location.href);signup?url.searchParams.set('mode','signup'):url.searchParams.delete('mode');history.replaceState({},'',url)}
    setTimeout(()=>{body.classList.remove('flipping');document.querySelector(signup?'#signUpName':'#signInEmail')?.focus({preventScroll:true})},880);
  }

  document.querySelector('#toSignup').addEventListener('click',()=>setMode(true));
  document.querySelector('#toSignin').addEventListener('click',()=>setMode(false));
  setMode(new URLSearchParams(location.search).get('mode')==='signup',false);

  document.querySelectorAll('[data-password]').forEach(button=>button.addEventListener('click',()=>{
    const field=document.querySelector(`#${button.dataset.password}`);
    const reveal=field.type==='password';
    field.type=reveal?'text':'password';
    button.textContent=reveal?'◎':'◉';
    button.setAttribute('aria-label',reveal?'Hide password':'Show password');
  }));

  function enterApp(name,email,session){
    localStorage.setItem('budgetBuddyUser',name||email.split('@')[0]||'Budget Buddy User');
    localStorage.setItem('budgetBuddyEmail',email);
    localStorage.setItem('budgetBuddyAccessToken',session.access_token);
    localStorage.setItem('budgetBuddyRefreshToken',session.refresh_token||'');
    localStorage.removeItem('budgetBuddyDemoAuth');
    location.href='/app';
  }

  document.querySelector('#signInForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const email=document.querySelector('#signInEmail').value.trim();
    const password=document.querySelector('#signInPassword').value;
    signInStatus.textContent='Signing in securely…';
    signInStatus.style.color='var(--mint)';
    try{
      const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const session=await response.json();
      if(!response.ok)throw new Error(session.error||'Unable to sign in.');
      const name=session.user?.user_metadata?.full_name||session.user?.user_metadata?.name||email.split('@')[0];
      enterApp(name,email,session);
    }catch(error){signInStatus.textContent=error.message;signInStatus.style.color='#ff929b'}
  });

  document.querySelector('#signUpForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const name=document.querySelector('#signUpName').value.trim();
    const email=document.querySelector('#signUpEmail').value.trim();
    const password=document.querySelector('#signUpPassword').value;
    signUpStatus.textContent='Creating your secure money space…';
    signUpStatus.style.color='var(--mint)';
    try{
      const response=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to create account.');
      enterApp(name,email,result);
    }catch(error){signUpStatus.textContent=error.message;signUpStatus.style.color='#ff929b'}
  });

  document.querySelector('#forgotPassword').addEventListener('click',event=>{
    event.preventDefault();
    signInStatus.textContent='Password recovery is not enabled yet. Please contact the app administrator.';
    signInStatus.style.color='var(--cyan)';
  });

  const themeButton=document.querySelector('#authTheme');
  themeButton.textContent=root.dataset.theme==='light'?'☀':'◐';
  themeButton.addEventListener('click',()=>{const next=root.dataset.theme==='light'?'dark':'light';root.dataset.theme=next;localStorage.setItem('budgetBuddyTheme',next);themeButton.textContent=next==='light'?'☀':'◐'});
})();
