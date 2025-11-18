const fs = require('fs');
const path = require('path');

const rootShared = path.resolve(__dirname, '..', '..', 'shared');
const target = path.resolve(__dirname, '..', 'src', 'shared');

function copyFolder(from, to) {
  if (!fs.existsSync(from)) {
    console.warn('Shared folder missing at', from);
    return;
  }

  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyFolder(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

copyFolder(rootShared, target);
console.log('Synced shared resources to functions/src/shared');
