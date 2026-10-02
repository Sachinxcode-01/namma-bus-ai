import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  let service: PasswordHasherService;

  beforeEach(() => {
    service = new PasswordHasherService();
  });

  it('should hash a password and produce a valid scrypt format', async () => {
    const password = 'StrongPassword123!';
    const hash = await service.hash(password);

    expect(hash).toBeDefined();
    expect(hash.startsWith('scrypt$')).toBe(true);

    const parts = hash.split('$');
    expect(parts.length).toBe(3);
    expect(parts[1]).toHaveLength(32); // 16 bytes in hex = 32 chars
    expect(parts[2]).toHaveLength(128); // 64 bytes in hex = 128 chars
  });

  it('should verify correct password match', async () => {
    const password = 'CorrectPassword999';
    const hash = await service.hash(password);

    const isMatch = await service.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'OriginalPassword';
    const wrongPassword = 'WrongPassword';
    const hash = await service.hash(password);

    const isMatch = await service.compare(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });

  it('should generate distinct hashes for identical passwords due to unique salts', async () => {
    const password = 'IdenticalPassword123';
    const hash1 = await service.hash(password);
    const hash2 = await service.hash(password);

    expect(hash1).not.toBe(hash2);
    expect(await service.compare(password, hash1)).toBe(true);
    expect(await service.compare(password, hash2)).toBe(true);
  });

  it('should return false for malformed hash strings', async () => {
    expect(await service.compare('test', 'not-a-valid-hash')).toBe(false);
    expect(await service.compare('test', 'scrypt$shortsalt$shorthash')).toBe(false);
  });
});
