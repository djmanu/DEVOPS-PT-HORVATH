const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');

const waitOn = require('wait-on');

const execFileAsync = promisify(execFile);

const rootDir = path.resolve(__dirname, '..');
const sutDir = path.join(rootDir, '.sut', 'library-management-system');
const setupScript = path.join(rootDir, 'scripts', 'setup-sut.js');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const SUT_PORT = Number(process.env.SUT_PORT || 3100);
const baseURL = `http://127.0.0.1:${SUT_PORT}`;

let serverProcess = null;
let recentLogs = '';

function trimLogs(chunk) {
  recentLogs += chunk.toString();
  if (recentLogs.length > 8_000) {
    recentLogs = recentLogs.slice(-8_000);
  }
}

async function runCommand(command, args, options) {
  const commandToRun = process.platform === 'win32' && command.endsWith('.cmd') ? 'cmd.exe' : command;
  const argsToRun = process.platform === 'win32' && command.endsWith('.cmd')
    ? ['/c', command, ...args]
    : args;

  try {
    return await execFileAsync(commandToRun, argsToRun, {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      ...options,
    });
  } catch (error) {
    const stdout = error.stdout ? `\nSTDOUT:\n${error.stdout}` : '';
    const stderr = error.stderr ? `\nSTDERR:\n${error.stderr}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${stdout}${stderr}`);
  }
}

async function ensureSutPrepared() {
  if (!fs.existsSync(path.join(sutDir, 'package.json'))) {
    await runCommand(process.execPath, [setupScript], { cwd: rootDir, env: process.env });
  }

  if (!fs.existsSync(path.join(sutDir, 'node_modules'))) {
    await runCommand(npmCommand, ['install'], { cwd: sutDir, env: process.env });
  }
}

async function resetDatabase() {
  await runCommand(npmCommand, ['run', 'seed'], {
    cwd: sutDir,
    env: { ...process.env, PORT: String(SUT_PORT) },
  });
}

async function startSut() {
  if (serverProcess) {
    return;
  }

  recentLogs = '';

  const serverCommand = process.platform === 'win32' ? 'cmd.exe' : npmCommand;
  const serverArgs = process.platform === 'win32' ? ['/c', npmCommand, 'start'] : ['start'];

  serverProcess = spawn(serverCommand, serverArgs, {
    cwd: sutDir,
    env: { ...process.env, PORT: String(SUT_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  serverProcess.stdout.on('data', trimLogs);
  serverProcess.stderr.on('data', trimLogs);
  serverProcess.once('exit', () => {
    serverProcess = null;
  });

  try {
    await waitOn({
      resources: [`${baseURL}/api-docs.json`],
      timeout: 30_000,
      interval: 250,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    await stopSut();
    const logText = recentLogs.trim();
    throw new Error(
      `SUT did not start on ${baseURL}.${logText ? `\nRecent logs:\n${logText}` : ''}`
    );
  }
}

async function stopSut() {
  if (!serverProcess) {
    return;
  }

  const processToStop = serverProcess;
  serverProcess = null;

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        processToStop.kill('SIGKILL');
      } catch {
        // Best effort shutdown.
      }
      resolve();
    }, 5_000);

    processToStop.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    try {
      processToStop.kill();
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });

  try {
    await waitOn({
      resources: [`tcp:127.0.0.1:${SUT_PORT}`],
      reverse: true,
      timeout: 10_000,
      interval: 250,
    });
  } catch {
    // The server may already be gone; ignore shutdown wait failures.
  }
}

async function resetAndStartSut() {
  await ensureSutPrepared();
  await stopSut();
  await resetDatabase();
  await startSut();
}

module.exports = {
  baseURL,
  SUT_PORT,
  sutDir,
  ensureSutPrepared,
  resetAndStartSut,
  stopSut,
};
