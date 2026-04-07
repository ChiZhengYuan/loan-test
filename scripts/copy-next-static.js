const fs = require('fs');
const path = require('path');

const root = process.cwd();
const source = path.join(root, '.next', 'static');
const destination = path.join(root, '.next', 'standalone', '.next', 'static');

fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, destination, { recursive: true });

const publicSource = path.join(root, 'public');
const publicDestination = path.join(root, '.next', 'standalone', 'public');
if (fs.existsSync(publicSource)) {
  fs.mkdirSync(publicDestination, { recursive: true });
  fs.cpSync(publicSource, publicDestination, { recursive: true });
}

console.log('Copied Next static assets into standalone output.');
