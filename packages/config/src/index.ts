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
  tagline: "Prepaid credits for your app features",
  org: "Circuit Studio",
  feeNote:
    "Free to start. 1–2% platform fee on top-ups above about $1,000/month. Pro dashboard later.",
  settlementNote:
    "PayPal processes payments to the builder’s account. MeterKit records credit balances and usage.",
} as const;

export type Brand = typeof BRAND;
