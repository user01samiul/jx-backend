export class ApiError extends Error {
  status: number;
  statusCode: number; // Alias for compatibility

  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.statusCode = status; // Set both for compatibility
    Object.setPrototypeOf(this, new.target.prototype);
  }
}