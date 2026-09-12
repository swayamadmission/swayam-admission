import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from '../interfaces/user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IUser => {
    const request = ctx.switchToHttp().getRequest() as { user: IUser };
    return request.user;
  },
);
