'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,ArrowUpRight,Copy,LoaderCircle} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {aiTones,aiTopics,type AIDraft,type WriterInput} from '@/lib/ai-writer';

export default function AIWriter({onPick}:{onPick:(draft:AIDraft,topic:string)=>void}) {
  const [brief,setBrief]=useState('');
  const [facts,setFacts]=useState('');
  const [tone,setTone]=useState<WriterInput['tone']>('Degen × builder');
  const [topic,setTopic]=useState<WriterInput['topic']>('Web3 take');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [activation,setActivation]=useState(false);
  const [result,setResult]=useState<{drafts:AIDraft[];topic:string;remaining:number;model:string}|null>(null);
  const [connection,setConnection]=useState<{configured:boolean;model:string|null}|null>(null);
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{const abort=new AbortController();void fetch('/api/x/generate',{cache:'no-store',signal:abort.signal}).then(async r=>{if(r.ok)setConnection(await r.json());}).catch(()=>{});return()=>abort.abort();},[]);
  async function generate(event:React.FormEvent) {
    event.preventDefault();
    if(controller.current)return;
    const abort=new AbortController();controller.current=abort;
    setBusy(true);setError('');setNotice('');setActivation(false);
    try {
      const response=await fetch('/api/x/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief,facts,tone,topic}),signal:abort.signal});
      const data=await response.json();
      if(!response.ok){setActivation(data.code==='activation_required'||data.code==='configuration');throw Error(data.error||'Chưa tạo được bài. Vui lòng thử lại.');}
      setResult({drafts:data.drafts,topic,remaining:data.remaining,model:data.model});
      setNotice('Đã tạo 3 cách viết. Bạn chọn và chỉnh sửa trước khi lưu.');
    }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Chưa kết nối được AI. Ý tưởng của bạn vẫn ở đây.');}
    finally{controller.current=null;if(!abort.signal.aborted)setBusy(false);}
  }
  function edit(index:number,key:keyof AIDraft,value:string){setResult(r=>r?{...r,drafts:r.drafts.map((d,i)=>i===index?{...d,[key]:value}:d)}:r);}
  async function copy(body:string){try{await navigator.clipboard.writeText(body);setNotice('Đã sao chép bài.');}catch{setNotice('Bạn có thể chọn nội dung trong ô và sao chép thủ công.');}}
  return <section className="aiwriter" aria-labelledby="aiwriter-heading">
    <div className="aiwriterheading"><div><p className="aikicker"><Sparkles size={16}/> YOUR AI WRITING PARTNER</p><h3 id="aiwriter-heading">Ý tưởng của bạn. Viết thành bài X.</h3></div><span className="aibadge">ENGLISH · @only__dylan</span></div>
    <form onSubmit={generate} className="aibrief">
      {connection&&!connection.configured&&<p className="aifootnote">Chưa cấu hình API key. Thêm OPENAI_API_KEY (hoặc GEMINI_API_KEY) trong Vercel → Production và triển khai lại. Không nhập key vào ô nội dung bên dưới.</p>}
      {connection?.configured&&<p className="aifootnote">Đã cấu hình {connection.model} · Dùng API key riêng của bạn.</p>}
      <label htmlFor="ai-brief">Bạn muốn viết về điều gì?</label>
      <textarea id="ai-brief" value={brief} onChange={e=>setBrief(e.target.value)} minLength={10} maxLength={3000} required rows={3} disabled={busy} placeholder="Viết tiếng Việt cũng được. Ví dụ: Một góc nhìn về việc chọn ít dự án airdrop để research kỹ, thay vì farm mọi thứ…"/>
      <div className="aichoices"><div><label id="ai-topic-label">Chủ đề</label><Select value={topic} onValueChange={v=>{if(v)setTopic(v as WriterInput['topic']);}} disabled={busy}><SelectTrigger aria-labelledby="ai-topic-label"><SelectValue/></SelectTrigger><SelectContent>{aiTopics.map(t=><SelectItem value={t} key={t}>{t}</SelectItem>)}</SelectContent></Select></div><div><label id="ai-tone-label">Giọng viết</label><Select value={tone} onValueChange={v=>{if(v)setTone(v as WriterInput['tone']);}} disabled={busy}><SelectTrigger aria-labelledby="ai-tone-label"><SelectValue/></SelectTrigger><SelectContent>{aiTones.map(t=><SelectItem value={t} key={t}>{t}</SelectItem>)}</SelectContent></Select></div></div>
      <details className="aifactdetails"><summary>Thêm dữ kiện, trích đoạn nguồn hoặc bản nháp cần viết lại</summary><label htmlFor="ai-facts">Thông tin AI được phép sử dụng</label><textarea id="ai-facts" value={facts} onChange={e=>setFacts(e.target.value)} maxLength={6000} rows={4} disabled={busy} placeholder="Dán thông tin đã xác nhận, góc nhìn của bạn, @mention và link cần giữ. AI không tự mở hoặc kiểm chứng đường link."/></details>
      <div className="aigeneratebar"><p>Chỉ gửi nội dung trong khung này đến AI. Không gửi dữ liệu profit hoặc note của ngày.</p><button type="submit" className="action primary" disabled={busy||brief.trim().length<10}>{busy?<LoaderCircle className="aispin" size={17}/>:<Sparkles size={17}/>} {busy?'AI đang viết…':result?'Tạo 3 bản mới':'AI viết 3 bản nháp'}</button></div>
      <p className="ailimit">Tối đa 20 yêu cầu/ngày · Mỗi lần bấm có thể dùng credit AI, kể cả khi bạn không lưu bài.</p>
    </form>
    {error&&<div className="errorbox" role="alert">{error}{activation&&<p><a href="https://vercel.com/dylansobads-projects/dylan-web3-hq/settings/environment-variables" target="_blank" rel="noopener noreferrer">Mở cấu hình API key trên Vercel ↗</a> · Không gửi API key vào ô viết bài.</p>}</div>}
    {notice&&<p className="ainotice" role="status">{notice}</p>}
    {result&&<div className="airesults"><div className="airesultheading"><h4>Chọn cách nói đúng với bạn</h4><span>Còn {result.remaining} lượt hôm nay · {result.model}</span></div><div className="aidraftgrid">{result.drafts.map((draft,index)=><article className="aidraft" key={index}><span className="aivariant">OPTION 0{index+1}</span><label htmlFor={'ai-title-'+index}>Tiêu đề bản nháp</label><input id={'ai-title-'+index} value={draft.title} maxLength={120} disabled={busy} onChange={e=>edit(index,'title',e.target.value)}/><label className="sr-only" htmlFor={'ai-body-'+index}>Nội dung lựa chọn {index+1}</label><textarea id={'ai-body-'+index} value={draft.body} rows={6} maxLength={16000} disabled={busy} onChange={e=>edit(index,'body',e.target.value)}/><p className={Array.from(draft.body).length>280?'aicount warning':'aicount'}>{Array.from(draft.body).length} ký tự tham khảo · X tính link/emoji riêng.</p><div className="aidraftactions"><button type="button" className="iconbutton" aria-label={'Sao chép lựa chọn '+(index+1)} onClick={()=>void copy(draft.body)}><Copy size={17}/></button><button type="button" className="action" disabled={busy||!draft.title.trim()||!draft.body.trim()} onClick={()=>onPick(draft,result.topic)}>Dùng bản này <ArrowUpRight size={16}/></button></div></article>)}</div><p className="aifootnote">AI có thể viết sai dữ kiện. Kiểm tra thông tin trước khi đăng. “Dùng bản này” mở trình sửa; bài chỉ được lưu khi bạn bấm Lưu, không tự đăng lên X.</p></div>}
  </section>;
}
