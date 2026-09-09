import {type Entry,shift} from './model';
export const periods=['Ngày','Tuần','Tháng','Tất cả'] as const;
export type Period=typeof periods[number];
export function parseUsd(value:string){if(!/^\d+(?:\.\d{0,2})?$/.test(value))return NaN;const [whole,decimal='']=value.split('.');return Number(whole)*100+Number(decimal.padEnd(2,'0'));}
export function money(cents:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(cents/100)}
export function net(e:Entry){return (e.incomeCents??0)-(e.costCents??0)-(e.feeCents??0)}
export function inPeriod(date:string,selected:string,period:Period){if(period==='Tất cả')return true;if(period==='Ngày')return date===selected;if(period==='Tháng')return date.slice(0,7)===selected.slice(0,7);const weekday=(new Date(selected+'T12:00:00Z').getUTCDay()+6)%7;const start=shift(selected,-weekday);return date>=start&&date<=shift(start,6)}
export function profitTotals(entries:Entry[]){const closed=entries.filter(e=>e.kind==='profit'&&e.status==='Đã chốt');const income=closed.reduce((s,e)=>s+(e.incomeCents??0),0);const cost=closed.reduce((s,e)=>s+(e.costCents??0),0);const fees=closed.reduce((s,e)=>s+(e.feeCents??0),0);return {income,cost,fees,profit:income-cost-fees,count:closed.length,roi:cost+fees>0?(income-cost-fees)/(cost+fees)*100:null}}
