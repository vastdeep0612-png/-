/* MODERUN opt-in campaign attribution: stores explicit UTM tags per tab only.
   No tracking cookies, fingerprinting, third-party analytics or automatic telemetry. */
(() => {
  'use strict';
  const names=['utm_source','utm_medium','utm_campaign'];
  const p=new URLSearchParams(location.search);
  if(!names.some(name=>p.has(name)))return;
  const safe=(s,max)=>String(s||'').trim().replace(/[\x00-\x1f\x7f]/g,'').slice(0,max);
  const info={utm_source:safe(p.get('utm_source'),80),utm_medium:safe(p.get('utm_medium'),80),utm_campaign:safe(p.get('utm_campaign'),120),landing_page:safe(location.pathname,180)};
  try{sessionStorage.setItem('moderun-campaign',JSON.stringify(info))}catch(_){}
})();
