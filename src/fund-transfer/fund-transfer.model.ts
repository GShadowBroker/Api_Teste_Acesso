import * as mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const FundTransferSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  accountOrigin: { type: String, required: true },
  accountDestination: { type: String, required: true },
  value: { type: Number, required: true },
  status: {
    type: String,
    enum: ["In Queue", "Processing", "Confirmed", "Error"],
    default: "In Queue"
  },
  errorMessage: String
});

/**
 * Creates a fund transfer object which is going to be saved in the database.
 * @param accountOrigin [string] The account making the transfer.
 * @param accountDestination [string] The destination account to which the value is being moved.
 * @param value [number] The money amount expressed as a float.
 */
export class FundTransfer {
  readonly transactionId: string;
  readonly accountOrigin: string;
  readonly accountDestination: string;
  readonly value: number;
  readonly createdAt: string;

  constructor(
    accountOrigin: string,
    accountDestination: string,
    value: number,
  ) {
    this.transactionId = uuidv4();
    this.accountOrigin = accountOrigin;
    this.accountDestination = accountDestination;
    this.value = value;
    this.createdAt = new Date().toString();
  }
}
