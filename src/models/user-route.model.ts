import mongoose, { Document, Schema } from 'mongoose';

export interface IUserRoute extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userRouteSchema = new Schema<IUserRoute>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  routeId: {
    type: Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'Route ID is required']
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned by user ID is required']
  }
}, {
  timestamps: true,
  collection: 'userRoutes',
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create compound index for userId and routeId (both together must be unique)
userRouteSchema.index({ userId: 1, routeId: 1 }, { unique: true });

// Create index for better query performance
userRouteSchema.index({ userId: 1 });
userRouteSchema.index({ routeId: 1 });

export const UserRoute = mongoose.model<IUserRoute>('UserRoute', userRouteSchema);