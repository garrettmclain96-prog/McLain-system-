// Tells the page which assistants this deployment can reach, without exposing keys.
export function GET() {
  return Response.json(
    { claude: Boolean(process.env.ANTHROPIC_API_KEY), chatgpt: Boolean(process.env.OPENAI_API_KEY) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
