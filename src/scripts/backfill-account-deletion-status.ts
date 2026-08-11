import {
  MobileCustomerAccount,
  MobileCustomerDeletionStatus,
} from '@/modules/mobile-customer/mobile-customer-account.model';

/** Chạy một lần sau khi deploy model mới. */
export const backfillMobileCustomerDeletionStatus = async (): Promise<number> => {
  const result = await MobileCustomerAccount.updateMany(
    {
      deletionStatus: { $exists: false },
    },
    {
      $set: {
        deletionStatus: MobileCustomerDeletionStatus.NONE,
        deletionRequestedAt: null,
        scheduledDeletionAt: null,
        deletionProcessingAt: null,
        deletedAt: null,
        deletionReason: null,
        deletionRequestTokenHash: null,
        deletionRequestTokenExpiresAt: null,
      },
    }
  );

  return Number(result.modifiedCount || 0);
};
