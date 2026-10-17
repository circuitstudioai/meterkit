export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS";
  constructor(
    public readonly userId: string,
    public readonly required: number,
    public readonly balance: number
  ) {
    super(
      `Insufficient credits for ${userId}: need ${required}, have ${balance}`
    );
    this.name = "InsufficientCreditsError";
  }
}

export class FeatureNotPricedError extends Error {
  readonly code = "FEATURE_NOT_PRICED";
  constructor(public readonly featureKey: string) {
    super(`No price catalog entry for feature "${featureKey}"`);
    this.name = "FeatureNotPricedError";
  }
}

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";
  constructor(public readonly key: string) {
    super(`Idempotency key "${key}" was reused with different debit details`);
    this.name = "IdempotencyConflictError";
  }
}
