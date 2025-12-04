const fs = require('fs');
const path = require('path');
let asar;
try {
  asar = require('asar');
} catch {}

module.exports = async function afterPack(context) {
  try {
    const appOutDir = context.appOutDir;
    const platform = context.electronPlatformName;
    const arch = context.arch;

    console.log('[afterPack] platform:', platform, 'arch:', arch);
    console.log('[afterPack] appOutDir:', appOutDir);

    // Find the .app bundle inside appOutDir
    let appBundle = null;
    try {
      const entries = fs.readdirSync(appOutDir);
      console.log('[afterPack] appOutDir entries:', entries);
      appBundle = entries.find((e) => e.endsWith('.app')) || null;
    } catch (e) {
      console.log('[afterPack] readdir appOutDir error:', e && e.message ? e.message : e);
    }

    if (!appBundle) {
      console.log('[afterPack] No .app bundle found in appOutDir');
      return;
    }

    const appBundlePath = path.join(appOutDir, appBundle);
  const resourcesAppPath = path.join(appBundlePath, 'Contents', 'Resources', 'app');
  const resourcesAppAsarPath = path.join(appBundlePath, 'Contents', 'Resources', 'app.asar');
  const mainPath = path.join(resourcesAppPath, 'main.js');
  const indexPath = path.join(resourcesAppPath, 'dist', 'index.html');

    const resourcesExists = fs.existsSync(resourcesAppPath);
    const mainExists = fs.existsSync(mainPath);
    const indexExists = fs.existsSync(indexPath);

  console.log('[afterPack] .app path:', appBundlePath);
  console.log('[afterPack] Resources/app exists:', resourcesExists);
  console.log('[afterPack] Resources/app/main.js exists:', mainExists);
  console.log('[afterPack] Resources/app/dist/index.html exists:', indexExists);
  const asarExists = fs.existsSync(resourcesAppAsarPath);
  console.log('[afterPack] Resources/app.asar exists:', asarExists);
  if (asarExists && asar) {
    try {
      // Inspect package.json inside app.asar
      const pkgBuf = asar.extractFile(resourcesAppAsarPath, 'package.json');
      const pkgJson = JSON.parse(pkgBuf.toString('utf8'));
      const pkgMain = pkgJson && pkgJson.main ? pkgJson.main : null;
      console.log('[afterPack] app.asar package.json main:', pkgMain);
      // Check presence of main.js and the declared main
      let asarHasMainJs = false;
      let asarHasDeclaredMain = false;
      try {
        const test = asar.extractFile(resourcesAppAsarPath, 'main.js');
        asarHasMainJs = Buffer.isBuffer(test);
      } catch {}
      if (pkgMain) {
        try {
          const test2 = asar.extractFile(resourcesAppAsarPath, pkgMain);
          asarHasDeclaredMain = Buffer.isBuffer(test2);
        } catch {}
      }
      console.log('[afterPack] app.asar has top-level main.js:', asarHasMainJs);
      console.log('[afterPack] app.asar has declared main path:', asarHasDeclaredMain);
      // Check index.html within dist inside asar
      let asarHasIndexHtml = false;
      try {
        const idx = asar.extractFile(resourcesAppAsarPath, 'dist/index.html');
        asarHasIndexHtml = Buffer.isBuffer(idx);
      } catch {}
      console.log('[afterPack] app.asar has dist/index.html:', asarHasIndexHtml);
    } catch (e) {
      console.log('[afterPack] error inspecting app.asar:', e && e.message ? e.message : e);
    }
  } else if (asarExists && !asar) {
    console.log('[afterPack] asar module not available; cannot inspect app.asar contents');
  }

    // If main.js is missing, try to copy it from the project appDir as a safeguard
    if (resourcesExists && !mainExists) {
      try {
        const appDir = (context && (context.packager && context.packager.appDir)) || process.cwd();
        const sourceMain = path.join(appDir, 'main.js');
        if (fs.existsSync(sourceMain)) {
          fs.copyFileSync(sourceMain, mainPath);
          console.log('[afterPack] main.js was missing; copied from', sourceMain, 'to', mainPath);
        } else {
          console.log('[afterPack] source main.js not found at', sourceMain);
        }
      } catch (e) {
        console.log('[afterPack] error copying main.js:', e && e.message ? e.message : e);
      }
      // Re-check after copy attempt
      try {
        const nowMainExists = fs.existsSync(mainPath);
        console.log('[afterPack] Resources/app/main.js exists after copy attempt:', nowMainExists);
      } catch {}
    }

  if (resourcesExists) {
    try {
      const appEntries = fs.readdirSync(resourcesAppPath);
      console.log('[afterPack] Resources/app entries:', appEntries);
      } catch (e) {
        console.log('[afterPack] readdir Resources/app error:', e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.log('[afterPack] error:', e && e.message ? e.message : e);
  }
};
