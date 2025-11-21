const fs = require('fs');
const os = require('os');
const path = require('path');

function pickLocalIp() {
  const nets = os.networkInterfaces();
  if (!nets) return null;

  const prefer = ['en0', 'en1', 'eth0', 'eth1', 'wlan0', 'wifi0', 'lan', 'bridge0'];
  const candidates = [];

  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({ name, address: addr.address });
      }
    }
  }

  if (!candidates.length) return null;
  const preferred = candidates.find(c => prefer.some(p => c.name.toLowerCase().startsWith(p)));
  return preferred ? preferred.address : candidates[0].address;
}

function upsertEnv(filePath, key, value) {
  let contents = '';
  if (fs.existsSync(filePath)) {
    contents = fs.readFileSync(filePath, 'utf8');
  }

  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(contents)) {
    contents = contents.replace(regex, line);
  } else {
    if (contents.length && !contents.endsWith('\n')) {
      contents += '\n';
    }
    contents += line + '\n';
  }

  fs.writeFileSync(filePath, contents, 'utf8');
}

function main() {
  const ip = pickLocalIp();
  if (!ip) {
    console.error('❌ Could not determine local IPv4 address.');
    process.exit(1);
  }

  const envPath = path.join(__dirname, 'app', '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`❌ .env not found at ${envPath}. Create it from app/.env.example first.`);
    process.exit(1);
  }

  upsertEnv(envPath, 'EXPO_PUBLIC_EMULATOR_HOST', ip);

  console.log(`✅ Set EXPO_PUBLIC_EMULATOR_HOST=${ip} in app/.env`);
  console.log('   Restart Expo so the new host is picked up.');
}

main();
