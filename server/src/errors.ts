export class HttpError extends Error {
  public code: number;

  constructor(code: number) {
    super("");

    this.code = code;
  }
}

export class DatabaseError extends Error {}
export class StripeError extends Error {}
