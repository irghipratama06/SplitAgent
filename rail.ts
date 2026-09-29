// Antarmuka rail pembayaran. Ganti implementasi tanpa menyentuh logika lain.
export interface Transfer{from:string;to:string;amount:number;currency:string}
export interface PayResult{status:'confirmed'|'rejected'|'unknown';ref?:string}
export interface PaymentRail{pay(t:Transfer,toWallet:string):Promise<PayResult>}
export const mockRail:PaymentRail={async pay(){await new Promise(r=>setTimeout(r,500));return{status:'confirmed',ref:'mock-'+Date.now()}}};
let client:any;
// Sphere Connect: user WAJIB approve di wallet (intent). Cek nama action/params di CONNECT.md.
export const sphereRail:PaymentRail={async pay(t,to){
  if(!to)throw new Error('wallet tujuan kosong (/wallet Nama @nametag)');
  if(!client){
    const{autoConnect}=await import('@unicitylabs/sphere-sdk/connect/browser');
    const{SPHERE_NETWORKS}=await import('@unicitylabs/sphere-sdk/connect');
    client=(await autoConnect({dapp:{name:'Split',url:location.origin,icon:location.origin+'/icon.png'},
      network:SPHERE_NETWORKS.testnet2,permissions:['identity:read','transfer:request'],
      walletUrl:'https://sphere.unicity.network',silent:true})).client;
  }
  try{const r=await client.intent('send',{recipient:to,amount:String(t.amount),coinId:t.currency});return{status:'confirmed',ref:r?.transferId}}
  catch(e:any){
    if(e?.code===4003)return{status:'rejected'};   // USER_REJECTED: boleh diulang
    if(e?.code===4201)return{status:'unknown'};    // INTENT_OUTCOME_UNKNOWN: JANGAN retry, rekonsiliasi dulu
    throw e;}
}};
