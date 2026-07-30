const { spawn } = require('node:child_process');
const path = require('node:path');

const port = process.env.PORT || '5000';
const viteBinary = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['vite', 'preview', '--host', '0.0.0.0', '--port', port];

const child = spawn(viteBinary, args, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to start preview server:', error);
  process.exit(1);
});
