import {redirect} from 'next/navigation';
import {getOwner} from '@/lib/auth';
export const dynamic = 'force-dynamic';
const errors: Record<string,string> = {
  invalid:'Phiên đăng nhập X không hợp lệ hoặc đã hết hạn. Bạn thử lại nhé.',
  forbidden:'Tài khoản X này không có quyền truy cập Dylan HQ.',
  unavailable:'Chưa kết nối được với X. Vui lòng thử lại sau.'
};
export default async function Login({searchParams}: {searchParams: Promise<{error?:string}>}) {
  if (await getOwner()) redirect('/');
  const {error} = await searchParams;
  return <main className="loginpage"><section className="logincard">
    <div className="loginmark" aria-hidden="true">d.</div>
    <p className="loginkicker">@only__dylan · PRIVATE WORKSPACE</p>
    <h1>Back to building.</h1>
    <p className="logincopy">Lịch mint, công việc, nội dung X và profit của bạn — cùng một nơi.</p>
    {error && <p role="alert" className="formerror">{errors[error] || errors.invalid}</p>}
    <a className="action primary" href="/api/auth/x">Đăng nhập bằng X ↗</a>
    <p className="loginhint">Chỉ tài khoản X @only__dylan mới truy cập được dữ liệu.</p>
  </section></main>;
}
