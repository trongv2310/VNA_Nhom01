import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserAccountType } from '../entities/user.entity';

export interface JwtPayload {
  sub: number;
  username: string;
  roles: string[];
  permissions?: string[];
  accountType: UserAccountType;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'vna_access_secret_key',
    });
  }

  validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    return {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions ?? [],
      accountType: payload.accountType,
    };
  }
}
