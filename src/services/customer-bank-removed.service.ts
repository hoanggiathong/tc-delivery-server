import { CustomerBankRemoved } from '@/models/customer-bank-removed.model';
import Logger from '@/utils/logger';
import fs from 'fs';
import { Types } from 'mongoose';
import path from 'path';
import { CustomerBankService } from './customer-bank.service';

export class CustomerBankRemovedService {
  private customerBankService: CustomerBankService;
  constructor() {
    this.customerBankService = new CustomerBankService();
  }

  /**
   * Move customer bank to removed collection with password verification
   */
  async moveCustomerBankToCustomerBankRemoved(
    userId: string,
    customerId: string,
    bankId: string
  ): Promise<void> {
    try {
      const customerBank = await this.customerBankService.getBankById(bankId);

      if (!customerBank) {
        throw new Error('Customer bank not found');
      }

      // Create removed customer bank record
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 90); // 90 days from now

      const removedCustomerBank = new CustomerBankRemoved({
        customerId: customerId,
        name: customerBank.name,
        bankName: customerBank.bankName,
        bankAccount: customerBank.bankAccount,
        bankBranch: customerBank.bankBranch,
        bankAddress: customerBank.bankAddress,
        qrCodeUrl: customerBank.qrCodeUrl,
        deletedBy: new Types.ObjectId(userId),
        deletedAt: new Date(),
        expiredAt: expiredAt,
      });

      await removedCustomerBank.save();

      //delete qrcode url file
      const qrCodeUrl = customerBank.qrCodeUrl;
      if (qrCodeUrl) {
        const qrCodeUrlPath = path.join('public', qrCodeUrl);
        if (fs.existsSync(qrCodeUrlPath)) {
          fs.unlinkSync(qrCodeUrlPath);
        }
      }

      // delete customer bank info
      await this.customerBankService.deleteBank(bankId);
    } catch (error) {
      Logger.error('Failed to move delivery to removed collection', {
        error: error instanceof Error ? error.message : error,
        bankId: bankId,
        userId,
      });
      throw error;
    }
  }
}
