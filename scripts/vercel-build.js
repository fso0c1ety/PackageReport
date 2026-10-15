const { spawnSync } = require('node:child_process');

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...extraEnv },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

run('npm', ['run', 'build']);
