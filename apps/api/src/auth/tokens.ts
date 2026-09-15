import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.js";

export type Role = "admin" | "coach" | "member";
export interface AccessClaims {
  sub: string;
  role: Role;
}

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export function signAccessToken(userId: string, role: Role) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessKey);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessKey);
  return { sub: payload.sub as string, role: payload.role as Role };
}

/**
 * Refresh tokens are opaque random strings, not JWTs: they must be revocable,
 * and a JWT is not. Only the SHA-256 digest is stored, so a database leak does
 * not hand out working sessions.
 */
export function newRefreshToken() {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export const hashRefreshToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const refreshExpiry = () =>
  new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
