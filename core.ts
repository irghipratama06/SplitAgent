export type SplitType='equal'|'exact'|'percent'|'shares';
export interface Parsed{description:string;amount:number;currency:string;payer:string;participants:string[];split_type:SplitType;shares?:Record<string,number>}
export const fmt=(n:number,c='IDR')=>n.toLocaleString('id-ID')+' '+c;
// Largest-remainder: hasil selalu berjumlah persis `total` (satuan terkecil, integer).
export function allocate(total:number,w:number[]):number[]{
  const s=w.reduce((a,b)=>a+b,0);
  if(!Number.isInteger(total)||total<=0||!(s>0)||w.some(x=>x<0))throw new Error('input split tidak valid');
  const raw=w.map(x=>total*x/s),out=raw.map(Math.floor);
  const rem=total-out.reduce((a,b)=>a+b,0);
  raw.map((r,i)=>[r-out[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,rem).forEach(([,i])=>out[i]++);
  return out;
}
export function owed(p:Parsed):Record<string,number>{
  const m=p.participants;if(!m.length)throw new Error('tanpa peserta');
  let a:number[];const w=m.map(x=>p.shares?.[x]??0);
  if(p.split_type==='equal')a=allocate(p.amount,m.map(()=>1));
  else if(p.split_type==='exact'){a=w;if(a.reduce((x,y)=>x+y,0)!==p.amount)throw new Error('jumlah exact != total')}
  else{if(p.split_type==='percent'&&Math.abs(w.reduce((x,y)=>x+y,0)-100)>1e-9)throw new Error('persen harus 100');a=allocate(p.amount,w)}
  return Object.fromEntries(m.map((x,i)=>[x,a[i]]));
}
export function net(e:{payer:string;amount:number;owed:Record<string,number>}[],p:{from:string;to:string;amount:number}[]=[]){
  const n:Record<string,number>={};const add=(k:string,v:number)=>{n[k]=(n[k]||0)+v};
  e.forEach(x=>{add(x.payer,x.amount);for(const k in x.owed)add(k,-x.owed[k])});
  p.forEach(x=>{add(x.from,x.amount);add(x.to,-x.amount)});
  return n;
}
// Greedy: pasangkan kreditur & debitur terbesar → maks n-1 transfer (optimal absolut NP-hard).
export function simplify(n:Record<string,number>){
  const c:[string,number][]=[],d:[string,number][]=[];
  for(const[k,v]of Object.entries(n)){if(v>0)c.push([k,v]);else if(v<0)d.push([k,-v])}
  const out:{from:string;to:string;amount:number}[]=[];
  while(c.length&&d.length){
    c.sort((a,b)=>b[1]-a[1]);d.sort((a,b)=>b[1]-a[1]);
    const m=Math.min(c[0][1],d[0][1]);out.push({from:d[0][0],to:c[0][0],amount:m});
    c[0][1]-=m;d[0][1]-=m;if(!c[0][1])c.shift();if(!d[0][1])d.shift();
  }
  return out;
}
