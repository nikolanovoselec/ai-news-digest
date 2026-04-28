// Manual refresh is not supported in the global-feed pipeline.
// Returns 410 Gone so stale clients get a cacheable, correct answer.
export async function POST(): Promise<Response> {
  return new Response(null, { status: 410 });
}
export async function GET(): Promise<Response> {
  return new Response(null, { status: 410 });
}
