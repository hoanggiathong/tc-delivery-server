import mongoose, {
  Schema,
  type Document,
  type Types,
} from 'mongoose';

export type MobileNotificationType =
  | 'system'
  | 'promotion'
  | 'order'
  | 'money';

export type MobileNotificationTargetType =
  | 'notification'
  | 'delivery'
  | 'money-delivery'
  | 'security'
  | 'news';

export type MobileNotificationAudience =
  | 'global'
  | 'account';

export type MobileNotificationSource =
  | 'admin'
  | 'delivery-event'
  | 'money-event'
  | 'security-event'
  | 'news-event';

export type MobileNotificationRecipientRole =
  | 'sender'
  | 'receiver';

export type MobileNotificationPushStatus =
  | 'pending'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'skipped';

export interface IMobileNotificationCreatedBy {
  userId: Types.ObjectId;
  username: string;
  role: string;
}

export interface IMobileNotificationPushResult {
  status: MobileNotificationPushStatus;
  attempted: number;
  success: number;
  failure: number;
  invalidTokens: number;
}

export interface IMobileNotification
  extends Document {
  title: string;
  content: string;
  type: MobileNotificationType;

  targetType: MobileNotificationTargetType;
  targetId?: string;
  targetCode?: string;
  targetDeviceId?: string;

  audience: MobileNotificationAudience;
  recipientAccountId?: Types.ObjectId | null;
  recipientRole?: MobileNotificationRecipientRole | null;

  source: MobileNotificationSource;
  eventKey?: string;

  isActive: boolean;
  createdBy?: IMobileNotificationCreatedBy;
  pushResult?: IMobileNotificationPushResult;
  sentAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const MobileNotificationSchema =
  new Schema<IMobileNotification>(
    {
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      type: {
        type: String,
        enum: [
          'system',
          'promotion',
          'order',
          'money',
        ],
        required: true,
        default: 'system',
      },

      targetType: {
        type: String,
        enum: [
          'notification',
          'delivery',
          'money-delivery',
          'security',
          'news',
        ],
        required: true,
        default: 'notification',
      },

      targetId: {
        type: String,
        trim: true,
        maxlength: 100,
        default: '',
      },

      targetCode: {
        type: String,
        trim: true,
        /**
         * News slug cho phép tối đa 180 ký tự.
         * Giữ dư 20 ký tự để targetCode không làm hỏng deep-link.
         */
        maxlength: 200,
        default: '',
      },

      targetDeviceId: {
        type: String,
        trim: true,
        maxlength: 200,
        default: '',
      },

      audience: {
        type: String,
        enum: [
          'global',
          'account',
        ],
        required: true,
        default: 'global',
      },

      recipientAccountId: {
        type: Schema.Types.ObjectId,
        ref: 'MobileCustomerAccount',
        default: null,
      },

      recipientRole: {
        type: String,
        enum: [
          'sender',
          'receiver',
        ],
        default: null,
      },

      source: {
        type: String,
        enum: [
          'admin',
          'delivery-event',
          'money-event',
          'security-event',
          'news-event',
        ],
        required: true,
        default: 'admin',
      },

      /**
       * Không đặt default null để unique + sparse
       * bỏ qua notification không có eventKey.
       */
      eventKey: {
        type: String,
        trim: true,
        maxlength: 300,
        required: false,
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      createdBy: {
        userId: {
          type: Schema.Types.ObjectId,
          required: false,
        },

        username: {
          type: String,
          trim: true,
          default: '',
        },

        role: {
          type: String,
          trim: true,
          default: '',
        },
      },

      pushResult: {
        status: {
          type: String,
          enum: [
            'pending',
            'completed',
            'partial',
            'failed',
            'skipped',
          ],
          default: 'pending',
        },

        attempted: {
          type: Number,
          min: 0,
          default: 0,
        },

        success: {
          type: Number,
          min: 0,
          default: 0,
        },

        failure: {
          type: Number,
          min: 0,
          default: 0,
        },

        invalidTokens: {
          type: Number,
          min: 0,
          default: 0,
        },
      },

      sentAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      collection: 'mobile_notifications',
    }
  );

MobileNotificationSchema.index(
  {
    audience: 1,
    recipientAccountId: 1,
    isActive: 1,
    createdAt: -1,
  },
  {
    name:
      'idx_mobile_notifications_recipient_created_at',
  }
);

MobileNotificationSchema.index(
  {
    source: 1,
    isActive: 1,
    createdAt: -1,
  },
  {
    name:
      'idx_mobile_notifications_source_created_at',
  }
);

MobileNotificationSchema.index(
  {
    type: 1,
    isActive: 1,
    createdAt: -1,
  },
  {
    name:
      'idx_mobile_notifications_type_active_created_at',
  }
);

MobileNotificationSchema.index(
  {
    eventKey: 1,
  },
  {
    unique: true,
    sparse: true,
    name:
      'idx_mobile_notifications_event_key_unique',
  }
);

export const MobileNotification =
  (mongoose.models.mobile_notifications as
    | mongoose.Model<IMobileNotification>
    | undefined) ||
  mongoose.model<IMobileNotification>(
    'mobile_notifications',
    MobileNotificationSchema
  );
