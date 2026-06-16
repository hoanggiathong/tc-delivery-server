import QRCode from 'qrcode';
import Logger from '@/utils/logger';

export interface GenerateVietQrPayload {
  bankName: string;
  bankAccount: string;
  amount?: number;
  addInfo?: string;
}

export class VietQrService {
  private readonly bankBinMap: Record<string, string> = {
    acb: '970416',
    vietinbank: '970415',
    vietcombank: '970436',
    vcb: '970436',
    bidv: '970418',
    mbbank: '970422',
    mb: '970422',
    techcombank: '970407',
    tcb: '970407',
    sacombank: '970403',
    vpbank: '970432',
    agribank: '970405',
    tpbank: '970423',
    hdbank: '970437',
    shb: '970443',
    lpbank: '970449',
    lienvietpostbank: '970449',
  };

  async generateQrBase64(payload: GenerateVietQrPayload): Promise<string> {
    try {
      const bankBin = this.normalizeBankBin(payload.bankName);
      const accountNumber = String(payload.bankAccount || '').replace(/\D/g, '');
      const amount = Math.max(0, Math.round(Number(payload.amount || 0)));
      const addInfo = String(payload.addInfo || '')
        .trim()
        .slice(0, 99);

      if (!bankBin || !accountNumber) {
        throw new Error('Thiếu thông tin ngân hàng hoặc số tài khoản.');
      }

      const vietQrPayload = this.buildVietQrPayload({
        bankBin,
        accountNumber,
        amount,
        addInfo,
      });

      const qrBase64 = await QRCode.toDataURL(vietQrPayload, {
        type: 'image/png',
        width: 260,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      Logger.debug('VietQR generated successfully', {
        bankBin,
        accountNumber,
        amount,
        addInfo,
      });

      return qrBase64;
    } catch (error) {
      Logger.error('Failed to generate VietQR', {
        error: error instanceof Error ? error.message : error,
        payload,
      });

      throw error;
    }
  }

  private normalizeBankBin(bankName: string): string {
    const raw = String(bankName || '').trim();
    const key = raw.toLowerCase().replace(/\s+/g, '');

    return this.bankBinMap[key] || raw.replace(/\D/g, '');
  }

  private buildVietQrPayload(params: {
    bankBin: string;
    accountNumber: string;
    amount: number;
    addInfo: string;
  }): string {
    const consumerInfo = this.tlv('00', params.bankBin) + this.tlv('01', params.accountNumber);

    const merchantAccountInfo =
      this.tlv('00', 'A000000727') + this.tlv('01', consumerInfo) + this.tlv('02', 'QRIBFTTA');

    let payload =
      this.tlv('00', '01') +
      this.tlv('01', '12') +
      this.tlv('38', merchantAccountInfo) +
      this.tlv('53', '704') +
      (params.amount > 0 ? this.tlv('54', String(params.amount)) : '') +
      this.tlv('58', 'VN') +
      (params.addInfo ? this.tlv('62', this.tlv('08', params.addInfo)) : '');

    payload += '6304';
    payload += this.crc16CcittFalse(payload);

    return payload;
  }

  private tlv(id: string, value: string): string {
    const length = Buffer.byteLength(value, 'utf8').toString().padStart(2, '0');
    return `${id}${length}${value}`;
  }

  private crc16CcittFalse(input: string): string {
    let crc = 0xffff;

    for (let i = 0; i < input.length; i++) {
      crc ^= input.charCodeAt(i) << 8;

      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}
