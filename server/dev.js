import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const children = [];
let stopping = false;

function stopChildren() {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill());
}

function start(args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  children.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
    stopChildren();
  });
  child.on('exit', (code) => {
    if (!stopping) {
      process.exitCode = code || 0;
      stopChildren();
    }
  });
  return child;
}

start([resolve('server/index.js')]);
start([resolve('node_modules/vite/bin/vite.js')]);

process.on('SIGINT', stopChildren);
process.on('SIGTERM', stopChildren);