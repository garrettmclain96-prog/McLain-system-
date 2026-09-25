// Capability health for the authenticated McLain System. Never returns secret values.
export function GET() {
  return Response.json(
    {
      version: 2,
      claude: Boolean(process.env.ANTHROPIC_API_KEY),
      chatgpt: Boolean(process.env.OPENAI_API_KEY),
      state: true,
    },
    { headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } },
  );
}
