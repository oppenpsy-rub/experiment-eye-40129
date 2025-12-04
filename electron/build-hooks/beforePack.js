const fs = require('fs');
const path = require('path');

module.exports = async function beforePack(context) {
  try {
    const appDir = context.appDir;
    const mainPath = path.join(appDir, 'main.js');
    const indexPath = path.join(appDir, 'dist', 'index.html');
    const pkgPath = path.join(appDir, 'package.json');

    const hasMain = fs.existsSync(mainPath);
    const hasIndex = fs.existsSync(indexPath);
    let pkgMain = null;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkgMain = pkg && pkg.main ? pkg.main : null;
    } catch {}

    console.log('[beforePack] appDir:', appDir);
    console.log('[beforePack] package.json main:', pkgMain);
    console.log('[beforePack] main.js exists:', hasMain);
    console.log('[beforePack] dist/index.html exists:', hasIndex);
    try {
      const entries = fs.readdirSync(appDir);
      console.log('[beforePack] appDir entries:', entries);
    } catch {}
  } catch (e) {
    console.log('[beforePack] error:', e && e.message ? e.message : e);
  }
};

