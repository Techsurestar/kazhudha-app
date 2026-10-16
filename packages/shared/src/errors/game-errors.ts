export class BusinessException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessException';
    Object.setPrototypeOf(this, BusinessException.prototype);
  }
}

export class InvalidMoveException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoveException';
    Object.setPrototypeOf(this, InvalidMoveException.prototype);
  }
}

export class SessionNotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionNotFoundException';
    Object.setPrototypeOf(this, SessionNotFoundException.prototype);
  }
}
