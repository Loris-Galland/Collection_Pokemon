/** Checks that the API responds. */
export function GET(): Response {
  return Response.json({ status: 'ok', time: new Date().toISOString() });
}
