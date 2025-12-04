const fs = require('fs');
const path = require('path');

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
    const mainPath = path.join(resourcesAppPath, 'main.js');
    const indexPath = path.join(resourcesAppPath, 'dist', 'index.html');

    const resourcesExists = fs.existsSync(resourcesAppPath);
    const mainExists = fs.existsSync(mainPath);
    const indexExists = fs.existsSync(indexPath);

    console.log('[afterPack] .app path:', appBundlePath);
    console.log('[afterPack] Resources/app exists:', resourcesExists);
    console.log('[afterPack] Resources/app/main.js exists:', mainExists);
    console.log('[afterPack] Resources/app/dist/index.html exists:', indexExists);

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

