import { Injectable } from '@nestjs/common';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { IPasswordHasher } from '../interfaces/password-hasher.interface';

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64; // 64 bytes derived key
const SALT_LENGTH = 16; // 16 bytes random salt

@Injectable()
export class PasswordHasherService implements IPasswordHasher {
  /**
   * Hashes a plaintext password using cryptographically secure scrypt with a unique random salt.
   * Format: scrypt$<saltHex>$<hashHex>
   */
  async hash(plainText: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const derivedKey = (await scryptAsync(plainText, salt, KEY_LENGTH)) as Buffer;
    return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  /**
   * Compares a plaintext password against a stored scrypt hash using timing-safe comparison.
   */
  async compare(plainText: string, hashed: string): Promise<boolean> {
    const parts = hashed.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = Buffer.from(parts[1], 'hex');
    const storedDerivedKey = Buffer.from(parts[2], 'hex');

    if (salt.length !== SALT_LENGTH || storedDerivedKey.length !== KEY_LENGTH) {
      return false;
    }

    const currentDerivedKey = (await scryptAsync(plainText, salt, KEY_LENGTH)) as Buffer;
    return timingSafeEqual(storedDerivedKey, currentDerivedKey);
  }
}
