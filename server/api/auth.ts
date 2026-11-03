import { auth } from '../src/auth.ts';

// Every /api/auth/* path is rewritten to this function in vercel.json, and Better Auth reads the original path.
export function GET(request: Request): Promise<Response> {
  return auth.handler(request);
}

export function POST(request: Request): Promise<Response> {
  return auth.handler(request);
}
