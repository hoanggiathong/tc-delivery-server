import { CustomerBank, ICustomerBank } from '@/models/customer-bank.model';
import Logger from '@/utils/logger';

export interface BankCreateData {
  name: string;
  bankName: string;
  bankAccount: string;
  bankBranch?: string;
  bankAddress?: string;
  qrCodeUrl?: string;
}

export interface BankUpdateData {
  name?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  bankAddress?: string;
  qrCodeUrl?: string;
}

export class CustomerBankService {
  /**
   * Create new bank info with QR code URL
   */
  async createBank(bankData: BankCreateData): Promise<ICustomerBank> {
    try {
      const bank = new CustomerBank(bankData);
      const savedBank = await bank.save();

      Logger.debug('Bank created', {
        bankId: savedBank._id,
        bankAccount: savedBank.bankAccount,
        bankName: savedBank.bankName,
      });

      return savedBank;
    } catch (error) {
      Logger.error('Failed to create bank', {
        error: error instanceof Error ? error.message : error,
        bankData,
      });
      throw new Error(
        `Failed to create bank: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update existing bank info
   */
  async updateBank(bankId: string, bankData: BankUpdateData): Promise<ICustomerBank> {
    try {
      const updatedBank = await CustomerBank.findByIdAndUpdate(
        bankId,
        { $set: bankData },
        { new: true, runValidators: true }
      );

      if (!updatedBank) {
        throw new Error('Bank not found');
      }

      Logger.debug('Bank updated', {
        bankId: updatedBank._id,
        bankAccount: updatedBank.bankAccount,
        bankName: updatedBank.bankName,
      });

      return updatedBank;
    } catch (error) {
      Logger.error('Failed to update bank', {
        error: error instanceof Error ? error.message : error,
        bankId,
        bankData,
      });
      throw new Error(
        `Failed to update bank: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get bank by ID
   */
  async getBankById(bankId: string): Promise<ICustomerBank | null> {
    try {
      const bank = await CustomerBank.findById(bankId);

      Logger.debug('Bank retrieved by ID', {
        bankId,
        found: !!bank,
      });

      return bank;
    } catch (error) {
      Logger.error('Failed to get bank by ID', {
        error: error instanceof Error ? error.message : error,
        bankId,
      });
      throw new Error(
        `Failed to get bank by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find bank by account number or create new one
   */
  async findOrCreateBank(bankData: BankCreateData): Promise<ICustomerBank> {
    try {
      // Try to find existing bank by account number
      const existingBank = await CustomerBank.findOne({ bankAccount: bankData.bankAccount });

      if (existingBank) {
        // Update existing bank with new data
        const updatedBank = await this.updateBank(existingBank._id.toString(), bankData);
        Logger.debug('Bank found and updated', {
          bankId: updatedBank._id,
          bankAccount: updatedBank.bankAccount,
        });
        return updatedBank;
      } else {
        // Create new bank
        const newBank = await this.createBank(bankData);
        Logger.debug('New bank created', {
          bankId: newBank._id,
          bankAccount: newBank.bankAccount,
        });
        return newBank;
      }
    } catch (error) {
      Logger.error('Failed to find or create bank', {
        error: error instanceof Error ? error.message : error,
        bankData,
      });
      throw new Error(
        `Failed to find or create bank: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete bank by ID
   */
  async deleteBank(bankId: string): Promise<void> {
    try {
      const deletedBank = await CustomerBank.findByIdAndDelete(bankId);

      if (!deletedBank) {
        throw new Error('Bank not found');
      }

      Logger.debug('Bank deleted', {
        bankId,
        bankAccount: deletedBank.bankAccount,
      });
    } catch (error) {
      Logger.error('Failed to delete bank', {
        error: error instanceof Error ? error.message : error,
        bankId,
      });
      throw new Error(
        `Failed to delete bank: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
