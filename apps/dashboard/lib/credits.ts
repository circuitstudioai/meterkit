/** $1 USD = 50 credits in the demo catalog. Editable in the dashboard. */
export const CREDITS_PER_USD = 50;

export function usdToCredits(usd: number): number {
  return Math.round(usd * CREDITS_PER_USD);
}

export function creditsToUsd(credits: number): number {
  return credits / CREDITS_PER_USD;
}
