import{describe,it,expect}from'vitest';
import{allocate,owed,net,simplify}from'../src/core';
const sum=(a:number[])=>a.reduce((x,y)=>x+y,0);
const P=(o:object)=>({description:'x',amount:100,currency:'IDR',payer:'A',participants:['A','B'],split_type:'equal' as const,...o});
describe('split math',()=>{
  it('rounding: 100 / 3 = 34,33,33',()=>expect(allocate(100,[1,1,1])).toEqual([34,33,33]));
  it('selalu berjumlah total',()=>{for(const t of[1,7,999,100001])expect(sum(allocate(t,[3,5,7]))).toBe(t)});
  it('percent 50/30/20 dari 1001',()=>expect(sum(Object.values(owed(P({amount:1001,participants:['A','B','C'],split_type:'percent',shares:{A:50,B:30,C:20}}))))).toBe(1001));
  it('percent != 100 ditolak',()=>expect(()=>owed(P({split_type:'percent',shares:{A:60,B:60}}))).toThrow());
  it('exact harus cocok total',()=>expect(()=>owed(P({split_type:'exact',shares:{A:40,B:40}}))).toThrow());
});
describe('simplify',()=>{
  it('dinner 4 orang → 3 transfer',()=>{
    const o=owed(P({amount:400000,participants:['Andi','Budi','Cici','Dedi'],payer:'Andi'}));
    const t=simplify(net([{payer:'Andi',amount:400000,owed:o}]));
    expect(t.length).toBe(3);expect(t.every(x=>x.to==='Andi'&&x.amount===100000)).toBe(true);
  });
  it('saldo nol setelah transfer',()=>{
    const n:Record<string,number>={A:50,B:30,C:-40,D:-40};const t=simplify(n);
    expect(t.length).toBeLessThanOrEqual(3);
    t.forEach(x=>{n[x.from]+=x.amount;n[x.to]-=x.amount});
    expect(Object.values(n).every(v=>v===0)).toBe(true);
  });
  it('pembayaran mengurangi utang',()=>expect(simplify(net([{payer:'A',amount:200,owed:{A:100,B:100}}],[{from:'B',to:'A',amount:100}]))).toEqual([]));
});
