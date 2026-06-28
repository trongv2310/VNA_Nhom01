import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserAccountType } from '../entities/user.entity';

export interface CurrentUserData {
  id: number;
  username: string;
  roles: string[];
  permissions?: string[];
  accountType: UserAccountType;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserData => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
