/* MODERUN theme: shared between all pages; no server, external dependency or account required. */
(() => {
  'use strict';
  const root=document.documentElement;
  const toggle=document.getElementById('moderun-theme-toggle');
  const key='moderun-theme';
  const meta=document.querySelector('meta[name="theme-color"]');
  const sync=(theme,persist)=>{
    const dark=theme==='dark';
    if(dark)root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
    root.style.colorScheme=dark?'dark':'light';
    if(meta)meta.setAttribute('content',dark?'#091426':'#ffffff');
    if(toggle){toggle.checked=dark;toggle.setAttribute('aria-label',dark?'다크 모드 사용 중, 라이트 모드로 전환':'라이트 모드 사용 중, 다크 모드로 전환');toggle.setAttribute('aria-checked',String(dark));}
    if(persist){try{localStorage.setItem(key,dark?'dark':'light')}catch(_){/* storage blocked */}}
  };
  let initial='light';
  try{initial=localStorage.getItem(key)==='dark'?'dark':'light'}catch(_){}
  sync(initial,false);
  toggle?.addEventListener('change',()=>sync(toggle.checked?'dark':'light',true));
  window.addEventListener('storage',event=>{
    if(event.key===key)sync(event.newValue==='dark'?'dark':'light',false);
  });
})();
