import { type NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ success: true, data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return Response.json({ success: true, data }, { status: 201 });
}

export function badRequest(message: string, issues?: unknown) {
  return Response.json({ success: false, error: { message, issues } }, { status: 400 });
}

export function unauthorized(message = "Authentication required") {
  return Response.json({ success: false, error: { message } }, { status: 401 });
}

export function forbidden(message = "You do not have permission to perform this action") {
  return Response.json({ success: false, error: { message } }, { status: 403 });
}

export function notFound(message = "Resource not found") {
  return Response.json({ success: false, error: { message } }, { status: 404 });
}

export function conflict(message: string) {
  return Response.json({ success: false, error: { message } }, { status: 409 });
}

export function serverError(message = "An unexpected error occurred. Please try again later.") {
  return Response.json({ success: false, error: { message } }, { status: 500 });
}
