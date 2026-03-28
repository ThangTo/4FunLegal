import crypto from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;

const scryptAsync = (value: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(value, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey as Buffer);
    });
  });

export const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password: string, storedHash?: string | null) => {
  if (!storedHash) {
    return false;
  }

  const [salt, expectedHash] = storedHash.split(':');

  if (!salt || !expectedHash) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (expectedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, derivedKey);
};
