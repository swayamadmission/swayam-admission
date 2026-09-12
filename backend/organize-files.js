const fs = require('fs');
const path = require('path');

const baseDir = process.cwd();

// Create directories
const dirs = [
  'src/auth/guards',
  'src/auth/decorators',
  'src/users/dto',
  'src/colleges',
  'src/colleges/dto',
  'src/applications',
  'src/applications/dto'
];

console.log('Creating directories...');
dirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  } else {
    console.log(`✓ Directory already exists: ${dir}`);
  }
});

// Move existing files to new locations
const fileMoves = [
  { from: 'src/auth/jwt-auth.guard.ts', to: 'src/auth/guards/jwt-auth.guard.ts' },
  { from: 'src/auth/roles.guard.ts', to: 'src/auth/guards/roles.guard.ts' },
  { from: 'src/auth/roles.decorator.ts', to: 'src/auth/decorators/roles.decorator.ts' },
  { from: 'src/auth/current-user.decorator.ts', to: 'src/auth/decorators/current-user.decorator.ts' }
];

console.log('\nMoving files...');
fileMoves.forEach(({ from, to }) => {
  const fromPath = path.join(baseDir, from);
  const toPath = path.join(baseDir, to);
  
  if (fs.existsSync(fromPath)) {
    const content = fs.readFileSync(fromPath, 'utf-8');
    fs.writeFileSync(toPath, content, 'utf-8');
    fs.unlinkSync(fromPath);
    console.log(`✓ Moved: ${from} -> ${to}`);
  }
});

console.log('\n✓ Setup complete!');
