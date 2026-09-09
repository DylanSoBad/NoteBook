'use client';
import {useState} from 'react';
import {Plus,Pencil,Timer,ExternalLink} from 'lucide-react';
import {type Entry} from '@/lib/model';
import {money} from '@/lib/profit';

const filters=['Tất cả','Solana','Ethereum','Base','Bitcoin','Other'];
function chainColor(chain:string){const value=chain.toLowerCase();if(value.includes('sol'))return 'sol';if(value.includes('eth'))return 'eth';if(value.includes('base'))return 'base';if(value.includes('bitcoin')||value==='btc')return 'btc';return 'other'}
function countdown(date?:string,time?:string){if(!date)return null;const target=new Date(`${date}T${time||'00:00'}:00+07:00`).getTime()-Date.now();if(target<=0)return 'ĐANG DIỄN RA';const hours=Math.floor(target/3600000),minutes=Math.floor(target%3600000/60000);return hours?`Còn ${hours}h ${minutes}m`:`Còn ${minutes}m`}
export default function WLPanel({records,create,edit}:{records:Entry[];create:()=>void;edit:(entry:Entry)=>void}){
 const [filter,setFilter]=useState('Tất cả');
 const wl=records.filter(r=>r.kind==='wl');
 const visible=wl.filter(r=>filter==='Tất cả'||r.chain.toLowerCase().includes(filter.toLowerCase().replace('ethereum','eth')));
 const holding=wl.filter(r=>!['Đã bán','Hết hạn'].includes(r.status));const sold=wl.filter(r=>r.status==='Đã bán');
 const soldValue=sold.reduce((total,r)=>total+(r.soldPriceCents??0),0);const wins=sold.filter(r=>(r.soldPriceCents??0)>0).length;
 return <><div className="viewheading"><div><h2>WL Tracker</h2><p className="subtle">Whitelist spots — từ lúc grind đến khi bán.</p></div><button className="action primary" onClick={create}><Plus size={17}/> Thêm WL spot</button></div>
 <div className="wlstats"><article><span>WL đang giữ</span><strong>{holding.length}</strong><small>spot</small></article><article><span>Đã bán</span><strong>{sold.length}</strong><small>spot</small></article><article><span>Doanh thu WL</span><strong className="positive">{money(soldValue)}</strong><small>đã ghi giá bán</small></article><article><span>Win rate</span><strong>{sold.length?Math.round(wins/sold.length*100):0}%</strong><small>{wins}/{sold.length||0} sells</small></article></div>
 <div className="filterchips">{filters.map(value=><button className={filter===value?'active':''} onClick={()=>setFilter(value)} key={value}>{value}</button>)}</div>
 <section className="panel"><div className="panelheading"><h2>Danh sách WL <span className="subtle">· {visible.length} spot</span></h2></div>{visible.length?<div className="wllist">{visible.sort((a,b)=>(a.mintDate||'9999').localeCompare(b.mintDate||'9999')).map(r=>{const left=countdown(r.mintDate,r.time);return <article className="wlrow" key={r.id}><i className={chainColor(r.chain)}/><div><strong>{r.title}</strong><span>{r.chain||'Chưa chọn chain'} · nhận {r.date}{r.wlSource?' · '+r.wlSource:''}</span>{left&&<em className={left==='ĐANG DIỄN RA'?'live':''}><Timer size={13}/>{left}</em>}</div><span className="pill">{r.status}</span><div className="wlvalue">{r.soldPriceCents?money(r.soldPriceCents):r.estimatedValue||'—'}<small>{r.soldPriceCents?'đã bán':'ước tính'}</small></div><button className="iconbutton" onClick={()=>edit({...r})} aria-label={'Sửa '+r.title}><Pencil size={16}/></button>{r.url&&<a className="iconbutton" href={r.url} target="_blank" rel="noopener noreferrer" aria-label={'Mở '+r.title}><ExternalLink size={16}/></a>}</article>})}</div>:<div className="empty">Chưa có WL spot. Thêm whitelist bạn đang grind hoặc đã nhận.</div>}</section></>
}
