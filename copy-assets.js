const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy assets folder from src to dist
const srcAssets = path.join(__dirname, 'src', 'assets');
const distAssets = path.join(__dirname, 'dist', 'src', 'assets');

if (fs.existsSync(srcAssets)) {
  copyDir(srcAssets, distAssets);
  console.log('Assets copied successfully to dist/src/assets/');
} else {
  console.log('No assets folder found in src/');
}
