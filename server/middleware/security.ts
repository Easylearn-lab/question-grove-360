import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

/**
 * Rate limiter configuration
 * Limits: 100 requests per 15 minutes per IP
 */
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 15 * 60,
});

/**
 * Rate limiting middleware
 * Protects against brute force and DDoS attacks
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    await rateLimiter.consume(ip);
    next();
  } catch (error) {
    res.status(429).json({
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((error as any).msBeforeNext / 1000),
    });
  }
}

/**
 * CSRF token generation
 */
export function generateCsrfToken(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * CSRF token validation middleware
 */
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for GET requests and webhook endpoints
  if (req.method === "GET" || req.path.startsWith("/api/stripe/webhook")) {
    return next();
  }

  const token = req.headers["x-csrf-token"] as string;
  const sessionToken = (req as any).session?.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({ error: "CSRF token validation failed" });
  }

  next();
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';"
  );

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );

  next();
}

/**
 * Input validation and sanitization
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim()
    .substring(0, 5000); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON Web Token
 */
export function validateJWT(token: string): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    // Verify token structure (basic check)
    Buffer.from(parts[0], "base64");
    Buffer.from(parts[1], "base64");
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize SQL-like inputs
 */
export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['";\\]/g, "") // Remove SQL special characters
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*/g, "") // Remove comment start
    .trim()
    .substring(0, 1000);
}
