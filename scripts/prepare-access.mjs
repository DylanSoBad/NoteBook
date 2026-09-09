import {randomBytes, scryptSync} from 'node:crypto';
import {existsSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';

// Generated private runtime output only; never included in Git or deployment uploads.
mkdirSync('.vercel', {recursive:true});
const path = '.vercel/private-access.json';
if (!existsSync(path)) {
  const password = randomBytes(18).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const env = {
    OWNER_PASSWORD_HASH: `${salt}:${scryptSync(password,salt,64).toString('hex')}`,
    SESSION_SECRET: randomBytes(48).toString('base64url')
  };
  writeFileSync(path, JSON.stringify({password,env}, null, 2), {flag:'wx',mode:0o600});
}
const {password} = JSON.parse(readFileSync(path,'utf8'));
writeFileSync('.vercel/LOGIN.txt', `DYLAN HQ — THÔNG TIN ĐĂNG NHẬP RIÊNG\n\nMật khẩu: ${password}\n\nLưu mật khẩu này vào trình quản lý mật khẩu. Không chia sẻ tệp này.\nKhông cần tài khoản ChatGPT để đăng nhập bản Vercel.\n`, {mode:0o600});
console.log('Private login details prepared in .vercel/LOGIN.txt (excluded from uploads).');
