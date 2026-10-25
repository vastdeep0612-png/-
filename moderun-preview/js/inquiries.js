/* MODERUN signed-in inquiry submissions.
   Guests continue using site.js local-file draft export. */
(() => {
  'use strict';
  const form=document.getElementById('inquiry-form');
  if(!form)return;
  const banner=document.getElementById('connection-notice');
  const note=document.getElementById('form-mode-note');
  const submit=document.getElementById('inquiry-submit');
  const status=document.getElementById('form-message');
  let client=null,member=null,sending=false;
  const guest=document.getElementById('inquiry-guest-entry');
  const emailForm=document.getElementById('inquiry-email-form');
  const emailStatus=document.getElementById('inquiry-email-status');
  const message=(msg,error=false)=>{
    if(!status)return;
    status.textContent=msg;
    status.classList.add('visible');
    status.classList.toggle('error',error);
    status.setAttribute('role',error?'alert':'status');
  };
  const update=()=>{
    const online=!!member;
    if(guest)guest.hidden=online;
    form.dataset.onlineInquiry=online?'enabled':'offline';
    if(banner)banner.textContent=online
      ?'로그인한 회원으로 온라인 접수가 가능합니다. 전송하면 MODERUN 문의함에 안전하게 저장되며, 내 계정에서 진행 상태를 볼 수 있습니다.'
      :'이메일 확인 링크로 비밀번호 없이 접수할 수 있습니다. 이메일 확인 전에는 문의 내용을 파일에 저장할 수 있습니다.';
    if(note)note.textContent=online
      ?'접수 후 내 계정에서 문의 내용을 확인할 수 있습니다. 답변은 운영자가 등록한 뒤 표시됩니다.'
      :'아래에서 이메일 확인을 먼저 진행하세요. 이메일 링크로 돌아온 뒤 온라인 접수 버튼을 사용할 수 있습니다.';
    if(submit)submit.textContent=online?'온라인 문의 접수하기 →':'문의 내용 파일로 저장 ↓';
    const login=document.getElementById('inquiry-account-link');
    if(login){login.textContent=online?'내 문의 내역 보기 ↗':'로그인하고 온라인 접수하기 ↗';login.href=online?'account.html':'login.html?next=contact.html';}
  };
  async function checkUser(){
    if(!client)return;
    try {
      const {data,error}=await client.auth.getUser();
      member=!error?data?.user||null:null;
      update();
      if(member){
        const nick=document.getElementById('nickname');
        if(nick&&!nick.value.trim()&&member.user_metadata?.nickname)nick.value=String(member.user_metadata.nickname).slice(0,60);
      }
    }catch(_){member=null;update()}
  }
  function initialize(){
    client=window.MODERUN_AUTH_CLIENT;
    if(!client){update();return}
    checkUser();
    client.auth.onAuthStateChange(()=>setTimeout(checkUser,0));
  }
  if(window.MODERUN_AUTH_CLIENT)initialize();
  else {
    update();
    window.addEventListener('moderun:auth-ready',initialize,{once:true});
    window.addEventListener('moderun:auth-unavailable',update,{once:true});
  }
  emailForm?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!emailForm.reportValidity()||!client)return;
    const btn=emailForm.querySelector('[type="submit"]');
    const email=String(new FormData(emailForm).get('email')||'').trim();
    btn.disabled=true;
    btn.textContent='발송 중…';
    try{
      const redirect=new URL('contact.html?continue=inquiry',location.href).href;
      const {error}=await client.auth.signInWithOtp({
        email,
        options:{shouldCreateUser:true,emailRedirectTo:redirect}
      });
      if(error)throw error;
      if(emailStatus){emailStatus.textContent='이메일 인증 링크를 보냈습니다. 메일에서 링크를 열어 이 페이지로 돌아온 뒤 문의를 작성하세요. 링크 전송 횟수에 제한이 있을 수 있습니다.';emailStatus.setAttribute('role','status')}
    }catch(_){
      if(emailStatus){emailStatus.textContent='인증 메일을 보내지 못했습니다. 잠시 후 다시 시도하거나 일반 로그인 기능을 사용해 주세요.';emailStatus.setAttribute('role','alert')}
    }finally{
      btn.disabled=false;btn.textContent='이메일 인증 링크 받기 →';
    }
  });
  form.addEventListener('submit',async event=>{
    if(form.dataset.onlineInquiry!=='enabled')return;
    event.preventDefault();
    if(sending||!form.reportValidity())return;
    if(!client){message('인증 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',true);return}
    sending=true;submit.disabled=true;submit.textContent='접수 중…';
    try {
      // getUser validates the current token against Supabase Auth, not just cached UI state.
      const {data:identity,error:authError}=await client.auth.getUser();
      if(authError||!identity?.user)throw new Error('SIGNED_OUT');
      const data=new FormData(form);
      const ref=String(data.get('reference')||'').trim();
      if(ref&&!/^https:\/\//i.test(ref)){message('참고 링크는 https:// 주소만 입력해 주세요.',true);return}
      const payload={
        product:String(data.get('product')||'').trim(),
        plan:String(data.get('plan')||'').trim(),
        nickname:String(data.get('nickname')||'').trim(),
        budget:String(data.get('budget')||'').trim(),
        contact_type:String(data.get('contactType')||'').trim(),
        contact_id:String(data.get('contactId')||'').trim(),
        reference_url:ref,
        details:String(data.get('message')||'').trim(),
        consent:data.has('consent')
      };
      // Attribution is only attached to a deliberately submitted inquiry.
      try{
        const campaign=JSON.parse(sessionStorage.getItem('moderun-campaign')||'{}');
        for(const key of ['utm_source','utm_medium','utm_campaign','landing_page']){
          if(typeof campaign[key]==='string')payload[key]=campaign[key];
        }
      }catch(_){}
      const {data:saved,error}=await client.from('moderun_inquiries')
        .insert(payload).select('id,created_at').single();
      if(error)throw error;
      form.reset();
      document.getElementById('product')?.dispatchEvent(new Event('change',{bubbles:true}));
      message('온라인 문의가 정상 접수되었습니다. 내 계정 → 내 문의 내역에서 상태를 확인할 수 있습니다. 접수번호: '+String(saved.id).slice(0,8).toUpperCase());
    }catch(error){
      if(error.message==='SIGNED_OUT'){
        member=null;update();
        message('로그인 세션이 만료됐습니다. 다시 로그인해 주세요. 작성 내용은 현재 화면에 유지됩니다.',true);
      } else message('온라인 접수에 실패했습니다. 인터넷 연결 또는 입력 내용을 확인하고 재시도해 주세요. 접수되지 않은 경우 작성 내용은 유지됩니다.',true);
    }finally{
      sending=false;submit.disabled=false;update();
    }
  });
})();