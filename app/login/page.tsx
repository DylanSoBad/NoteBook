import {redirect} from 'next/navigation';
import {getOwner} from '@/lib/auth';
export const dynamic = 'force-dynamic';
const errors: Record<string,string> = {
  invalid:'Mật khẩu chưa đúng. Bạn thử lại nhé.',
  limit:'Bạn đã thử nhiều lần. Vui lòng đợi 15 phút rồi thử lại.',
  unavailable:'Chưa kết nối được hệ thống đăng nhập. Vui lòng thử lại sau.'
};
export default async function Login({searchParams}: {searchParams: Promise<{error?:string}>}) {
  if (await getOwner()) redirect('/');
  const {error} = await searchParams;
  return <main className="loginpage"><section className="logincard">
    <div className="loginmark" aria-hidden="true">d.</div>
    <p className="loginkicker">@only__dylan · PRIVATE WORKSPACE</p>
    <h1>Back to building.</h1>
    <p className="logincopy">Lịch mint, công việc, nội dung X và profit của bạn — cùng một nơi.</p>
    <form action="/api/auth/login" method="post">
      <label htmlFor="password">Mật khẩu của bạn</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} autoFocus/>
      {error && <p role="alert" className="formerror">{errors[error] || errors.invalid}</p>}
      <button className="action primary" type="submit">Mở Dylan HQ ↗</button>
    </form>
    <p className="loginhint">Chỉ người có mật khẩu mới truy cập được dữ liệu.</p>
  </section></main>;
}
