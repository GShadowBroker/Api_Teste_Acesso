export class TransactionIdResponse {
  transactionId: string;
}

export enum TransferStatus {
  IN_QUEUE = 'In Queue',
  PROCESSING = 'Processing',
  CONFIRMED = 'Confirmed',
  ERROR = 'Error',
}

/**
 * Creates a standard transaction response object
 * @param status The transfer status: In Queue, Processing, Confirmed or Error.
 * @param message If status is an Error, send message explaining the error.
 */
export class TransactionStatusResponse {
  Status: TransferStatus;
  Message?: string;

  constructor(status: TransferStatus, message?: string) {
    this.Status = status;
    this.Message = message;
  }
}
