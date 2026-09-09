import {getChatGPTUser} from '@/app/chatgpt-auth';
import {catalog,prices} from '@/lib/coin-market';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){if(!await getChatGPTUser())return json({error:'Đăng nhập để xem bảng giá coin.'},401);const params=new URL(request.url).searchParams;
 try{if(params.get('mode')==='catalog')return json(await catalog());if(params.get('mode')!=='prices')return json({error:'Yêu cầu không hợp lệ.'},400);const ids=(params.get('ids')??'').split(',');if(!ids.length||ids.length>50||ids.some(id=>!id||id.length>200||/[\x00-\x1f]/.test(id)))return json({error:'Mỗi lần tra cứu tối đa 50 coin.'},400);return json(await prices(ids));}
 catch(e){return json({error:e instanceof Error&&e.name!=='TimeoutError'?e.message:'Nguồn giá chưa phản hồi. Thử lại hoặc dùng tỷ giá tự nhập.'},503)}
}
