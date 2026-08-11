import mongoose, { type Document, Schema, type Types } from 'mongoose';

export interface IMobileNotificationPreference extends Document {
  accountId: Types.ObjectId;

  orderPushEnabled: boolean;
  moneyPushEnabled: boolean;
  promotionPushEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const MobileNotificationPreferenceSchema = new Schema<IMobileNotificationPreference>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'MobileCustomerAccount',
      required: true,
      unique: true,
      index: true,
    },

    orderPushEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },

    moneyPushEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },

    promotionPushEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'mobile_notification_preferences',
  }
);

MobileNotificationPreferenceSchema.index(
  {
    accountId: 1,
  },
  {
    unique: true,
    name: 'mobile_notification_preference_account_unique',
  }
);

export const MobileNotificationPreference =
  (mongoose.models.MobileNotificationPreference as
    | mongoose.Model<IMobileNotificationPreference>
    | undefined) ||
  mongoose.model<IMobileNotificationPreference>(
    'MobileNotificationPreference',
    MobileNotificationPreferenceSchema
  );
