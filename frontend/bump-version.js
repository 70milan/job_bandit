// bump-version.js - Auto-increment patch version before build
const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Parse current version
const [major, minor, patch] = pkg.version.split('.').map(Number);

// Increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;
pkg.version = newVersion;

// Write back
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Version bumped: ${major}.${minor}.${patch} -> ${newVersion}`);
