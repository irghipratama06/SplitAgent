import{Parsed,owed,net as netOf,simplify,fmt}from'./core';
import{mockRail,sphereRail}from'./rail';
type Exp={desc:string;amount:number;payer:string;owed:Record<string,number>};
type Pay={from:string;to:string;amount:number;status:string;ref?:string};
type G={cur:string;members:Record<string,string>;exps:Exp[];pays:Pay[];chat:[string,string][];rem:Record<string,{n:number;t:number}>;prop:{from:string;to:string;amount:number}[]};
const S:{cur:string;groups:Record<string,G>;audit:{t:number;g:string;a:string;d:string}[]}=JSON.parse(localStorage.getItem('split.v1')||'null')||{cur:'Grup',groups:{},audit:[]};
const grp=()=>S.groups[S.cur]??=({cur:'IDR',members:{},exps:[],pays:[],chat:[],rem:{},prop:[]});
const $=(i:string)=>document.getElementById(i)!;
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
const audit=(a:string,d:string)=>S.audit.push({t:Date.now(),g:S.cur,a,d});
const say=(r:string,t:string)=>grp().chat.push([r,t]);
const netG=()=>{const g=grp();return netOf(g.exps,g.pays.filter(p=>p.status==='confirmed'))};
const MAX_REMINDERS=2,GAP=24*3600e3;

async function parse(text:string):Promise<Parsed>{
  const names=Object.keys(grp().members);
  try{const r=await fetch('/api/parse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,members:names})});
    if(r.ok){audit('llm_parse',text);return await r.json()}}catch{}
  audit('fallback_parse',text); // tanpa API key: heuristik sederhana
  const m=text.match(/(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta)?/i);if(!m)throw new Error('jumlah tidak ditemukan');
  const mul=/jt|juta/i.test(m[2]||'')?1e6:/k|rb|ribu/i.test(m[2]||'')?1e3:1;
  const low=text.toLowerCase(),pos=(n:string)=>low.indexOf(n.toLowerCase());
  const found=names.filter(n=>pos(n)>=0).sort((a,b)=>pos(a)-pos(b));
  if(!found.length)throw new Error('sebut nama anggota (atau isi ANTHROPIC_API_KEY)');
  return{description:text,amount:Math.round(parseFloat(m[1].replace(',','.'))*mul),currency:'IDR',payer:found[0],participants:found.length>1?found:names,split_type:'equal'};
}

async function handle(text:string){
  const g=grp();say('u',text);
  try{
    if(text.startsWith('/group ')){S.cur=text.slice(7).trim();grp();audit('group',S.cur);say('a','Grup aktif: '+S.cur)}
    else if(text.startsWith('/wallet ')){const[,n,w]=text.split(/\s+/);g.members[n]=w;audit('wallet',n+' '+w);say('a',`Wallet ${n} = ${w}`)}
    else if(text==='/settle'){g.prop=simplify(netG());audit('propose',JSON.stringify(g.prop));say('a',g.prop.length?`Usulan ${g.prop.length} transfer. Setujui satu per satu di bawah.`:'Semua lunas 🎉')}
    else if(text==='/remind')remind(true);
    else{
      const p=await parse(text);const o=owed(p);
      [p.payer,...p.participants].forEach(n=>g.members[n]??='');
      g.cur=p.currency;g.exps.push({desc:p.description,amount:p.amount,payer:p.payer,owed:o});
      audit('expense',JSON.stringify({...p,owed:o}));
      say('a',`Dicatat: ${p.description} ${fmt(p.amount,p.currency)}, dibayar ${p.payer}. `+Object.entries(o).map(([k,v])=>`${k} ${fmt(v)}`).join(', '));
    }
  }catch(e:any){say('a','⚠️ '+e.message)}
  render();
}

async function approve(i:number){
  const g=grp(),p=g.prop[i];if(!p)return;
  audit('approve',JSON.stringify(p));
  const rail=($('sp') as HTMLInputElement).checked?sphereRail:mockRail;
  try{
    const r=await rail.pay({...p,currency:g.cur},g.members[p.to]||'');
    audit('payment_'+r.status,JSON.stringify({...p,ref:r.ref}));
    if(r.status==='confirmed'){g.pays.push({...p,status:'confirmed',ref:r.ref});g.prop.splice(i,1);say('a',`✅ ${p.from} → ${p.to} ${fmt(p.amount,g.cur)} terkonfirmasi (${r.ref})`)}
    else if(r.status==='rejected')say('a','Ditolak di wallet. Boleh coba lagi.');
    else{g.pays.push({...p,status:'unknown'});g.prop.splice(i,1);say('a','❓ Hasil tidak diketahui — transfer mungkin sudah masuk. JANGAN kirim ulang; cek dulu di wallet/penerima.')}
  }catch(e:any){audit('payment_error',e.message);say('a','⚠️ '+e.message)}
  render();
}

function remind(force=false){
  const g=grp();
  for(const d of simplify(netG())){
    const k=d.from+'>'+d.to,r=g.rem[k]??={n:0,t:0};
    if(r.n>=MAX_REMINDERS||(!force&&Date.now()-r.t<GAP))continue;
    r.n++;r.t=Date.now();audit('reminder',`${k} #${r.n}`);
    say('a',`🔔 ${d.from}, kamu masih berutang ${fmt(d.amount,g.cur)} ke ${d.to} (pengingat ${r.n}/${MAX_REMINDERS})`);
  }
  render();
}

function render(){
  const g=grp();
  $('chat').innerHTML=g.chat.map(([r,t])=>`<p class="${r}">${esc(t)}</p>`).join('');$('chat').scrollTop=1e9;
  $('bal').innerHTML=Object.entries(netG()).map(([k,v])=>`<li>${esc(k)}: ${v>=0?'+':''}${fmt(v,g.cur)}</li>`).join('');
  $('props').innerHTML=g.prop.map((p,i)=>`<li>${esc(p.from)} → ${esc(p.to)} ${fmt(p.amount,g.cur)} <button data-i="${i}">Setujui & bayar</button></li>`).join('');
  $('audit').innerHTML=S.audit.slice().reverse().map(a=>`<li><small>${new Date(a.t).toLocaleString('id-ID')} [${esc(a.g)}]</small> <b>${esc(a.a)}</b> ${esc(a.d)}</li>`).join('');
  localStorage.setItem('split.v1',JSON.stringify(S));
}
$('props').onclick=e=>{const i=(e.target as HTMLElement).dataset.i;if(i!==undefined)approve(+i)};
($('in') as HTMLInputElement).onkeydown=e=>{if(e.key==='Enter'){const v=(e.target as HTMLInputElement).value.trim();if(v){(e.target as HTMLInputElement).value='';handle(v)}}};
setInterval(()=>remind(),60000);render();
