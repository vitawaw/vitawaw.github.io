window.__calls=[];
(function(){
 const st=JSON.parse(localStorage.getItem('__st')||'null')||window.__SEED;
 window.__st=st;const save=()=>localStorage.setItem('__st',JSON.stringify(st));
 let nextI=100;
 window.supabase={createClient(){let sess=window.__NOSESSION?null:{u:'u1'};
  const q=(t)=>{const f={};let upd=null;const api={select(){return api},eq(c,v){f[c]=v;return api},order(){return api},limit(){return api},
   update(v){upd=v;return api},
   // notifications for a pharmacist: list, and «mark read»
   then(ok,no){if(t!=='notifications')return Promise.resolve({data:null,error:{message:'?'}}).then(ok,no);st.notes=st.notes||[];
     if(upd){st.notes.forEach(n=>{if(f.read===undefined||n.read===f.read)Object.assign(n,upd)});save();window.__calls.push(['notes-read']);return Promise.resolve({error:null}).then(ok,no)}
     return Promise.resolve({data:JSON.parse(JSON.stringify(st.notes)),error:null}).then(ok,no)},
   maybeSingle(){if(t==='members')return Promise.resolve({data:{role:window.__ROLE||'owner',status:window.__STATUS||'active',perms:window.__PERMS||{},name:window.__NAME||''},error:null});const row=(st.cfg||{})[f.id];return Promise.resolve({data:row?{data:row}:null,error:null})},
   upsert(r){st.cfg=st.cfg||{};const role=window.__ROLE||'owner',old=st.cfg[r.id]||null;let d=r.data;
     // like private.draft_guard: a pharmacist's texts/pages wait under "team"; the owner keeps or drops them (team_done)
     if(r.id==='draft'){if(role==='owner'){if(d.team_done){d={...d};delete d.team;delete d.team_done}else if(old&&old.team&&!d.team)d={...d,team:old.team}}
       else{const base=old||st.cfg.published||{},t=d.text||base.text||{},p=d.pages||base.pages||[];d={...base};
         if(JSON.stringify(t)!==JSON.stringify(base.text||{})||JSON.stringify(p)!==JSON.stringify(base.pages||[]))d.team={text:t,pages:p,by:'u2',at:new Date().toISOString()}}}
     st.cfg[r.id]=d;save();window.__calls.push(['upsert',r.id]);return Promise.resolve({error:null})}};return api};
  return {auth:{getSession:async()=>({data:{session:sess}}),getUser:async()=>({data:{user:{id:'u1'}}}),signOut:async()=>{sess=null},signInWithPassword:async()=>{sess={u:'u1'};return{error:null}},signUp:async()=>({error:null}),updateUser:async()=>({error:null})},from:q,
   rpc:async(n,a)=>{window.__calls.push(['rpc',n]);
    if(n==='get_content')return{data:JSON.parse(JSON.stringify({refs:st.refs,inter:st.inter,nut:st.nut,next_ref:st.next_ref,del:st.del||{refs:[],inter:[],nut:[]}})),error:null};
    if(n==='review_change'){if((window.__ROLE||'owner')!=='owner')return{error:{message:'only the owner'}};
      const list=a.p_kind==='r'?st.refs:a.p_kind==='i'?st.inter:st.nut.custom,key={r:'refs',i:'inter',n:'nut'}[a.p_kind];st.del=st.del||{refs:[],inter:[],nut:[]};
      const j=list.findIndex(x=>String(x.id)===a.p_id),dj=st.del[key].findIndex(x=>String(x.id)===a.p_id);
      if(j>=0){const x=list[j];if(a.p_accept){delete x.pv;x.rv=true}else if(x.pv)list[j]={...x.pv,rv:true};else list.splice(j,1)}
      else if(dj>=0){const x=st.del[key].splice(dj,1)[0];if(!a.p_accept)list.push({...x,rv:true})}
      save();return{error:null}}
    if(n==='save_content'){const p=a.p;const role=window.__ROLE||'owner';
      window.__SAVED=Object.keys(p);if(role!=='owner'){const pm=window.__PERMS||{};const bad=Object.keys(p).find(k=>!pm[k]);if(bad)return{error:{message:'no permission: '+bad}}}
      if(p.inter&&p.inter.some(x=>!x.r||!x.r.length))return{error:{message:'sources'}};
      const old=Object.fromEntries(st.inter.map(x=>[x.id,JSON.stringify(x)]));
      if(p.refs)st.refs=p.refs.map(x=>({...x,rv:role==='owner'?x.rv:false}));if(p.inter)st.inter=p.inter.map(x=>{const y={...x};if(y.id==null)y.id=nextI++;if(role!=='owner'&&old[y.id]!==JSON.stringify(x))y.rv=false;return y});if(p.nut)st.nut=p.nut;st.next_ref=Math.max(st.next_ref,...st.refs.map(x=>x.id+1));save();return{error:null}}
    if(n==='publish_site'){if((window.__ROLE||'owner')!=='owner')return{error:{message:'only owner'}};
      const vc=st.nut.custom.filter(c=>c.rv!==false&&!c.hidden);const ks=new Set(['d','b12','fol','fe','ca','mg','c','zn'].filter(k=>!st.nut.hide.includes(k)).concat(vc.map(c=>c.id)));
      const inter=st.inter.map(x=>x.rv===false&&x.pv?x.pv:x).filter(x=>x.rv!==false&&!x.hidden&&ks.has(x.k)).map(({id,rv,pv,hidden,...r})=>r);
      const refs=st.refs.map(x=>x.rv===false&&x.pv?x.pv:x).filter(x=>x.rv!==false&&!x.hidden).map(({rv,pv,hidden,...r})=>r); // approved, not hidden (like the database)
      st.cfg=st.cfg||{};const dr={...(st.cfg.draft||{})};delete dr.team;delete dr.team_done;st.cfg.published={...dr,refs,inter,nut:{hide:st.nut.hide,custom:vc.map(({rv,hidden,...r})=>r)}};save();window.__PUB=st.cfg.published;return{data:{},error:null}}
    // pharmacist accounts (owner only)
    st.team=st.team||{members:[{id:'u1',email:'owner@x.com',name:'',role:'owner',status:'active',perms:{}}],invites:[]};
    if(n.startsWith('team_')&&(window.__ROLE||'owner')!=='owner')return{error:{message:'only the owner'}};
    if(n==='team_list')return{data:JSON.parse(JSON.stringify(st.team)),error:null};
    if(n==='team_invite'){if(st.team.members.some(m=>m.email===a.p_email))return{error:{message:'already a member'}};st.team.invites=st.team.invites.filter(i=>i.email!==a.p_email);st.team.invites.unshift({email:a.p_email,name:a.p_name,perms:a.p_perms,at:new Date().toISOString(),key:'k123'});save();return{error:null}}
    if(n==='team_revoke_invite'){st.team.invites=st.team.invites.filter(i=>i.email!==a.p_email);save();return{error:null}}
    if(n==='team_update'){const m=st.team.members.find(x=>x.id===a.p_user&&x.role==='editor');if(!m)return{error:{message:'not a pharmacist account'}};if(a.p_perms)m.perms=a.p_perms;if(a.p_status)m.status=a.p_status;if(m.status==='removed')st.team.members=st.team.members.filter(x=>x!==m);save();return{error:null}}
    return{error:{message:'?'}}}}}};
})();
