import { hash, verify } from "@node-rs/argon2";

/**
 * argon2id with parameters from the OWASP Password Storage Cheat Sheet.
 * We own auth precisely so there is no per-MAU bill; that makes getting the
 * hashing right our responsibility rather than a vendor's.
 */
const OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashPassword = (plain: string) => hash(plain, OPTIONS);

/**
 * Returns false rather than throwing on a malformed stored hash, so a corrupt
 * row cannot be distinguished from a wrong password by timing or status code.
 */
export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain, OPTIONS);
  } catch {
    return false;
  }
}
