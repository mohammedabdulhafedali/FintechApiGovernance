export interface IPasswordHasher {
  hash(password: string, salt: string): string;
  generateSalt(): string;
  verify(password: string, salt: string, expectedHash: string): boolean;
}
