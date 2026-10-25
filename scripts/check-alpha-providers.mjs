// Opt-in build-time checks run inside Vercel, where encrypted values are available.
// Never log response bodies, tokens, keys, URLs containing credentials, or errors.
if (process.env.METERKIT_VERIFY_PROVIDERS === "true") {
  const e = process.env;
  let paypal = false;
  let gemini = false;
  try {
    if (e.PAYPAL_CLIENT_ID && e.PAYPAL_CLIENT_SECRET) {
      const response = await fetch(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                e.PAYPAL_CLIENT_ID + ":" + e.PAYPAL_CLIENT_SECRET,
              ).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
          signal: AbortSignal.timeout(15000),
        },
      );
      const data = await response.json();
      paypal = response.ok && typeof data.access_token === "string";
    }
  } catch {
    /* Pass/fail output only. */
  }
  try {
    const model = e.GEMINI_MODEL || "gemini-2.5-flash";
    if (e.GEMINI_API_KEY && /^[a-zA-Z0-9._-]+$/.test(model)) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": e.GEMINI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Reply only OK." }] }],
            generationConfig: { maxOutputTokens: 64 },
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
      const data = await response.json();
      gemini =
        response.ok &&
        Boolean(data.candidates?.[0]?.content?.parts?.some((p) => p.text));
    }
  } catch {
    /* Pass/fail output only. */
  }
  console.log("MeterKit PayPal sandbox OAuth: " + (paypal ? "PASS" : "FAIL"));
  console.log("MeterKit Gemini generation: " + (gemini ? "PASS" : "FAIL"));
  // Diagnostic failure does not disguise the build result or enable the alpha.
}

// Separate opt-in read-only sandbox metadata check; never runs a model/payment.
await import('./check-sandbox-config.mjs');
