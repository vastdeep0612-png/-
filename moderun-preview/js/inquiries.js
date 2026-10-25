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
  const message=(msg,error=false)=>{
    if(!status)return;
    status.textContent=msg;
    status.classList.add('visible');
    status.classList.toggle('error',error);
    status.setAttribute('role',error?'alert':'status');
  };
  const update=()=>{
    const online=!!member;
    form.dataset.onlineInquiry=online?'enabled':'offline';
    if(banner)banner.textContent=online
      ?'로그인한 회원으로 온라인 접수가 가능합니다. 전송하면 MODERUN 문의함에 안전하게 저장되며, 내 계정에서 진행 상태를 볼 수 있습니다.'
      :'온라인 문의를 보내려면 먼저 로그인하세요. 로그인 없이 작성한 문의는 아래 버튼으로 파일에 저장할 수 있으며 자동으로 접수되지 않습니다.';
    if(note)note.textContent=online
      ?'접수 후 내 계정에서 문의 내용을 확인할 수 있습니다. 답변은 운영자가 등록한 뒤 표시됩니다.'
      :'작성 내용을 파일로 저장할 수 있습니다. 실제 접수하려면 로그인한 뒤 다시 제출하세요.';
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