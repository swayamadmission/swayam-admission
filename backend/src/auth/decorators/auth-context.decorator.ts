import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DataScopeContext } from '../data-scope.service';

export const CurrentAuthContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DataScopeContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.authContext;
  },
);
