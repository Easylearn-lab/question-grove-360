import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

function isLocalhost(req: Request): boolean {
  const hostname = req.hostname || req.headers.host?.split(":")[0] || "";
  return LOCAL_HOSTS.has(hostname);
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // For production (non-localhost), always set secure: true
  // This is critical because sameSite: "none" requires secure: true
  // and the x-forwarded-proto header may not always be present on custom domains
  const secure = isLocalhost(req) ? isSecureRequest(req) : true;

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure,
  };
}
