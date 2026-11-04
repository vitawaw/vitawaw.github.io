/* ===================== 1.17.0 visit statistics =====================
   Counting (every visitor, anonymous): the page keeps a short list of what happened — the site opened, a calculator gave
   a result, a tool / section / information page was opened — and sends it with navigator.sendBeacon to /api/hit when the
   tab is hidden or closed. Nothing about the person is sent: no name, no cookie, no stored identifier. The edge worker adds
   the country and a code that changes every day (see src/worker.js); the database keeps only counts per hour.
   Not counted: the signed-in team, the owner's three-size preview, robots, «Do Not Track» browsers, local tests.
   Dashboard («لوحة الزيارات», page #stats): the owner only — public.site_stats() refuses everyone else. */
const STQ=[];let STLAST='',STDONE=new Set(),STP=7,STDATA=null;
const STOFF=()=>{try{return (typeof FRAME!=='undefined'&&FRAME)||(typeof OWN!=='undefined'&&OWN.on)||(!window.__STATS_TEST&&(navigator.webdriver||/^(localhost|127\.|\[::1\]|app\.test$)/.test(location.hostname)))||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'}catch(e){return true}};
const STDEV=()=>{try{const touch=matchMedia('(pointer:coarse)').matches,w=Math.min(screen.width,screen.height);return !touch?'pc':w>=600?'tablet':'phone'}catch(e){return ''}};
const STKEY=s=>String(s||'').toLowerCase().replace(/[^a-z0-9_:-]/g,'').slice(0,40);
/** note one event; kind open|calc|tool|section|page. A calculator counts once per visit (its result redraws while typing). */
function statHit(kind,item){
  if(STOFF())return;
  item=STKEY(item);
  if(kind==='calc'){if(STDONE.has(item))return;STDONE.add(item)}
  if(kind==='section'||kind==='tool'){const k=kind+':'+item;if(k===STLAST)return;STLAST=k}
  STQ.push([kind,item]);if(STQ.length>=30)statFlush();
}
function statFlush(){
  if(!STQ.length)return;
  if(STOFF()){STQ.length=0;return}
  const body=JSON.stringify({e:STQ.splice(0,40),lang:LANG==='en'?'en':'ar',dv:STDEV()});
  try{if(navigator.sendBeacon&&navigator.sendBeacon('/api/hit',new Blob([body],{type:'text/plain'})))return}catch(e){}
  try{fetch('/api/hit',{method:'POST',body,keepalive:true,headers:{'Content-Type':'text/plain'}}).catch(()=>{})}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')statFlush()});
window.addEventListener('pagehide',statFlush);

/* ---------- the owner's dashboard ---------- */
async function openStats(){
  const b=$('stats-b');if(!b)return;
  if(!ISOWNER()){b.innerHTML='';return}
  STDATA=null;drawStats();
  let data=null,error=null;
  if(typeof OWN!=='undefined'&&OWN.client){try{({data,error}=await OWN.client.rpc('site_stats',{p_days:STP}))}catch(e){error=e}}else error=1;
  STDATA=error||!data||typeof data!=='object'?false:data;drawStats();
}
const stN=n=>Number(n||0).toLocaleString(LANG==='ar'?'ar-IQ-u-nu-latn':'en-GB');
function stDelta(now,prev){
  now=+now||0;prev=+prev||0;
  if(!prev)return now?`<span class="stdl up">${esc(T('st_new'))}</span>`:'<span class="stdl">—</span>';
  const p=Math.round((now-prev)/prev*100);
  return `<span class="stdl ${p>0?'up':p<0?'down':''}" title="${esc(T('st_prev'))}: ${stN(prev)}"><bdi>${p>0?'↑':p<0?'↓':''}${Math.abs(p)}%</bdi></span>`;
}
function stName(kind,k){
  try{
    if(kind==='calc')return kname(k);
    if(kind==='tool'){const t=TOOLS.find(x=>x[0]==='tool-'+k);return t?toolName(t):k}
    if(kind==='section')return SECKEY[k]?T(SECKEY[k]):k==='links'?T('lk_t'):k;
    if(kind==='page'){const p=allPages().find(x=>x.id===k);return p?tx2(p.t):k}
    if(kind==='country'){if(!k)return T('st_unk');return new Intl.DisplayNames([LANG==='en'?'en':'ar'],{type:'region'}).of(k)||k}
  }catch(e){}
  return k;
}
/** bars: [[label, value]] → rows with a bar as long as the share of the biggest */
function stBars(rows,total){
  if(!rows.length)return `<p class="hint">${esc(T('st_none'))}</p>`;
  const max=Math.max(...rows.map(r=>+r[1]||0),1),sum=total||rows.reduce((a,r)=>a+(+r[1]||0),0)||1;
  return `<ul class="stbars">${rows.map(([l,v])=>`<li><div class="stbl"><span>${esc(l)}</span><b><bdi>${stN(v)}</bdi><small>${Math.round(v/sum*100)}%</small></b></div><i style="--w:${Math.max(2,Math.round(v/max*100))}%"></i></li>`).join('')}</ul>`;
}
/** line chart (opens, and people per day) as inline SVG, no library */
function stChart(d){
  const s=d.series||[],hourly=d.days===1,bw=($('stats-b')&&$('stats-b').clientWidth)||640,W=Math.max(260,Math.min(1000,bw-30)),H=210,L=34,R=12,Tp=12,B=26,n=s.length;
  if(!n)return '';
  const a=s.map(x=>+x[1]||0),p=hourly?null:s.map(x=>+x[2]||0),max=Math.max(4,...a,...(p||[]));
  const raw=max/4,mag=Math.pow(10,Math.floor(Math.log10(raw))),tick=[1,2,5,10].map(m=>m*mag).find(t=>t>=raw),top=tick*Math.ceil(max/tick); // round steps: 1, 2, 5, 10…
  const X=i=>L+(n===1?0:i*(W-L-R)/(n-1)),Y=v=>Tp+(H-Tp-B)*(1-v/top);
  const path=arr=>arr.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const grid=Array.from({length:Math.round(top/tick)+1},(_,i)=>{const v=i*tick,y=Y(v).toFixed(1);return `<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}"/><text x="${L-6}" y="${(+y+4).toFixed(1)}" text-anchor="end">${v}</text>`}).join('');
  const every=Math.max(1,Math.ceil(n/Math.max(3,Math.floor((W-L-R)/(hourly?44:58)))));
  const lab=i=>{if(hourly)return String(s[i][0]).padStart(2,'0')+':00';const t=String(s[i][0]).split('-');return `${+t[2]}/${+t[1]}`}; // short day/month, never overlapping
  const tip=i=>{if(hourly)return lab(i);try{return new Date(s[i][0]+'T00:00:00').toLocaleDateString(LANG==='ar'?'ar-IQ-u-nu-latn':'en-GB',{weekday:'short',day:'numeric',month:'long'})}catch(e){return lab(i)}};
  const xs=s.map((x,i)=>(n-1-i)%every?'':`<text x="${X(i).toFixed(1)}" y="${H-6}" text-anchor="middle">${esc(lab(i))}</text>`).join('');
  const dots=s.map((x,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(a[i]).toFixed(1)}" r="${n>45?0:3}"><title>${esc(tip(i))}: ${a[i]} ${esc(T('st_opens'))}${p?` · ${p[i]} ${esc(T('st_people'))}`:''}</title></circle>`).join('');
  const area=`${path(a)}L${X(n-1).toFixed(1)},${Y(0).toFixed(1)}L${X(0).toFixed(1)},${Y(0).toFixed(1)}Z`;
  return `<div class="stchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T('st_chart'))}" width="${W}" height="${H}"><g class="stg">${grid}</g><path class="sta" d="${area}"/>${p?`<path class="stl2" d="${path(p)}"/>`:''}<path class="stl" d="${path(a)}"/><g class="std">${dots}</g><g class="stx">${xs}</g></svg>
    <div class="stleg"><span class="k1">${esc(T('st_opens'))}</span>${p?`<span class="k2">${esc(T('st_people'))}</span>`:''}</div></div>`;
}
function drawStats(){
  const b=$('stats-b');if(!b||cur!=='stats')return;
  const per=[1,7,30,90].map(x=>`<button type="button" data-stp="${x}" aria-pressed="${x===STP}">${esc(T('st_p'+x))}</button>`).join('');
  const demo=typeof IS_PREVIEW!=='undefined'&&IS_PREVIEW?`<p class="stdemo">${esc(T('st_demo'))}</p>`:'';
  const head=`<div class="filters stper">${per}</div>`+demo;
  if(STDATA===null){b.innerHTML=head+`<p class="hint">${esc(T('o_busy'))}</p>`;return}
  if(STDATA===false){b.innerHTML=head+`<p class="hint stbad">${esc(T('st_nodb'))}</p>`;return}
  const d=STDATA,pv=d.prev||{},top=d.top||{};
  const card=(k,ico,v,pvv)=>`<div class="stc"><div class="stch"><span class="stic">${ico}</span><span>${esc(T('st_'+k))}</span></div><b><bdi>${stN(v)}</bdi></b>${stDelta(v,pvv)}</div>`;
  const I=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${p}</svg>`;
  const cards=`<div class="stcards">${card('opens',I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),d.opens,pv.opens)}${card('people',I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6"/>'),d.people,pv.people)}${card('calcs',I('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h4"/>'),d.calcs,pv.calcs)}${card('tools',I('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),d.tools,pv.tools)}</div>`;
  const range=d.days===1?T('st_today'):`${d.from} → ${d.to}`;
  const empty=!(+d.opens||+d.people);
  const box=(t,inner,cls='')=>`<section class="stbox ${cls}"><h3>${esc(t)}</h3>${inner}</section>`;
  const tl=k=>(top[k]||[]).map(([i,v])=>[stName(k,i),v]);
  const devs=['phone','tablet','pc'].filter(k=>d.device&&d.device[k]).map(k=>[T('st_d_'+k),d.device[k]]);
  const langs=['ar','en'].filter(k=>d.lang&&d.lang[k]).map(k=>[k==='ar'?'العربية':'English',d.lang[k]]);
  const cs=(d.country||[]).map(([k,v])=>[stName('country',k),v]);
  b.innerHTML=head+`<p class="strange"><bdi>${esc(range)}</bdi> · ${esc(T('st_vs'))}</p>`+cards+
    (empty?`<p class="hint stempty">${esc(T('st_empty'))}</p>`:'')+
    box(d.days===1?T('st_byhour'):T('st_byday'),stChart(d),'stwide')+
    `<div class="stgrid">${box(T('st_tcalc'),stBars(tl('calc')))}${box(T('st_ttool'),stBars(tl('tool')))}${box(T('st_tsec'),stBars(tl('section')))}${box(T('st_tpage'),stBars(tl('page')))}${box(T('st_dev'),stBars(devs))}${box(T('st_lang'),stBars(langs))}${box(T('st_country'),stBars(cs))}</div>`+
    `<p class="hint stpriv">${esc(T('st_priv'))}</p>`;
}
document.addEventListener('click',e=>{const x=e.target.closest('[data-stp]');if(!x)return;e.preventDefault();STP=+x.dataset.stp||7;openStats()});
