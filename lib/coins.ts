export type Coin={id:string;symbol:string;name:string};
export type Quote={usd:number|null;updatedAt:string|null;change24h:number|null};
export type Conversion={coinId:string;symbol:string;name:string;amount:string;rateUsd:string;usdCents:number;source:'CoinGecko'|'manual';quotedAt:string|null;capturedAt:string};
export type MoneyKey='incomeCents'|'costCents'|'feeCents';
export const moneyKeys:MoneyKey[]=['incomeCents','costCents','feeCents'];
export const quickCoins:Coin[]=[{id:'ethereum',symbol:'eth',name:'Ethereum'},{id:'solana',symbol:'sol',name:'Solana'},{id:'monad',symbol:'mon',name:'Monad'},{id:'bitcoin',symbol:'btc',name:'Bitcoin'}];
export function decimalParts(value:string){
 const m=/^(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value);
 if(!m||value.length>80)throw Error('Số không hợp lệ.');
 const exponent=Number(m[3]??0),fraction=m[2]??'';
 if(!Number.isInteger(exponent)||Math.abs(exponent)>50)throw Error('Số vượt phạm vi hỗ trợ.');
 const scale=fraction.length-exponent;
 return scale>=0?{n:BigInt(m[1]+fraction),d:10n**BigInt(scale)}:{n:BigInt(m[1]+fraction)*10n**BigInt(-scale),d:1n};
}
export function convertToCents(amount:string,rateUsd:string){
 if(!/^\d{1,16}(?:\.\d{1,18})?$/.test(amount))throw Error('Số lượng không âm, tối đa 18 chữ số thập phân; dùng dấu chấm.');
 if(!Number.isFinite(Number(rateUsd))||Number(rateUsd)<=0||Number(rateUsd)>1e12)throw Error('Giá mỗi coin phải lớn hơn 0.');
 const a=decimalParts(amount),p=decimalParts(rateUsd),d=a.d*p.d;
 const cents=(a.n*p.n*100n+d/2n)/d;
 if(cents>100000000000n)throw Error('Giá trị tối đa cho mỗi khoản là 1 tỷ USD.');
 return Number(cents);
}
export function quoteIsFresh(quote:Quote|undefined,now=Date.now()) {if(!quote||quote.usd===null||quote.usd<=0||!quote.updatedAt)return false;const t=Date.parse(quote.updatedAt);return Number.isFinite(t)&&t<=now+60000&&now-t<=15*60*1000;}
export function rateLabel(value:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:value>=1?2:0,maximumSignificantDigits:12}).format(value)}
export function filterCoins(coins:Coin[],query:string){const q=query.trim().toLowerCase();if(!q)return coins;return coins.filter(c=>c.id.toLowerCase().includes(q)||c.symbol.toLowerCase().includes(q)||c.name.toLowerCase().includes(q)).sort((a,b)=>Number(b.symbol.toLowerCase()===q)-Number(a.symbol.toLowerCase()===q)||Number(b.id.toLowerCase()===q)-Number(a.id.toLowerCase()===q));}
export function validateConversion(c:unknown):Conversion{
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Thông tin quy đổi không hợp lệ.');const v=c as Conversion;
 for(const key of ['coinId','symbol','name','amount','rateUsd'] as const){if(typeof v[key]!=='string'||!v[key]||v[key].length>250)throw Error('Thông tin coin không hợp lệ.');}
 if(!['CoinGecko','manual'].includes(v.source)||typeof v.capturedAt!=='string'||!Number.isFinite(Date.parse(v.capturedAt)))throw Error('Nguồn hoặc thời điểm quy đổi không hợp lệ.');
 if(v.quotedAt!==null&&(typeof v.quotedAt!=='string'||!Number.isFinite(Date.parse(v.quotedAt))))throw Error('Thời điểm giá không hợp lệ.');
 if(v.source==='CoinGecko'&&v.quotedAt===null)throw Error('Giá thị trường cần có thời điểm cập nhật.');
 if(!Number.isSafeInteger(v.usdCents)||convertToCents(v.amount,v.rateUsd)!==v.usdCents)throw Error('Số tiền USD không khớp phép quy đổi.');return v;
}
