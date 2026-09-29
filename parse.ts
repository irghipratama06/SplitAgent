export default async function handler(req:any,res:any){
  const{text,members=[]}=req.body||{};const key=process.env.ANTHROPIC_API_KEY;
  if(!key||!text)return res.status(503).json({error:'no key'});
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
    headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:500,
      system:`Ubah pesan pengeluaran jadi JSON SAJA (tanpa teks lain): {description,amount,currency,payer,participants,split_type,shares}. amount = integer satuan terkecil (IDR rupiah utuh; "200k/200rb"=200000, "1,5jt"=1500000). currency default IDR. split_type: equal|exact|percent|shares; shares hanya bila bukan equal (map nama→angka). Gunakan nama persis seperti ditulis. "kita semua/berempat" = seluruh anggota: ${members.join(', ')}. participants = semua yang ikut menikmati (termasuk payer bila ikut).`,
      messages:[{role:'user',content:text}]})});
  const d=await r.json();const s=d?.content?.[0]?.text||'';
  try{res.status(200).json(JSON.parse(s.replace(/```json|```/g,'').trim()))}catch{res.status(502).json({error:'bad json'})}
}
