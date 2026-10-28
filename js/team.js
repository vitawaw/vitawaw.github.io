/* VITAWAW · js/team.js
   Pharmacist accounts (owner only): invite with chosen permissions, list accounts, switch each permission
   on/off, suspend / activate / remove, and cancel or resend unused invitations.
   All of it goes through owner-only database functions (team_list, team_invite, team_update, team_revoke_invite),
   which check the owner role themselves; see supabase/migrations/*_pharmacist_accounts.sql.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
const TEAM={list:null};
const PERMS=['nut','inter','refs','text'];
const joinLink=email=>location.origin+location.pathname+'#join='+encodeURIComponent(email);
const fmtDate=d=>d?new Date(d).toLocaleDateString(LANG==='ar'?'ar-IQ-u-nu-latn':'en-GB',{year:'numeric',month:'short',day:'numeric'}):'';

async function teamLoad(){
  const {data,error}=await OWN.client.rpc('team_list');
  if(error){console.error(error);toast(T('o_neterr'));return null}
  TEAM.list=clean(data);return TEAM.list;
}
async function teamInvite(prefill){
  if(!ISOWNER()||OWN.local)return;
  let v=prefill?[prefill.name||'',prefill.email||'',PERMS.map((k,i)=>prefill.perms&&prefill.perms[k]?i:-1).filter(i=>i>=0)]:['','',[0,1,2]];
  while(true){
    const r=await dialog({title:T('tm_inv_t'),info:T('tm_inv_i'),fields:[{label:T('tm_name'),value:v[0]},{label:T('tm_email'),type:'email',value:v[1]},
      {label:T('tm_perms'),type:'checks',options:PERMS.map((k,i)=>[i,T('pl_'+k)]),value:v[2]}],
      buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('tm_send'),action:'ok',pri:1}]});
    if(r.action!=='ok')return;
    v=[r.values[0].trim(),r.values[1].trim().toLowerCase(),r.values[2]];
    if(!v[0]){toast(T('tm_err_name'));continue}
    if(!/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(v[1])){toast(T('tm_err_email'));continue}
    const perms=Object.fromEntries(PERMS.map((k,i)=>[k,v[2].includes(i)]));
    const {error}=await OWN.client.rpc('team_invite',{p_email:v[1],p_name:v[0].replace(/[<>]/g,''),p_perms:perms});
    if(error){toast(T(/member/.test(error.message)?'tm_err_member':/email/.test(error.message)?'tm_err_email':'o_neterr'));continue}
    await teamLoad();renderNav();if(SHEET&&SHEET.key==='team')renderTeam();
    return sendInvite(v[1],v[0]);
  }
}
/** Shows the invitation link with copy / WhatsApp / e-mail buttons. */
async function sendInvite(email,name){
  const link=joinLink(email),msg=T('tm_msg').replace('{name}',name||'').replace('{email}',email).replace('{link}',link);
  while(true){
    const r=await dialog({title:T('tm_link_t'),info:T('tm_link_i').replace('{email}',email),fields:[{label:'',type:'textarea',value:link,ltr:1}],
      buttons:[{label:T('tm_copy'),action:'copy'},{label:T('tm_wa'),action:'wa'},{label:T('tm_mail'),action:'mail'},{label:T('tm_done'),action:'ok',pri:1}]});
    if(r.action==='copy'){const d=()=>toast(T('tm_copied'));try{navigator.clipboard.writeText(link).then(d).catch(()=>fallback(link,d))}catch(e){fallback(link,d)}continue}
    if(r.action==='wa'){window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');continue}
    if(r.action==='mail'){location.href=`mailto:${encodeURIComponent(email).replace('%40','@')}?subject=${encodeURIComponent(T('tm_subj'))}&body=${encodeURIComponent(msg)}`;continue}
    return;
  }
}
async function openTeam(part){
  if(!ISOWNER()||OWN.local)return;
  openSheet(T('tm_t'),'<p class="hint">…</p>',{key:'team'});
  await teamLoad();if(!SHEET||SHEET.key!=='team')return;
  renderTeam();if(part==='inv'){const el=$('tm-inv');if(el)el.scrollIntoView({block:'start'})}
}
function renderTeam(){
  const d=TEAM.list;if(!d||!SHEET||SHEET.key!=='team')return;
  ACT.s=[];const S=(c)=>chipH('s',c);
  const eds=d.members.filter(m=>m.role==='editor');
  const card=m=>{
    const on=m.status==='active',p=m.perms||{};
    return `<div class="tmc${on?'':' off'}"><div class="tmh"><b>${esc(m.name||m.email)}</b><span class="st ${on?'st-dev':'st-idea'}">${T(on?'tm_active':'tm_susp')}</span></div>
      <div class="tmm" dir="ltr">${esc(m.email)}</div>
      <div class="tmm">${T('tm_last')} ${m.last?esc(fmtDate(m.last)):T('tm_notyet')}${m.pending?` · <span class="pend">${m.pending} ${T('tm_pend')}</span>`:''}</div>
      <p class="tml">${T('tm_perms')} <small>${T('tm_tap')}</small></p>
      <div class="filters">${PERMS.map(k=>S({label:T('p_'+k),pressed:!!p[k],f:()=>teamSet(m,{perms:{...p,[k]:!p[k]}})})).join('')}</div>
      <div class="filters tma">${S({label:T(on?'tm_suspend':'tm_resume'),f:()=>teamSet(m,{status:on?'suspended':'active'})})}${S({label:T('tm_remove'),cls:'danger',f:()=>teamRemove(m)})}</div></div>`;
  };
  const inv=i=>`<div class="tmc"><div class="tmh"><b>${esc(i.name||i.email)}</b><span class="st st-plan">${T('tm_invited')} ${esc(fmtDate(i.at))}</span></div>
      <div class="tmm" dir="ltr">${esc(i.email)}</div><div class="tmm">${PERMS.filter(k=>i.perms&&i.perms[k]).map(k=>esc(T('p_'+k))).join(' · ')||'—'}</div>
      <div class="filters tma">${S({label:T('tm_resend'),cls:'pri',f:()=>sendInvite(i.email,i.name)})}${S({label:T('tm_cancel'),cls:'danger',f:()=>teamRevoke(i)})}</div></div>`;
  $('sheet-b').innerHTML=`<div class="filters">${S({label:T('ad_invite'),cls:'pri',f:()=>teamInvite()})}</div>
    <p class="hint">${T('tm_never')}</p>
    <h4 class="tms">${T('ad_accounts')} <span class="cnt">${eds.length}</span></h4>${eds.length?eds.map(card).join(''):`<p class="inone">${T('tm_none')}</p>`}
    <h4 class="tms" id="tm-inv">${T('ad_invites')} <span class="cnt">${d.invites.length}</span></h4>${d.invites.length?d.invites.map(inv).join(''):`<p class="inone">${T('tm_noinv')}</p>`}`;
}
async function teamSet(m,{perms=null,status=null}){
  const {error}=await OWN.client.rpc('team_update',{p_user:m.id,p_perms:perms,p_status:status});
  if(error){console.error(error);toast(T('o_neterr'));return}
  await teamLoad();renderTeam();renderNav();toast(T('tm_saved'));
}
async function teamRemove(m){if(await confirmDel(T('tm_removeq')+' '+(m.name||m.email)))teamSet(m,{status:'removed'})}
async function teamRevoke(i){
  if(!(await confirmDel(i.email)))return;
  const {error}=await OWN.client.rpc('team_revoke_invite',{p_email:i.email});if(error){toast(T('o_neterr'));return}
  await teamLoad();renderTeam();renderNav();
}
/** Pharmacist: see which permissions the owner has given. */
function showMyPerms(){
  const p=OWN.perms||{};
  openSheet(T('mr_myperms'),`<div class="filters">${PERMS.map(k=>`<span class="chip${p[k]?' on':' off'}">${esc(T('p_'+k))}: ${T(p[k]?'tm_perm_on':'tm_perm_off')}</span>`).join('')}</div><p class="hint">${T('tm_never')}</p>`);
}
