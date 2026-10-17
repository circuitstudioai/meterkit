/**
 * Single place to rename the product. Import this constant everywhere
 * instead of hardcoding "MeterKit".
 */
export const BRAND = {
  name: "MeterKit",
  slug: "meterkit",
  scope: "@meterkit",
  cliBin: "meterkit",
  npmSdk: "@meterkit/sdk",
  npmReact: "@meterkit/react",
  tagline: "Add pay-as-you-go to any feature in 60 seconds",
  org: "Circuit Studio",
  feeNote:
    "Free to start. 1–2% platform fee on top-ups above about $1,000/month. Pro dashboard later.",
  settlementNote:
    "PayPal captures funds into the builder's own PayPal account. MeterKit only keeps a credit ledger — it does not take custody of money.",
} as const;

export type Brand = typeof BRAND;
