(() => {
  'use strict';
  const config = window.MODERUN_CONFIG || {};
  const $ = (s, base=document) => base.querySelector(s);
  const $$ = (s, base=document) => Array.from(base.querySelectorAll(s));

  // Mobile menu: live header offset, background inert, focus trap and focus restore.
  document.documentElement.classList.add('js-enabled');
  const menu = $('#mobile-menu');
  const toggle = $('#menu-toggle');
  const header = $('.site-header');
  const outside = [$('#main'), $('.footer')].filter(Boolean);
  const links = menu ? $$('a[href]', menu) : [];
  let restoreFocus = null;
  const updateMobileTop = () => {
    if (menu && header) document.documentElement.style.setProperty('--mobile-menu-top', Math.max(0,header.getBoundingClientRect().bottom)+'px');
  };
  function closeMenu(restore=true) {
    if (!menu || !toggle) return;
    const wasOpen = menu.classList.contains('open');
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '메뉴 열기');
    document.body.classList.remove('menu-open');
    outside.forEach(el => el.inert = false);
    if (wasOpen && restore && restoreFocus?.isConnected) restoreFocus.focus();
  }
  function openMenu() {
    if (!menu || !toggle) return;
    restoreFocus=document.activeElement;
    updateMobileTop();
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '메뉴 닫기');
    document.body.classList.add('menu-open');
    outside.forEach(el => el.inert = true);
    const first = links[0] || toggle;
    first.focus({preventScroll:true});
    // CSS menu visibility can settle a frame later on sticky headers.
    requestAnimationFrame(() => {
      if (menu.classList.contains('open') && document.activeElement === toggle) first.focus({preventScroll:true});
    });
    // Native button clicks can restore the toggle focus after the click event.
    // Only advance focus if it still remains there; never steal the user's next action.
    setTimeout(() => {
      if (menu.classList.contains('open') && document.activeElement === toggle) first.focus({preventScroll:true});
    }, 90);
  }
  if (menu && toggle) {
    updateMobileTop();
    toggle.addEventListener('click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
    links.forEach(a => a.addEventListener('click', () => closeMenu(false)));
    document.addEventListener('keydown', e => {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key !== 'Tab') return;
      const focusables=[...links,toggle].filter(el => el.getClientRects().length > 0);
      const current=focusables.indexOf(document.activeElement);
      if (current < 0) { e.preventDefault(); focusables[0]?.focus(); return; }
      const next=(current+(e.shiftKey?-1:1)+focusables.length)%focusables.length;
      e.preventDefault();focusables[next].focus();
    });
    addEventListener('resize', () => {updateMobileTop(); if(innerWidth>800) closeMenu(false);});
    addEventListener('scroll', updateMobileTop, {passive:true});
  }

  // MODERUN live preview: motion for featured products, separated from CSS hover.
  // Show all content without JavaScript and respect reduced motion unless user opts in.
  const featuredEls = $$('.home-feature-grid .product-reveal');
  featuredEls.forEach(el => el.removeAttribute('data-reveal'));
  const motionPref = matchMedia('(prefers-reduced-motion: reduce)');
  const replayBtn = $('#motion-replay-button');
  const enableBtn = $('#motion-enable-button');
  let featureObserver, hasFeaturedPlayed = false, runningAnimations = [];
  let allowFeatureMotion = false;
  try { allowFeatureMotion = sessionStorage.getItem('moderun-motion-optin') === 'yes'; } catch (_) {}
  const motionIsAllowed = () => !motionPref.matches || allowFeatureMotion;
  function resetFeaturedVisibility() {
    runningAnimations.forEach(a => { try { a.cancel(); } catch (_) {} });
    runningAnimations = [];
    featuredEls.forEach(el => { el.style.opacity = ''; el.style.transform = ''; });
  }
  function animateFeatured(force = false) {
    if (!featuredEls.length || (!force && !motionIsAllowed())) return resetFeaturedVisibility();
    featureObserver?.disconnect();
    resetFeaturedVisibility();
    const small = matchMedia('(max-width:700px)').matches;
    featuredEls.forEach((el, i) => {
      if (!el.animate) return;
      const a = el.animate(
        [{ opacity: 0, transform: 'translateY(' + (small ? 18 : 30) + 'px)' },
         { opacity: 1, transform: 'translateY(0)' }],
        { duration: small ? 570 : 820, delay: small ? 0 : i * 145,
          easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
      );
      runningAnimations.push(a);
      a.finished.then(() => { try { a.cancel(); } catch (_) {} }).catch(() => {});
    });
    hasFeaturedPlayed = true;
  }
  function prepareFeaturedEntrance() {
    if (!featuredEls.length) return;
    featureObserver?.disconnect();
    resetFeaturedVisibility();
    if (enableBtn) enableBtn.hidden = motionIsAllowed();
    if (!motionIsAllowed() || !('IntersectionObserver' in window)) return;
    if (hasFeaturedPlayed) return;
    const rect = featuredEls[0].getBoundingClientRect();
    if (rect.top < innerHeight - 50 && rect.bottom > 0) return; // avoid first-frame flashes
    featuredEls.forEach(el => el.style.opacity = '0');
    featureObserver = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && !hasFeaturedPlayed) {
        animateFeatured();
      }
    }, { rootMargin: '0px 0px -56px 0px', threshold: 0.10 });
    featureObserver.observe(featuredEls[0]);
  }
  replayBtn?.addEventListener('click', () => {
    animateFeatured(true);
    replayBtn.textContent='카드 등장 효과 재생 중…';
    replayBtn.disabled=true;
    setTimeout(()=>{
      replayBtn.disabled=false;
      replayBtn.textContent='카드 등장 효과 보기 ↻';
    }, 1400);
  }); // explicit replay
  enableBtn?.addEventListener('click', () => {
    allowFeatureMotion = true;
    try { sessionStorage.setItem('moderun-motion-optin','yes'); } catch (_) {}
    enableBtn.hidden = true;
    animateFeatured(true);
  });
  motionPref.addEventListener?.('change', () => { hasFeaturedPlayed = false; prepareFeaturedEntrance(); });
  addEventListener('pageshow', e => { if (e.persisted) resetFeaturedVisibility(); });
  prepareFeaturedEntrance();
  window.MODERUN_MOTION_DIAGNOSTIC = () => ({ reducedMotion: motionPref.matches, optedIn: allowFeatureMotion, observed: !!featureObserver, played: hasFeaturedPlayed });

  // One observer for both legacy reveal blocks and the three feature cards.
  // Never hide content until the observer has been successfully created.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealItems = $$('[data-reveal], .reveal');
  let revealObserver = null;
  // Keep transition styles attached until the entrance actually finishes.
  // Removing motion-ready in the same tick as is-visible makes the fade a jump cut.
  const revealCleanup = new WeakMap();
  function revealNow(el, animate = false) {
    revealObserver?.unobserve(el);
    const existingCleanup = revealCleanup.get(el);
    if (existingCleanup && !animate) existingCleanup();
    if (!animate || reduceMotion.matches || !el.classList.contains('motion-ready')) {
      el.classList.add('is-visible');
      el.classList.remove('motion-ready', 'motion-armed');
      return;
    }
    if (existingCleanup) return;
    let timeoutId;
    const finish = () => {
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(timeoutId);
      el.classList.add('is-visible');
      el.classList.remove('motion-ready', 'motion-armed');
      revealCleanup.delete(el);
    };
    const onEnd = event => {
      if (event.target === el && (event.propertyName === 'opacity' || event.propertyName === 'transform')) finish();
    };
    revealCleanup.set(el, finish);
    el.addEventListener('transitionend', onEnd);
    // Fallback in case the browser cancels a transition after navigation/resize.
    timeoutId = setTimeout(finish, 1600);
    requestAnimationFrame(() => {
      if (reduceMotion.matches) finish();
      else el.classList.add('is-visible');
    });
  }
  function revealAll() {
    revealItems.forEach(el => revealNow(el, false));
    revealObserver?.disconnect();
    revealObserver = null;
  }
  if (!reduceMotion.matches && 'IntersectionObserver' in window && revealItems.length) {
    try {
      revealObserver = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) revealNow(entry.target, true);
      }, {threshold:0.08, rootMargin:'0px 0px -32px 0px'});
      revealItems.forEach(el => {
        const box = el.getBoundingClientRect();
        // Already visible on entry, history restore or at an anchor: no flash.
        if (box.top < innerHeight - 28 && box.bottom > 0) {revealNow(el);return;}
        el.classList.add('motion-ready');
        revealObserver.observe(el);
        // Stage the hidden state without animating backwards from opacity:1.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (el.classList.contains('motion-ready') && !el.classList.contains('is-visible')) el.classList.add('motion-armed');
        }));
      });
    } catch (err) { revealAll(); }
  } else revealAll();
  reduceMotion.addEventListener?.('change', e => {if (e.matches) revealAll();});
  document.addEventListener('focusin', e => {
    const parent=e.target.closest?.('.motion-ready');
    if (parent) revealNow(parent);
  });
  addEventListener('pageshow', e => {if (e.persisted) revealAll();});
  addEventListener('hashchange', () => {
    const target=document.querySelector(location.hash && /^#[a-zA-Z][\w-]*$/.test(location.hash)?location.hash:':root');
    const parent=target?.closest?.('.motion-ready');
    if (parent) revealNow(parent);
  });
  // Fallback only for cards actually approaching the viewport; never reveal all offscreen cards on a timer.
  let revealCheckScheduled = false;
  addEventListener('scroll', () => {
    if (!revealObserver || revealCheckScheduled) return;
    revealCheckScheduled = true;
    requestAnimationFrame(() => {
      revealCheckScheduled = false;
      revealItems.forEach(el => {
        if (!el.classList.contains('motion-ready') || el.classList.contains('is-visible')) return;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight - 64 && r.bottom > 0) revealNow(el, true);
      });
    });
  }, {passive:true});

  // Home usage-scenes: tabs are manually selected, never auto-rotate.
  const sceneTabs = $$('[role="tab"][data-scene]');
  const sceneLinks = {
    work:['product-macro.html','게임 매크로 개발 정보'],
    pc:['product-optimize.html','PC 최적화 개발 정보'],
    design:['product-sitedress.html','SiteDress 개발 정보']
  };
  const sceneRelated = $('#showcase-related-link');
  let sceneSequenceTimer = null;
  function stopSequence() {if (sceneSequenceTimer) {clearInterval(sceneSequenceTimer);sceneSequenceTimer=null;}}
  function selectScene(tab, moveFocus=false) {
    if (!tab) return;
    stopSequence();
    sceneTabs.forEach(t => {
      const active=t===tab;
      t.setAttribute('aria-selected',String(active));
      t.tabIndex=active?0:-1;
      const panel=document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden=!active;
    });
    const dest=sceneLinks[tab.dataset.scene];
    if (dest && sceneRelated) {
      sceneRelated.href=dest[0];
      sceneRelated.innerHTML=dest[1]+' <span aria-hidden="true">↗</span>';
    }
    if (moveFocus) tab.focus();
  }
  sceneTabs.forEach((tab,index) => {
    tab.addEventListener('click',()=>selectScene(tab));
    tab.addEventListener('keydown',e=>{
      let next;
      if (e.key==='ArrowRight') next=(index+1)%sceneTabs.length;
      else if (e.key==='ArrowLeft') next=(index-1+sceneTabs.length)%sceneTabs.length;
      else if (e.key==='Home') next=0;
      else if (e.key==='End') next=sceneTabs.length-1;
      else return;
      e.preventDefault();
      selectScene(sceneTabs[next],true);
    });
  });
  const seqSteps=$$('#scene-steps li');
  const seqStatus=$('#sequence-status');
  const seqNames=['마우스 클릭','대기','키보드 입력'];
  function activateStep(index) {
    seqSteps.forEach((li,i)=>{
      li.classList.toggle('is-current',i===index);
      const state=li.querySelector('.step-state');
      if(state) state.textContent=i<index?'완료':i===index?'진행':'대기';
    });
    if(seqStatus) seqStatus.textContent=`${index+1}단계 · ${seqNames[index]}`;
  }
  $('#play-sequence')?.addEventListener('click',()=>{
    stopSequence();
    activateStep(0);
    if (reduceMotion.matches) {activateStep(2);return;}
    let step=0;
    sceneSequenceTimer=setInterval(()=>{
      step++;
      if (step>=seqSteps.length) {stopSequence();return;}
      activateStep(step);
      if (step===seqSteps.length-1) stopSequence();
    },430);
  });
  const pcChoices=$$('#pc-options input[type="checkbox"]');
  function updatePcSummary() {
    const selected=pcChoices.filter(x=>x.checked).map(x=>x.value);
    const summary=$('#pc-selection-summary');
    if(summary) summary.textContent=selected.length?`${selected.length}개 선택 · ${selected.join(', ')}`:'선택된 항목 없음';
  }
  pcChoices.forEach(x=>x.addEventListener('change',updatePcSummary));
  updatePcSummary();
  const demoSite=$('#demo-site');
  $$('[data-accent]').forEach(button=>button.addEventListener('click',()=>{
    if (!demoSite) return;
    demoSite.style.setProperty('--mini-accent',button.dataset.accent);
    $$('[data-accent]').forEach(b=>{const active=b===button;b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));});
  }));
  $$('[data-align]').forEach(button=>button.addEventListener('click',()=>{
    if (!demoSite) return;
    demoSite.style.setProperty('--mini-align',button.dataset.align);
    $$('[data-align]').forEach(b=>{const active=b===button;b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));});
  }));

  // Catalog filters: search + category in a single consistent state.
  const catalog = $('#catalog-grid');
  if (catalog) {
    const search = $('#catalog-search');
    const filters = $$('.filter-btn[data-filter]');
    let category = 'all';
    const update = () => {
      const norm = text => String(text || '').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim();
      const query = norm(search?.value);
      let shown=0;
      $$('[data-product-card]', catalog).forEach(card => {
        const match = (category === 'all' || card.dataset.category === category) &&
          (!query || norm([card.dataset.keywords,card.querySelector('h3')?.textContent,card.querySelector('.art-label')?.textContent,card.getAttribute('href')?.replace(/product-|\.html/g,'')].join(' ')).includes(query));
        card.hidden = !match;
        if (match) shown++;
      });
      const empty = $('#catalog-empty');
      if (empty) empty.hidden = shown !== 0;
      const count = $('#catalog-count');
      if (count) count.textContent = String(shown);
    };
    filters.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.filter;
      filters.forEach(b => { const active = b === button; b.classList.toggle('is-active', active); b.setAttribute('aria-pressed', String(active)); });
      update();
    }));
    search?.addEventListener('input', update);
    const p = new URLSearchParams(location.search).get('category');
    if (p && filters.some(f => f.dataset.filter === p)) filters.find(f => f.dataset.filter===p).click();
    else update();
  }

  // Accessible accordions.
  $$('.faq-button').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      const isOpen = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // Contact links are only enabled when the owner supplies real destinations.
  $$('[data-contact-channel]').forEach(el => {
    const name = el.dataset.contactChannel;
    const url = ({telegram:config.TELEGRAM_URL, discord:config.DISCORD_URL, kakao:config.KAKAO_URL})[name];
    if (url && /^https:\/\//i.test(url)) {
      el.href=url;
      el.target='_blank';
      el.rel='noopener noreferrer';
      el.removeAttribute('aria-disabled');
      const hint = el.querySelector('[data-channel-hint]');
      if (hint) hint.textContent='상담 채널 열기 ↗';
    } else {
      el.removeAttribute('href');
      el.setAttribute('aria-disabled','true');
      el.setAttribute('title','운영자 연결 주소 등록 전');
      el.addEventListener('click', e => e.preventDefault());
    }
  });

  // GitHub Pages cannot receive form submissions itself. Until an external
  // endpoint has been configured, the form explicitly exports a LOCAL draft.
  const form = $('#inquiry-form');
  if (form) {
    const incomingProduct = new URLSearchParams(location.search).get('product');
    const productSelect = $('#product');
    if (incomingProduct && productSelect && Array.from(productSelect.options).some(o => o.value === incomingProduct)) productSelect.value = incomingProduct;
    const planSelect = $('#plan');
    const planOptions = {
      macro: ['Basic','Pro','Custom'], optimize:['Standard','Pro','Expert'],
      automation:['Core','Plus','Custom Build'], sitedress:['Explore','Creator','Studio'],
      deskdress:['Basic','Pro','Custom'], workspace:['Basic','Pro','Custom'],
      website:['기본 제작','UI 개선','맞춤 제작'], custom:['맞춤 견적']
    };
    const incomingPlan = new URLSearchParams(location.search).get('plan') || '';
    function refreshPlans() {
      if (!planSelect) return;
      planSelect.replaceChildren(new Option('구성을 선택하지 않음',''));
      (planOptions[productSelect?.value] || []).forEach(name => planSelect.add(new Option(name,name)));
      if (incomingPlan && Array.from(planSelect.options).some(o => o.value===incomingPlan)) planSelect.value=incomingPlan;
    }
    productSelect?.addEventListener('change',refreshPlans);
    refreshPlans();
    const endpoint = String(config.FORM_ENDPOINT || '');
    const configured = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+\/?$/.test(endpoint);
    const submit = $('#inquiry-submit');
    const note = $('#form-mode-note');
    const status = $('#form-message');
    if (configured) {
      submit.textContent='견적 문의 보내기 →';
      note.textContent='입력한 문의 내용이 운영자의 외부 폼 서비스로 전송됩니다.';
    } else {
      submit.textContent='문의 내용 파일로 저장 ↓';
      note.textContent='온라인 접수 채널 연결 전입니다. 현재는 문의 내용을 내 컴퓨터에 저장할 수 있습니다. 저장만으로 운영자에게 전달되지는 않습니다.';
    }
    function showMessage(msg, error=false) {
      status.textContent=msg;
      status.classList.add('visible');
      status.classList.toggle('error', error);
      status.setAttribute('role', error?'alert':'status');
    }
    function readForm() {
      const obj={};
      new FormData(form).forEach((val,key)=>{obj[key]=String(val).trim()});
      return obj;
    }
    function inquiryText(d) {
      return ['MODERUN 맞춤 견적 문의','',`작성일: ${new Date().toLocaleString('ko-KR')}`,'',`문의 상품: ${d.product || '-'}`,`문의 구성: ${d.plan || '-'}`,`닉네임: ${d.nickname || '-'}`,`연락 수단: ${d.contactType || '-'}`,`연락처/ID: ${d.contactId || '-'}`,`예산: ${d.budget || '-'}`,`참고 링크: ${d.reference || '-'}`,'','요청 내용',d.message || '-', '', '※ 파일 저장은 온라인 문의 접수가 아닙니다. 운영자의 상담 채널이 개설되면 직접 전달해 주세요.'].join('\n');
    }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const d=readForm();
      if (!configured) {
        const content = inquiryText(d);
        const blob = new Blob(['\uFEFF',content], {type:'text/plain;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='MODERUN_견적문의.txt';a.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        showMessage('문의 내용이 텍스트 파일로 저장되었습니다. 아직 온라인 접수는 되지 않았습니다. 상담 채널이 연결되면 전달할 수 있습니다.');
        return;
      }
      submit.disabled=true;
      const original=submit.textContent;
      submit.textContent='전송 중…';
      try {
        const response=await fetch(endpoint,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}});
        if(!response.ok) throw new Error('request rejected');
        showMessage('문의가 접수되었습니다. 입력하신 연락 수단으로 답변드릴 수 있도록 확인하겠습니다.');
        form.reset();
      } catch(err) {
        showMessage('전송에 실패했습니다. 네트워크 상태를 확인해 다시 시도하거나 문의 내용을 파일로 저장해 주세요.',true);
      } finally { submit.disabled=false;submit.textContent=original; }
    });
    $('#copy-inquiry')?.addEventListener('click', async () => {
      if (!form.reportValidity()) return;
      try {
        await navigator.clipboard.writeText(inquiryText(readForm()));
        showMessage('문의 내용을 복사했습니다. 복사한 내용을 상담 채널에 붙여 넣을 수 있습니다.');
      } catch (error) {
        showMessage('클립보드 복사가 제한되었습니다. 문의 내용 파일 저장 기능을 사용해 주세요.',true);
      }
    });
  }
})();
