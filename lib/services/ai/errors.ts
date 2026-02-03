export class UpgradeRequiredError extends Error {
  public readonly status = 402;
  public readonly code = 'UPGRADE_REQUIRED';

  constructor(message: string = 'אין מספיק קרדיטים לביצוע הפעולה') {
    super(message);
    this.name = 'UpgradeRequiredError';
  }
}

export class AIProviderError extends Error {
  public readonly provider: string;
  public readonly status?: number;

  constructor(params: { provider: string; message: string; status?: number; cause?: unknown }) {
    super(params.message);
    this.name = 'AIProviderError';
    this.provider = params.provider;
    this.status = params.status;
    if (params.cause) {
      (this as unknown as { cause?: unknown }).cause = params.cause;
    }
  }
}
