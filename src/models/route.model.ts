import mongoose, { Document, Schema } from 'mongoose';

export interface IRoute extends Document {
  _id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const routeSchema = new Schema<IRoute>(
  {
    code: {
      type: String,
      required: [true, 'Code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]\d+$/, 'Code must start with a letter followed by numbers (e.g., T1, T2)'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index is already created by unique: true in the field definition

export const Route = mongoose.model<IRoute>('Route', routeSchema);
