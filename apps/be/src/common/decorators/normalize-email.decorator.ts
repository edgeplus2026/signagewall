import { Transform } from 'class-transformer';

/**
 * Normalizes an email field at the DTO boundary: trims surrounding
 * whitespace and lowercases it. Apply alongside `@IsEmail()` so every
 * layer downstream (services, repositories, schema) can assume a clean,
 * canonical email and skip ad-hoc `.toLowerCase()` calls.
 */
export const NormalizeEmail = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
