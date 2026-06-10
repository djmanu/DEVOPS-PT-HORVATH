const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const rootDir = path.resolve(__dirname, '..');
const sutBaseDir = path.join(rootDir, '.sut');
const sutDir = path.join(sutBaseDir, 'library-management-system');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const SUT_REPO = 'https://github.com/horvathkevin/FHB-MCCE-Library-Management-System-Student.git';
const SUT_COMMIT = '1f431df5e48dcfc936729851a80a65d1f6c6db50';

async function run(command, args, options) {
  const commandToRun = process.platform === 'win32' && command.endsWith('.cmd') ? 'cmd.exe' : command;
  const argsToRun = process.platform === 'win32' && command.endsWith('.cmd')
    ? ['/c', command, ...args]
    : args;

  try {
    const result = await execFileAsync(commandToRun, argsToRun, {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      ...options,
    });
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  } catch (error) {
    if (error.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error.stderr) {
      process.stderr.write(error.stderr);
    }
    throw error;
  }
}

async function main() {
  fs.mkdirSync(sutBaseDir, { recursive: true });

  if (!fs.existsSync(path.join(sutDir, '.git'))) {
    await run('git', ['clone', SUT_REPO, sutDir], { cwd: rootDir });
  }

  await run('git', ['fetch', 'origin'], { cwd: sutDir });
  await run('git', ['checkout', '--force', SUT_COMMIT], { cwd: sutDir });

  if (!fs.existsSync(path.join(sutDir, 'node_modules'))) {
    await run(npmCommand, ['install'], { cwd: sutDir, env: process.env });
  }

  process.stdout.write(`Pinned SUT ready in ${sutDir}\n`);
}

main().catch((error) => {
  console.error('Failed to prepare the system under test.');
  console.error(error);
  process.exit(1);
});
