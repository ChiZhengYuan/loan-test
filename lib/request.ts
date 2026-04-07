import { NextRequest } from "next/server";

export function getRequestIp(request: Request | NextRequest) {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || null;
}

export function getRequestUserAgent(request: Request | NextRequest) {
  return request.headers.get("user-agent") || null;
}

export function getIpFromHeaders(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || null;
}

export function getUserAgentFromHeaders(headers: Headers) {
  return headers.get("user-agent") || null;
}
