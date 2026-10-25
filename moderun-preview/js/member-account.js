/* MODERUN member center — secure account profile and own inquiry history. */
(() => {
  'use strict';
  if(document.body.dataset.authPage!=='account')return;
  const dashboard=document.getElementById('member-dashboard');
  const list=document.getElementById('member-inquiry-list');
  const notice=document.getElementById('member-list-status');
  const summary=document.getElementById('member-summary');
  const filter=document.getElementById('member-filter');
  const refresh=document.getElementById('member-refresh');
  const profile=document.getElementById('member-profile-form');
  const nickname=document.getElementById('member-nickname');
  const profileStatus=document.getElementById('member-profile-status');
  const statuses={received:'접수 완료',reviewing:'검토 중',quoted:'견적 안내',in_progress:'진행 중',completed:'완료',closed:'종료'};
  const products={macro:'게임 매크로',optimize:'PC 최적화',automation:'일반 자동화',sitedress:'SiteDress',deskdress:'DeskDress',workspace:'PC·모바일 연동',website:'웹사이트 제작',custom:'맞춤 제작'};
  let client=null,user=null,items=[],fetching=false;
  function el(tag,className,content){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(content!==undefined)node.textContent=String(content);
    return node;
  }
  const fmt=value=>{
    const d=new Date(value);
    return Number.isFinite(d.valueOf())?d.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
  };
  function render(){
    if(!list)return;
    const shown=items.filter(item=>filter?.value==='all'||item.status===filter?.value);
    list.replaceChildren();
    if(!shown.length){
      list.append(el('p','member-empty',items.length?'선택한 상태의 문의가 없습니다.':'접수된 문의가 없습니다. 문의 페이지에서 첫 문의를 작성해 보세요.'));
    }else for(const item of shown){
      const card=el('article','member-inquiry-card');
      const heading=el('div','member-inquiry-head');
      const main=el('div','member-inquiry-main');
      main.append(el('span','member-inquiry-date',fmt(item.created_at)),el('h3','',products[item.product]||item.product),el('span','member-inquiry-code','접수번호 '+String(item.id).slice(0,8).toUpperCase()));
      const pill=el('span','member-status member-status--'+item.status,statuses[item.status]||'확인 중');
      heading.append(main,pill);
      const meta=el('p','member-inquiry-meta',[item.plan||'기본 구성',item.budget||'예산 미지정',item.contact_type].join(' · '));
      const details=el('details','member-inquiry-details');
      const detailsHead=el('summary','', '문의 내용 및 답변 보기');
      const text=el('p','member-inquiry-message',item.details||'');
      const reply=el('div','member-inquiry-reply');
      reply.append(el('strong','', '운영자 답변'),el('p','',item.staff_reply||'아직 등록된 답변이 없습니다. 진행 상태는 운영자가 확인한 뒤 변경됩니다.'));
      details.append(detailsHead,text,reply);
      card.append(heading,meta,details);list.append(card);
    }
    if(summary)summary.replaceChildren(
      el('span','', '전체 '+items.length+'건'),
      el('span','', '진행 중 '+items.filter(x=>['received','reviewing','quoted','in_progress'].includes(x.status)).length+'건'),
      el('span','', '완료 '+items.filter(x=>['completed','closed'].includes(x.status)).length+'건')
    );
    if(notice)notice.textContent=items.length?'총 '+items.length+'건의 문의가 있습니다.':'아직 접수된 문의가 없습니다.';
  }
  async function load(){
    if(fetching||!client||!user)return;
    fetching=true;
    if(refresh)refresh.disabled=true;
    if(notice)notice.textContent='문의 내역을 불러오는 중입니다.';
    try{
      const {data,error}=await client.from('moderun_inquiries')
        .select('id,product,plan,budget,contact_type,details,status,staff_reply,created_at')
        .order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      items=Array.isArray(data)?data:[];
      render();
      if(items.length===100&&notice)notice.textContent='최근 100건의 문의가 표시됩니다.';
    }catch(_){
      if(notice)notice.textContent='문의 내역을 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.';
    }finally{fetching=false;if(refresh)refresh.disabled=false}
  }
  function setup(){
    client=window.MODERUN_AUTH_CLIENT;
    if(!client)return;
    client.auth.getUser().then(({data,error})=>{
      if(error||!data?.user)return;
      user=data.user;
      dashboard.hidden=false;
      if(nickname)nickname.value=String(user.user_metadata?.nickname||'').slice(0,40);
      load();
    }).catch(()=>{});
  }
  if(window.MODERUN_AUTH_CLIENT)setup();
  else window.addEventListener('moderun:auth-ready',setup,{once:true});
  filter?.addEventListener('change',render);
  refresh?.addEventListener('click',load);
  profile?.addEventListener('submit',async event=>{
    event.preventDefault();
    const value=nickname.value.trim();
    if(!value||value.length>40){
      profileStatus.textContent='닉네임을 1~40자로 입력해 주세요.';return;
    }
    if(!client||!user)return;
    const save=profile.querySelector('button');
    save.disabled=true;profileStatus.textContent='저장 중…';
    try{
      const {data,error}=await client.auth.updateUser({data:{nickname:value}});
      if(error)throw error;
      user=data.user;
      document.getElementById('account-name').textContent=value;
      profileStatus.textContent='프로필 이름을 저장했습니다.';
    }catch(_){profileStatus.textContent='저장에 실패했습니다. 다시 시도해 주세요.'}
    finally{save.disabled=false}
  });
})();