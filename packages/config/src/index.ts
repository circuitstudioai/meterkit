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
  tagline: "Install PayPal credits. Verify the failure cases.",
  org: "Circuit Studio",
  feeNote:
    "Commercial pricing is undecided. No platform fee is collected in this alpha.",
  settlementNote:
    "PayPal processes payments to the builder’s account. MeterKit records credit balances and usage.",
} as const;

export type Brand = typeof BRAND;
