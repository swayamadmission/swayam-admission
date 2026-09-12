import os

# Create directories
dirs = [
    'src\\auth\\guards',
    'src\\auth\\decorators',
    'src\\users\\dto',
    'src\\colleges\\dto',
    'src\\applications\\dto'
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    print(f'Created directory: {d}')

# Move files
moves = [
    ('src\\auth\\jwt-auth.guard.ts', 'src\\auth\\guards\\jwt-auth.guard.ts'),
    ('src\\auth\\roles.guard.ts', 'src\\auth\\guards\\roles.guard.ts'),
    ('src\\auth\\roles.decorator.ts', 'src\\auth\\decorators\\roles.decorator.ts'),
    ('src\\auth\\current-user.decorator.ts', 'src\\auth\\decorators\\current-user.decorator.ts')
]

for src, dst in moves:
    if os.path.exists(src):
        with open(src, 'r') as f:
            content = f.read()
        # Remove the comment line
        content = content.replace('// This file will be moved to src/auth/guards/jwt-auth.guard.ts\n', '')
        content = content.replace('// This file will be moved to src/auth/guards/roles.guard.ts\n', '')
        content = content.replace('// This file will be moved to src/auth/decorators/roles.decorator.ts\n', '')
        content = content.replace('// This file will be moved to src/auth/decorators/current-user.decorator.ts\n', '')
        with open(dst, 'w') as f:
            f.write(content)
        os.remove(src)
        print(f'Moved: {src} -> {dst}')

print('Setup complete!')
