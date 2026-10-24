// Historical demo routes cannot select wallets or run unverified model work.
// Only the separately gated, authenticated /api/alpha composition is supported.
function retired() {
  return Response.json(
    { error: "legacy_chat_route_retired", replacement: "/api/alpha" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
export const GET = retired;
export const POST = retired;
export const PUT = retired;
export const PATCH = retired;
export const DELETE = retired;
export const OPTIONS = retired;
export const HEAD = retired;
