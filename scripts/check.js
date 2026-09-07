const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function check(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (file.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(1);
    }
  }
}

for (const directory of ['config', 'controllers', 'middleware', 'models', 'routes', 'utils', 'scripts', 'tests']) check(path.join(__dirname, '..', directory));
for (const file of ['app.js', 'server.js']) {
  if (spawnSync(process.execPath, ['--check', path.join(__dirname, '..', file)], { stdio: 'inherit' }).status !== 0) process.exit(1);
}
console.log('JavaScript syntax checks passed.');
