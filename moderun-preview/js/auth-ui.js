/* MODERUN Auth — Supabase v2; never emulate accounts locally. */
(() => {
'use strict';
const cfg=window.MODERUN_CONFIG||{};
const page=document.body.dataset.authPage||'';
const status=document.getElementById('auth-status');
const url=String(cfg.AUTH_SUPABASE_URL||'').trim(),key=String(cfg.AUTH_SUPABASE_PUBLISHABLE_KEY||'').trim();
const ready=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)&&key.length>30;
const storageKey='moderun-auth-token';
const sessionFlag='moderun-session-only';
const store={
  getItem(k){try{return sessionStorage.getItem(k)||localStorage.getItem(k)}catch(_){return null}},
  setItem(k,v){try{const dst=sessionStorage.getItem(sessionFlag)==='yes'?sessionStorage:localStorage;localStorage.removeItem(k);sessionStorage.removeItem(k);dst.setItem(k,v)}catch(_){}},
  removeItem(k){try{sessionStorage.removeItem(k);localStorage.removeItem(k)}catch(_){}}
};
const path=p=>new URL(p,location.href).href;
const btns=[...document.querySelectorAll('[data-auth-submit]')];
function message(s,type=''){if(!status)return;status.textContent=s;status.className='auth-status show '+(type==='error'?'error':type==='success'?'success':'');status.setAttribute('role',type==='error'?'alert':'status')}
function loading(b){btns.forEach(x=>{if(!x.dataset.default)x.dataset.default=x.textContent;x.disabled=b;x.textContent=b?'처리 중…':x.dataset.default})}
function noBackend(){if(page){message('인증 서비스 연결 전입니다. 현재 화면을 확인할 수 있지만 실제 계정을 만들거나 로그인할 수는 없습니다.','error');btns.forEach(b=>b.disabled=true)}}
function loadLib(){if(window.supabase?.createClient)return Promise.resolve(window.supabase);return new Promise((yes,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4';s.onload=()=>window.supabase?.createClient?yes(window.supabase):no(Error('Auth SDK unavailable'));s.onerror=()=>no(Error('Auth SDK download failed'));document.head.appendChild(s)})}
function updateHeader(user){document.querySelectorAll('[data-auth-nav]').forEach(a=>{a.textContent=user?'내 계정':'로그인';a.href=user?'account.html':'login.html';a.setAttribute('aria-label',user?'내 계정 열기':'로그인 화면 열기')})}
async function run(){
  if(!ready){noBackend();window.dispatchEvent(new Event('moderun:auth-unavailable'));return}
  let auth;
  try{
    const lib=await loadLib();
    auth=lib.createClient(url,key,{auth:{storageKey,storage:store,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    window.MODERUN_AUTH_CLIENT=auth;
    window.dispatchEvent(new Event('moderun:auth-ready'));
  }catch(_){if(page)message('인증 서비스 연결에 실패했습니다. 나중에 다시 시도해 주세요.','error');window.dispatchEvent(new Event('moderun:auth-unavailable'));return}
  auth.auth.onAuthStateChange((event,session)=>{
    updateHeader(session?.user||null);
    if(page==='reset'&&event==='PASSWORD_RECOVERY'){document.getElementById('password-request')?.setAttribute('hidden','');document.getElementById('password-update')?.removeAttribute('hidden');message('새 비밀번호를 입력해 주세요.')}
  });
  const state=await auth.auth.getSession();
  updateHeader(state.data?.session?.user||null);
  if(!page)return;
  if(page==='login'&&state.data?.session){const next=new URLSearchParams(location.search).get('next');location.replace(path(next==='contact.html'?'contact.html':'account.html'));return}
  if(page==='login'&&new URLSearchParams(location.search).has('verified'))message('이메일 인증을 완료했다면 로그인해 주세요.');
  if(page==='account'){
    const {data,error}=await auth.auth.getUser();
    if(error||!data.user){message('로그인이 필요합니다. 로그인 화면에서 접속해 주세요.','error');return}
    document.getElementById('account-content').hidden=false;
    document.getElementById('account-email').textContent=data.user.email||'-';
    document.getElementById('account-name').textContent=data.user.user_metadata?.nickname||'회원';
    document.getElementById('auth-logout')?.addEventListener('click',async()=>{
      loading(true);const {error}=await auth.auth.signOut();loading(false);
      if(error)message('로그아웃에 실패했습니다.','error');else{store.removeItem(storageKey);location.assign(path('login.html'))}
    });
    return;
  }
  if(page==='reset'){
    const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1));
    if(q.get('mode')==='update'||h.get('type')==='recovery'){
      document.getElementById('password-request').hidden=true;
      document.getElementById('password-update').hidden=false;
      if(!state.data?.session)message('이 링크가 만료되었을 수 있습니다. 비밀번호 재설정 이메일을 다시 요청해 주세요.','error');
    }
  }
  const forms=[...document.querySelectorAll('form[data-auth-action]')];
  for(const form of forms)form.addEventListener('submit',async e=>{
    e.preventDefault();if(!form.reportValidity())return;loading(true);
    const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
    try{
      if(form.dataset.authAction==='login'){
        if(f.has('remember'))sessionStorage.removeItem(sessionFlag);else sessionStorage.setItem(sessionFlag,'yes');
        store.removeItem(storageKey);
        const {error}=await auth.auth.signInWithPassword({email,password});if(error)throw error;
        const next=new URLSearchParams(location.search).get('next');
        location.assign(path(next==='contact.html'?'contact.html':'account.html'));
      }else if(form.dataset.authAction==='signup'){
        if(password.length<8)throw Error('비밀번호는 8자 이상이어야 합니다.');
        if(password!==String(f.get('confirm')||''))throw Error('비밀번호 확인이 일치하지 않습니다.');
        const {error}=await auth.auth.signUp({email,password,options:{data:{nickname:String(f.get('nickname')||'').trim()},emailRedirectTo:path('login.html?verified=1')}});
        if(error)throw error;
        form.reset();message('가입 요청을 접수했습니다. 이메일 인증이 설정되어 있다면 메일함의 인증 링크를 확인해 주세요.','success');
      }else if(form.dataset.authAction==='request'){
        const {error}=await auth.auth.resetPasswordForEmail(email,{redirectTo:path('reset-password.html?mode=update')});
        if(error)throw error;
        message('계정이 존재한다면 비밀번호 재설정 이메일을 보냈습니다. 메일함을 확인해 주세요.','success');
      }else if(form.dataset.authAction==='update'){
        if(password.length<8)throw Error('비밀번호는 8자 이상이어야 합니다.');
        if(password!==String(f.get('confirm')||''))throw Error('비밀번호 확인이 일치하지 않습니다.');
        const {error}=await auth.auth.updateUser({password});if(error)throw error;
        message('비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.','success');
        setTimeout(()=>location.assign(path('login.html')),1600);
      }
    }catch(ex){
      const s=String(ex.message||'').toLowerCase();let msg='처리할 수 없습니다. 잠시 뒤 다시 시도해 주세요.';
      if(s.includes('invalid login')||s.includes('invalid credentials'))msg='이메일 또는 비밀번호를 확인해 주세요.';
      else if(s.includes('rate limit'))msg='요청이 많습니다. 잠시 후 다시 시도해 주세요.';
      else if(s.includes('비밀번호'))msg=ex.message;
      message(msg,'error');
    }finally{loading(false)}
  });
}
run().catch(()=>{if(page)message('인증 서비스를 사용할 수 없습니다.','error')});
})();