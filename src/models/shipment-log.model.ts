import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IShipmentLog extends Document {
  fullCode: string;
  barcode: string;
  tripId: Types.ObjectId;
  tripCode: string;
  type: 'load' | 'unload';
  actionTime: Date;
  driverName: string;
  driverPhone: string;
  licensePlate: string;
  scanCount: number;
  syncTime: Date;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

const shipmentLogSchema = new Schema<IShipmentLog>(
  {
    fullCode: { type: String, trim: true, index: true },
    barcode: { type: String, trim: true, index: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'ShipmentTrip' },
    tripCode: { type: String, trim: true },
    type: { type: String, enum: ['load', 'unload'], index: true },
    actionTime: { type: Date },
    driverName: { type: String, default: '', trim: true },
    driverPhone: { type: String, default: '', trim: true },
    licensePlate: { type: String, default: '', trim: true },
    scanCount: { type: Number, default: 1 },
    syncTime: { type: Date },
    location: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'shipmentlogs',
  }
);

export const ShipmentLog = mongoose.model<IShipmentLog>(
  'ShipmentLog',
  shipmentLogSchema,
  'shipmentlogs'
);
