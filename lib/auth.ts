import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");
const JWT_SECRET: string = process.env.JWT_SECRET;
const COOKIE_NAME = "amo_admin_token";
const MANAGER_COOKIE = "amo_manager_token";

export interface UserSession {
  userId: number;
  username: string;
  role: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    if (!decoded.userId || !decoded.username) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function clearAuthCookie() {
  return { name: COOKIE_NAME, value: "", maxAge: 0, path: "/" };
}

// Manager auth (separate from blog auth)
export function signManagerToken() {
  return jwt.sign({ manager: true }, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyManagerToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { manager?: boolean };
    return decoded.manager === true;
  } catch {
    return false;
  }
}

export async function getManagerSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MANAGER_COOKIE)?.value;
  if (!token) return false;
  return verifyManagerToken(token);
}

export function setManagerCookie(token: string) {
  return {
    name: MANAGER_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function clearManagerCookie() {
  return { name: MANAGER_COOKIE, value: "", maxAge: 0, path: "/" };
}
