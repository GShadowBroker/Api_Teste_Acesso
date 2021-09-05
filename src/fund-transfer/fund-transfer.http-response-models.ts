/**
 * Builds a standard transactionId response object. It is the object returned when requesting a new fund transfer.
 * @param transactionId [string] The id of the transaction which is used to check the status of said transaction.
 */
export class TransactionIdResponse {
  transactionId: string;
  constructor(transactionId: string) {
    this.transactionId = transactionId;
  }
}

/**
 * Enum representing the possible transfer status of a fund transfer.
 * @param IN_QUEUE
 * @param CONFIRMED
 * @param PROCESSING
 * @param ERROR
 */
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
  status: TransferStatus;
  message?: string;

  constructor(status: TransferStatus, message?: string) {
    this.status = status;
    this.message = message;
  }
}
