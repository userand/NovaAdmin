export class BusinessException extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}
