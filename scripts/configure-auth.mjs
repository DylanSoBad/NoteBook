import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const {env} = JSON.parse(readFileSync('.vercel/private-access.json','utf8'));
for (const [name,value] of Object.entries(env)) {
  // Secrets go through stdin, never in command arguments or source files.
  const result = spawnSync('npx', ['--yes','vercel@59.11.7','env','add',name,'production','--sensitive','--non-interactive'], {
    shell: process.platform === 'win32', input:value, encoding:'utf8',windowsHide:true
  });
  if (result.status !== 0) {
    console.error(`Could not configure ${name}. Check whether it already exists in Vercel.`);
    process.exit(1);
  }
  console.log(`${name} configured for production.`);
}
