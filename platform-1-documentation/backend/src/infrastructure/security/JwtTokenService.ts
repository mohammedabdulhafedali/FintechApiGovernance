import jwt from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '../../domain/services/ITokenService.js';
import { User } from '../../domain/entities/User.js';
import { UserGroup } from '../../domain/entities/UserGroup.js';

export class JwtTokenService implements ITokenService {
  private readonly secretKey: string;
  private readonly issuer = 'fintech.gov.sa';
  private readonly audience = 'fintech-api-portal';
  private readonly expiresIn = '24h';

  constructor(secretKey = process.env.JWT_SECRET || 'fintech-gov-sovereign-master-secret-key-2026') {
    this.secretKey = secretKey;
  }

  issueToken(user: User, group: UserGroup, effectivePermissions: string[]): string {
    const claims = {
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      groupId: group.id,
      groupName: group.name,
      userType: user.userType || group.groupType || 'INTERNAL',
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      accessScope: user.accessScope || group.defaultScope || {
        allowedEntityIds: user.userType === 'EXTERNAL' ? (user.organizationId ? [user.organizationId] : []) : ['*'],
        allowedSystemIds: ['*']
      },
      effectivePermissions
    };

    return jwt.sign(claims, this.secretKey, {
      algorithm: 'HS256',
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
      subject: user.id
    });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        algorithms: ['HS256'],
        issuer: this.issuer,
        audience: this.audience
      }) as any;

      if (!decoded || typeof decoded !== 'object') {
        return null;
      }

      return {
        sub: decoded.sub,
        iss: decoded.iss,
        aud: decoded.aud,
        userId: decoded.userId || decoded.sub,
        username: decoded.username,
        email: decoded.email,
        fullName: decoded.fullName,
        groupId: decoded.groupId,
        groupName: decoded.groupName,
        userType: decoded.userType || 'INTERNAL',
        organizationId: decoded.organizationId,
        organizationName: decoded.organizationName,
        accessScope: decoded.accessScope,
        effectivePermissions: decoded.effectivePermissions || [],
        iat: decoded.iat,
        exp: decoded.exp
      };
    } catch {
      return null;
    }
  }
}
