import * as mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { TransferStatus } from './fund-transfer.http-response-models';

export const FundTransferSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  accountOrigin: { type: String, required: true },
  accountDestination: { type: String, required: true },
  value: { type: Number, required: true },
  status: {
    type: String,
    enum: ["In Queue", "Processing", "Confirmed", "Error"],
    default: "In Queue"
  },
  errorMessage: { type: String, default: "" },
  createdAt: { type: Date, required: true, default: Date.now }
});

/**
 * Creates a fund transfer object which is going to be saved in the database. Also serves as fund transfer model type.
 * @param accountOrigin [string] The account making the transfer.
 * @param accountDestination [string] The destination account to which the value is being moved.
 * @param value [number] The money amount expressed as a float.
 */
export class FundTransfer {
  readonly transactionId: string;
  readonly accountOrigin: string;
  readonly accountDestination: string;
  readonly value: number;
  readonly status: TransferStatus.IN_QUEUE;

  constructor(
    accountOrigin: string,
    accountDestination: string,
    value: number,
  ) {
    this.transactionId = uuidv4();
    this.accountOrigin = accountOrigin;
    this.accountDestination = accountDestination;
    this.value = value;
  }
}
