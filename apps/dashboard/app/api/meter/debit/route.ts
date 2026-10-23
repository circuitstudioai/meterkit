// Historical demo endpoints are intentionally unavailable. Only /api/alpha/*
// may move credits or initiate sandbox payments; it verifies identity and policy.
export async function POST() {
  return Response.json(
    { error: "legacy_payment_route_retired", replacement: "/api/alpha" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
