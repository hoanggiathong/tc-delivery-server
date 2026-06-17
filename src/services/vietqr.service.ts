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
    // Vietcombank
    vietcombank: '970436',
    vcb: '970436',

    // VietinBank
    vietinbank: '970415',
    ctg: '970415',

    // BIDV
    bidv: '970418',

    // Agribank
    agribank: '970405',

    // MB Bank
    mbbank: '970422',
    mb: '970422',

    // ACB
    acb: '970416',

    // Techcombank
    techcombank: '970407',
    tcb: '970407',

    // Sacombank
    sacombank: '970403',

    // VPBank
    vpbank: '970432',

    // TPBank
    tpbank: '970423',

    // HDBank
    hdbank: '970437',

    // SHB
    shb: '970443',

    // LPBank
    lpbank: '970449',
    lienvietpostbank: '970449',

    // VIB
    vib: '970441',

    // OCB
    ocb: '970448',

    // MSB
    msb: '970426',
    maritimebank: '970426',

    // SeABank
    seabank: '970440',

    // Eximbank
    eximbank: '970431',
    eib: '970431',

    // ABBank
    abbank: '970425',

    // Nam A Bank
    namabank: '970428',

    // VietABank
    vietabank: '970427',

    // VietBank
    vietbank: '970433',

    // BaoViet Bank
    baovietbank: '970438',
    bvbank: '970438',

    // Bac A Bank
    bacabank: '970409',

    // KienlongBank
    kienlongbank: '970452',

    // PGBank
    pgbank: '970430',

    // Saigonbank
    saigonbank: '970400',

    // NCB
    ncb: '970419',
    nationalcitizenbank: '970419',

    // OceanBank
    oceanbank: '970414',

    // CBBank
    cbbank: '970444',

    // GPBank
    gpbank: '970408',

    // DongA Bank
    dongabank: '970406',
    donga: '970406',
    vikki: '970406',

    // PVcomBank
    pvcombank: '970412',

    // VRB
    vrb: '970421',

    // Woori Bank
    wooribank: '970457',

    // UOB
    uob: '970458',

    // CIMB
    cimb: '422589',

    // HSBC VN
    hsbc: '458761',

    // Standard Chartered
    standardchartered: '970410',

    // Public Bank
    publicbank: '970439',

    // Hong Leong
    hongleongbank: '970442',
  };

  async generateQrBase64(payload: GenerateVietQrPayload): Promise<string> {
    try {
      const bankBin = this.normalizeBankBin(payload.bankName);
      const accountNumber = String(payload.bankAccount || '').replace(/\D/g, '');
      const amount = Math.max(0, Math.round(Number(payload.amount || 0)));
      const addInfo = String(payload.addInfo || '')
        .trim()
        .slice(0, 99);

      if (!bankBin) {
        throw new Error(
          `Ngân hàng chưa được hỗ trợ: ${payload.bankName || 'Không có tên ngân hàng'}`
        );
      }

      if (!accountNumber) {
        throw new Error('Thiếu số tài khoản.');
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

    if (/^\d{6}$/.test(raw)) {
      return raw;
    }

    const key = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    return this.bankBinMap[key] || '';
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
