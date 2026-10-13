import { Request, Response, NextFunction } from 'express';
import { ITokenService, TokenPayload } from '../../domain/services/ITokenService.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function createAuthMiddleware(tokenService: ITokenService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'مطلوب تسجيل الدخول وتوفير رمز مصادقة صالح (Bearer Token).'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = tokenService.verifyToken(token);

    if (!payload) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'رمز المصادقة غير صالح أو منتهي الصلاحية.'
      });
      return;
    }

    req.user = payload;
    next();
  };
}
