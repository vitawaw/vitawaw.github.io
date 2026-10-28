window.__calls=[];
(function(){
 const st=JSON.parse(localStorage.getItem('__st')||'null')||window.__SEED;
 const save=()=>localStorage.setItem('__st',JSON.stringify(st));
 let nextI=100;
 window.supabase={createClient(){let sess={u:'u1'};
  const q=(t)=>{const f={};const api={select(){return api},eq(c,v){f[c]=v;return api},
   maybeSingle(){if(t==='members')return Promise.resolve({data:{role:window.__ROLE||'owner'},error:null});const row=(st.cfg||{})[f.id];return Promise.resolve({data:row?{data:row}:null,error:null})},
   upsert(r){st.cfg=st.cfg||{};st.cfg[r.id]=r.data;save();window.__calls.push(['upsert',r.id]);return Promise.resolve({error:null})}};return api};
  return {auth:{getSession:async()=>({data:{session:sess}}),getUser:async()=>({data:{user:{id:'u1'}}}),signOut:async()=>{sess=null},signInWithPassword:async()=>({error:null})},from:q,
   rpc:async(n,a)=>{window.__calls.push(['rpc',n]);
    if(n==='get_content')return{data:JSON.parse(JSON.stringify({refs:st.refs,inter:st.inter,nut:st.nut,next_ref:st.next_ref})),error:null};
    if(n==='save_content'){const p=a.p;const role=window.__ROLE||'owner';
      if(p.inter.some(x=>!x.r||!x.r.length))return{error:{message:'sources'}};
      const old=Object.fromEntries(st.inter.map(x=>[x.id,JSON.stringify(x)]));
      st.refs=p.refs.map(x=>({...x,rv:role==='owner'?x.rv:false}));st.inter=p.inter.map(x=>{const y={...x};if(y.id==null)y.id=nextI++;if(role!=='owner'&&old[y.id]!==JSON.stringify(x))y.rv=false;return y});st.nut=p.nut;st.next_ref=Math.max(st.next_ref,...st.refs.map(x=>x.id+1));save();return{error:null}}
    if(n==='publish_site'){if((window.__ROLE||'owner')!=='owner')return{error:{message:'only owner'}};
      const vc=st.nut.custom.filter(c=>c.rv!==false&&!c.hidden);const ks=new Set(['d','b12','fol','fe','ca','mg','c','zn'].filter(k=>!st.nut.hide.includes(k)).concat(vc.map(c=>c.id)));
      const inter=st.inter.filter(x=>x.rv!==false&&ks.has(x.k)).map(({id,rv,...r})=>r);const used=new Set([...inter.flatMap(x=>x.r),...vc.flatMap(c=>c.r)]);
      const refs=st.refs.filter(x=>x.rv!==false||used.has(x.id)).map(({rv,...r})=>r);
      st.cfg=st.cfg||{};st.cfg.published={...(st.cfg.draft||{}),refs,inter,nut:{hide:st.nut.hide,custom:vc.map(({rv,hidden,...r})=>r)}};save();window.__PUB=st.cfg.published;return{data:{},error:null}}
    return{error:{message:'?'}}}}}};
})();
