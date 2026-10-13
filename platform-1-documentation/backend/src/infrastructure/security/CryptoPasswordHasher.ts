import crypto from 'crypto';
import { IPasswordHasher } from '../../domain/services/IPasswordHasher.js';

export class CryptoPasswordHasher implements IPasswordHasher {
  private readonly iterations = 100000;
  private readonly keyLength = 64;
  private readonly digest = 'sha512';

  generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  hash(password: string, salt: string): string {
    return crypto
      .pbkdf2Sync(password, salt, this.iterations, this.keyLength, this.digest)
      .toString('hex');
  }

  verify(password: string, salt: string, expectedHash: string): boolean {
    const computedHash = this.hash(password, salt);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );
    } catch {
      return false;
    }
  }
}
