import { randomBytes } from 'node:crypto';

import { EncryptionService } from './encryption.service';

function withKey(key: string | undefined): EncryptionService {
  const configService = { get: () => key } as never;
  return new EncryptionService(configService);
}

const KEY_B64 = randomBytes(32).toString('base64');

describe('EncryptionService', () => {
  it('is disabled when no key is configured', () => {
    const service = withKey(undefined);
    expect(service.isEnabled()).toBe(false);
    expect(() => service.encrypt('secret')).toThrow(/not configured/);
  });

  it('is disabled when the key is not 32 bytes', () => {
    const service = withKey(randomBytes(16).toString('base64'));
    expect(service.isEnabled()).toBe(false);
  });

  it('round-trips a value (base64 key)', () => {
    const service = withKey(KEY_B64);
    expect(service.isEnabled()).toBe(true);
    const secret = 'ya29.a0Abc-refresh-token';
    const envelope = service.encrypt(secret);
    expect(envelope).not.toContain(secret);
    expect(envelope.startsWith('v1.')).toBe(true);
    expect(service.decrypt(envelope)).toBe(secret);
  });

  it('round-trips with a hex key too', () => {
    const service = withKey(randomBytes(32).toString('hex'));
    const envelope = service.encrypt('hello');
    expect(service.decrypt(envelope)).toBe('hello');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const service = withKey(KEY_B64);
    expect(service.encrypt('same')).not.toBe(service.encrypt('same'));
  });

  it('throws when the ciphertext is tampered with', () => {
    const service = withKey(KEY_B64);
    const envelope = service.encrypt('secret');
    const parts = envelope.split('.');
    // Flip a byte in the data segment.
    const data = Buffer.from(parts[3], 'base64url');
    data[0] ^= 0xff;
    parts[3] = data.toString('base64url');
    expect(() => service.decrypt(parts.join('.'))).toThrow();
  });

  it('rejects a malformed envelope', () => {
    const service = withKey(KEY_B64);
    expect(() => service.decrypt('not-an-envelope')).toThrow(/Malformed/);
  });
});
