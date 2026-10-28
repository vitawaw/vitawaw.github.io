/* VITAWAW · js/published.js
   Loads the published content for visitors (/api/content, falling back to Supabase).
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== public: load published content =====================
   Visitors read the published content from /api/content (our Cloudflare worker, cached at the
   edge, see src/worker.js). If that fails (for example when opening the files locally), we read
   the same row straight from Supabase. The last good copy is kept in localStorage so the site
   also works offline. Everything is passed through clean() (config.js) by mergeCfg(). */
const SBON=()=>!!(SB.url&&SB.key);
async function fetchPublished(){
  try{
    const r=await fetch('/api/content',{headers:{Accept:'application/json'}});
    if(r.ok){const rows=await r.json();if(Array.isArray(rows))return rows}
  }catch(e){}
  if(!SBON())return null;
  const r=await fetch(SB.url.replace(/\/$/,'')+'/rest/v1/site_config?id=eq.published&select=data',{headers:{apikey:SB.key,Authorization:'Bearer '+SB.key}});
  return r.ok?r.json():null;
}
async function loadPublished(){
  try{
    const rows=await fetchPublished();
    if(rows&&rows[0]&&rows[0].data){PUBLISHED=rows[0].data;try{localStorage.setItem('vw-cfg',JSON.stringify(PUBLISHED))}catch(e){}
      if(!OWN.on){CFG=mergeCfg(DEFAULT_CFG,PUBLISHED);refreshAll()}}
  }catch(e){}
}
