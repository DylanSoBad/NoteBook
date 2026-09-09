import type {Coin,Quote} from './coins';
type Cached={value:unknown;expires:number;fetchedAt:string};
const cache=new Map<string,Cached>();const pending=new Map<string,Promise<Cached>>();let retryAfter=0;
async function upstream(path:string,ttl:number):Promise<Cached>{
 const previous=cache.get(path);if(previous&&previous.expires>Date.now())return previous;
 if(pending.has(path))return pending.get(path)!;
 if(Date.now()<retryAfter)throw Error('Nguồn giá đang giới hạn truy cập. Vui lòng thử lại sau một phút hoặc nhập tỷ giá thủ công.');
 const request=(async()=>{const response=await fetch('https://api.coingecko.com/api/v3'+path,{headers:{Accept:'application/json','User-Agent':'DylanWeb3HQ/1.0 (+https://dylan-web3-daily-hq.iamdylan2026.chatgpt.site)'},signal:AbortSignal.timeout(12000)});
 if(response.status===429){retryAfter=Date.now()+60000;throw Error('Nguồn giá đang giới hạn truy cập. Vui lòng thử lại sau một phút hoặc nhập tỷ giá thủ công.');}
 if(!response.ok)throw Error('Chưa lấy được dữ liệu CoinGecko. Bạn có thể thử lại hoặc dùng giá tự nhập.');
 const value:unknown=await response.json();const entry={value,expires:Date.now()+ttl,fetchedAt:new Date().toISOString()};if(cache.size>=150)cache.delete(cache.keys().next().value!);cache.set(path,entry);return entry;})();
 pending.set(path,request);try{return await request}finally{pending.delete(path)}
}
export async function catalog(){const r=await upstream('/coins/list?include_platform=false',3600000);if(!Array.isArray(r.value))throw Error('Danh mục coin không hợp lệ.');const coins=r.value.filter((v):v is Coin=>v&&typeof v.id==='string'&&typeof v.symbol==='string'&&typeof v.name==='string'&&v.id.length<=200&&v.name.length<=250&&v.symbol.length<=100).map(({id,symbol,name})=>({id,symbol,name}));return {coins,fetchedAt:r.fetchedAt,source:'CoinGecko'};}
export async function prices(ids:string[]){const params=new URLSearchParams({ids:[...new Set(ids)].sort().join(','),vs_currencies:'usd',include_last_updated_at:'true',include_24hr_change:'true',precision:'full'});const r=await upstream('/simple/price?'+params,60000);if(!r.value||typeof r.value!=='object'||Array.isArray(r.value))throw Error('Giá không hợp lệ.');const data=r.value as Record<string,{usd?:unknown;last_updated_at?:unknown;usd_24h_change?:unknown}>;const quotes:Record<string,Quote>={};
 for(const id of ids){const q=data[id];const timestamp=typeof q?.last_updated_at==='number'&&q.last_updated_at>0&&q.last_updated_at<1e11?q.last_updated_at*1000:null;quotes[id]={usd:typeof q?.usd==='number'&&Number.isFinite(q.usd)&&q.usd>0?q.usd:null,updatedAt:timestamp?new Date(timestamp).toISOString():null,change24h:typeof q?.usd_24h_change==='number'&&Number.isFinite(q.usd_24h_change)?q.usd_24h_change:null};}return {quotes,fetchedAt:r.fetchedAt,source:'CoinGecko'};
}
