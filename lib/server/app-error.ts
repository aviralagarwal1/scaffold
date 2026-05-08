/** Expected failures safe to show to the caller; infrastructure errors stay private. */
export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
