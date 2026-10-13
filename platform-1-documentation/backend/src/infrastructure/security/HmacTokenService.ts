import crypto from 'crypto';
import { ITokenService, TokenPayload } from '../../domain/services/ITokenService.js';
import { User } from '../../domain/entities/User.js';
import { UserGroup } from '../../domain/entities/UserGroup.js';

export class HmacTokenService implements ITokenService {
  private readonly secretKey: string;
  private readonly expirationSeconds = 86400; // 24 hours

  constructor(secretKey = 'fintech-gov-sovereign-master-secret-key-2026') {
    this.secretKey = secretKey;
  }

  issueToken(user: User, group: UserGroup, effectivePermissions: string[]): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      groupId: group.id,
      groupName: group.name,
      effectivePermissions,
      iat: now,
      exp: now + this.expirationSeconds
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (signature !== expectedSignature) return null;

      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload: TokenPayload = JSON.parse(payloadJson);

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) return null;

      return payload;
    } catch {
      return null;
    }
  }
}
