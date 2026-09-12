const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

// Create directories
const dirs = [
  'src/auth/guards',
  'src/auth/decorators',
  'src/users/dto',
  'src/colleges/dto',
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

// Define file contents
const fileContents = {
  'src/auth/guards/jwt-auth.guard.ts': `import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
`,
  'src/auth/guards/roles.guard.ts': `import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
`,
  'src/auth/decorators/roles.decorator.ts': `import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
`,
  'src/auth/decorators/current-user.decorator.ts': `import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
`
};

// Create files
console.log('\nCreating files...');
Object.keys(fileContents).forEach(filePath => {
  const fullPath = path.join(baseDir, filePath);
  const dirPath = path.dirname(fullPath);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, fileContents[filePath], 'utf-8');
    console.log(`✓ Created file: ${filePath}`);
  } else {
    console.log(`✓ File already exists: ${filePath}`);
  }
});

// Clean up temporary files
console.log('\nCleaning up temporary files...');
const tempFiles = [
  'src/auth/jwt-auth.guard.ts',
  'src/auth/roles.guard.ts',
  'src/auth/roles.decorator.ts',
  'src/auth/current-user.decorator.ts'
];

tempFiles.forEach(file => {
  const fullPath = path.join(baseDir, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`✓ Removed temporary file: ${file}`);
  }
});

console.log('\n✓ Setup complete!');
