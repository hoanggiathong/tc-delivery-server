import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import htmlPdf from 'html-pdf-node';
import fs from 'fs';
import path from 'path';
import { IDelivery } from '@/models/delivery.model';
import { ICustomer } from '@/models/customer.model';
import { IRoute } from '@/models/route.model';

export interface DeliveryReceiptData {
  // Basic info
  receiptNumber: string;
  subCode: string;
  date: string;
  expiryDate: string;
  barcode: string;
  trackingCode: string;
  fromRoute: IRoute;
  toRoute: IRoute;
  fullCode: string;
  // Sender info
  sender: {
    name: string;
    phone: string;
    address: string;
  };

  // Recipient info
  recipient: {
    name: string;
    phone: string;
    address: string;
  };

  // Package info
  packageInfo: {
    description: string;
    quantity: number;
    value: number;
    isFragile: boolean;
    homeDeliveryCost: number;
    notes: string;
  };

  // Payment info
  payment: {
    shippingFee: number;
    total: number;
    totalCost: number;
    collectCost: number;
    paymentType: 'paid' | 'debt' | 'free';
  };

  // Company info
  company: {
    name: string;
    logo?: string;
    stamp?: string;
  };
}

export interface PopulatedDelivery
  extends Omit<IDelivery, 'sender' | 'receiver' | 'fromRoute' | 'toRoute'> {
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
}

export class DeliveryReceiptService {
  private static readonly COMPANY_NAME = 'TÔ CHÂU Group';

  /**
   * Load company logo SVG
   */
  private loadCompanyLogo(): string {
    try {
      const logoPath = path.join(__dirname, '../assets/images/gia-phuoc-express-logo-name.svg');
      const logoSvg = fs.readFileSync(logoPath, 'utf-8');
      return logoSvg;
    } catch (error) {
      console.warn('Logo file not found, using company name instead');
      return '';
    }
  }

  /**
   * Load checkbox checked SVG
   */
  private loadCheckboxSvg(): string {
    try {
      const checkboxPath = path.join(__dirname, '../assets/images/checkbox-checked.svg');
      const checkboxSvg = fs.readFileSync(checkboxPath, 'utf-8');
      return checkboxSvg;
    } catch (error) {
      console.warn('Checkbox SVG not found, using CSS fallback');
      return '';
    }
  }

  /**
   * Format phone number to xxxx.xxx.xxx format and convert +84 to 0
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all spaces and special characters except +
    let cleanPhone = phone.replace(/[^\d+]/g, '');

    // Convert +84 to 0
    if (cleanPhone.startsWith('+84')) {
      cleanPhone = '0' + cleanPhone.substring(3);
    }

    // Format to xxxx.xxx.xxx
    if (cleanPhone.length === 10) {
      return `${cleanPhone.substring(0, 4)}.${cleanPhone.substring(4, 7)}.${cleanPhone.substring(7)}`;
    }

    // If not standard length, return as is
    return cleanPhone;
  }

  /**
   * Generate barcode as base64 data URL
   */
  private async generateBarcode(text: string): Promise<string> {
    try {
      const canvas = createCanvas(200, 50);
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: false,
      });
      return canvas.toDataURL();
    } catch (error) {
      // Return empty data URL if barcode generation fails
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
  }

  /**
   * Generate QR code as base64 data URL
   */
  private async generateQRCode(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: 100,
        margin: 1,
      });
    } catch (error) {
      // Return empty data URL if QR code generation fails
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
  }

  /**
   * Transform delivery data for receipt
   */
  private transformDeliveryData(delivery: PopulatedDelivery): DeliveryReceiptData {
    const currentDate = delivery.updatedAt;
    const displayDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear().toString().slice(-2)}`;

    // Calculate expiry date (current date + 7 days)
    const expiryDate = new Date(currentDate);
    expiryDate.setDate(currentDate.getDate() + 7);
    const expiryDateStr = `ngày ${expiryDate.getDate()} tháng ${expiryDate.getMonth() + 1} năm ${expiryDate.getFullYear()}`;

    return {
      receiptNumber: delivery.code,
      subCode: delivery.subCode,
      fullCode: delivery.fullCode,
      date: displayDate,
      expiryDate: expiryDateStr,
      barcode: delivery.fullCode,
      trackingCode: delivery.fullCode,
      fromRoute: delivery.fromRoute,
      toRoute: delivery.toRoute,
      sender: {
        name: delivery.sender.name,
        phone: this.formatPhoneNumber(delivery.sender.phone),
        address: delivery.fromRoute.address || '',
      },
      recipient: {
        name: delivery.receiver.name,
        phone: this.formatPhoneNumber(delivery.receiver.phone),
        address: delivery.homeDelivery || delivery.toRoute.name,
      },
      packageInfo: {
        description: delivery.name,
        quantity: delivery.quantity || 1,
        value: delivery.itemValue,
        homeDeliveryCost: delivery.homeDeliveryCost,
        isFragile: delivery.notes?.toLowerCase().includes('dễ vỡ') || false,
        notes: delivery.notes || '',
      },
      payment: {
        shippingFee: delivery.cost + delivery.itemCost,
        total: delivery.totalCost,
        totalCost: delivery.totalCost,
        collectCost: delivery.collectCost,
        paymentType: delivery.paymentType,
      },
      company: {
        name: DeliveryReceiptService.COMPANY_NAME,
      },
    };
  }

  /**
   * Generate HTML template for receipt
   */
  private generateReceiptHTML(
    data: DeliveryReceiptData,
    barcodeDataURL: string,
    qrCodeDataURL: string,
    qrCodeSubDataURL: string
  ): string {
    const companyLogoSvg = this.loadCompanyLogo();
    const checkboxSvg = this.loadCheckboxSvg();
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Biên nhận gởi hàng</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          font-size: 9px;
          line-height: 1.1;
          color: #000;
          background: white;
        }

        .receipt {
          width: 210mm;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 3mm;
        }

        .text-bold {
          font-weight: bold;
        }

        .text-2xl {
          font-size: 2rem;
          font-weight: bold;
        }

        .text-3xl {
          font-size: 3rem;
          font-weight: bold;
        }

        .text-5xl {
          font-size: 5rem;
          font-weight: bold;
        }

        .text-6xl {
          font-size: 6rem;
          font-weight: bold;
        }

        .flex-row {
          display: flex;
          flex-direction: row;
        }

        .flex-col {
          display: flex;
          flex-direction: column;
        }

        .center {
          justify-content: center;
          align-items: center;
        }

        .space-between {
          justify-content: space-between;
        }

        .flex-1 {
          flex: 1;
        }

        .flex-2 {
          flex: 2;
        }

        .flex-3 {
          flex: 3;
        }

        .mr-2 {
          margin-right: 2mm;
        }

        .mr-3 {
          margin-right: 3mm;
        }

        .ml-2 {
          margin-left: 2mm;
        }

        .ml-3 {
          margin-left: 3mm;
        }

        .gap-1 {
          gap: 1mm;
        }

        .gap-2 {
          gap: 2mm;
        }

        .mt-auto {
          margin-top: auto;
        }

        .mt-0 {
          margin-top: 0;
        }

        .mb-0 {
          margin-bottom: 0;
        }

        .checkbox {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 1px solid #000;
          margin-right: 5px;
          position: relative;
          vertical-align: middle;
        }

        .checkbox.checked::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 0px;
          width: 3px;
          height: 6px;
          border: solid #000;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .info-row svg {
          width: 12px;
          height: 12px;
          margin-right: 5px;
          vertical-align: middle;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          font-size: 1.1rem;
        }

        .receipt-number {
          font-size: 8rem;
          font-weight: bold;
        }

        .company-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 1mm;
        }

        .company-logo svg {
          max-height: 16mm;
          max-width: 40mm;
          height: auto;
          width: auto;
        }

        .barcode {
          margin: 0;
          padding: 0;
        }

        .barcode img {
          width: 40mm;
          height: 20mm;
        }

        .customer-section {
          display: flex;
          gap: 5mm;
          margin: 2mm 0;
          border: 1px solid #000;
          padding: 2mm;
          font-size: 13px;
        }

        .sender, .recipient {
          flex: 1;
          border: 1px dashed #000;
          padding: 1mm;
        }

        .section-title {
          font-weight: bold;
          margin-bottom: 1mm;
        }

        .package-info {
          margin: 2mm 0;
          border: 1px solid #000;
          padding: 2mm;
          font-size: 13px;
        }

        .payment-info {
          display: flex;
          justify-content: space-between;
          margin: 2mm 0;
          font-size: 13px;
        }

        .qr-code {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 3px;
          margin: 1mm 0;
        }

        .qr-code span {
          margin: 0;
          font-size: 10px;
          font-weight: bold;
        }

        .qr-code img {
          width: 50px;
          height: 50px;
        }

        .divider {
          border-top: 2px dashed #000;
          margin: 2mm 0;
          position: relative;
        }

        .divider::before {
          content: "--- CẮT THEO ĐƯỜNG NÀY ---";
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 0 5mm;
          font-size: 10px;
          font-weight: bold;
        }

        .divider::after {
          content: "CUT";
          position: absolute;
          top: -10px;
          right: 0;
          background: white;
          padding: 0 2mm;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid #000;
        }

        .package-label {
          border: 1px solid #000;
          padding: 5mm;
          margin-top: 5mm;
        }

        .label-header {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 3mm;
        }

        .recipient-info {
          font-size: 12px;
          margin: 3mm 0;
        }

        .special-instructions {
          margin: 3mm 0;
          padding: 2mm;
          border: 1px dashed #000;
          background: #f9f9f9;
        }

        .stamp-area {
          text-align: right;
          margin: 2mm 0;
          border: 1px solid #000;
          padding: 2mm;
          height: 25mm;
          font-size: 11px;
        }

        @media print {
          .receipt {
            margin: 0;
            padding: 0;
          }
        }

        .info-row {
          margin: 1mm 0;
        }

        .amount {
          font-weight: bold;
          color: #d32f2f;
        }

        .notification {
          margin: 2mm 0;
          padding: 2mm;
          border: 1px solid #000;
          background: #f8f8f8;
          font-size: 11px;
          line-height: 1.2;
        }

        .notification strong {
          font-size: 12px;
          color: #d32f2f;
        }

        .notification ul {
          margin: 1mm 0 0 3mm;
          padding: 0;
        }

        .notification li {
          margin: 0.5mm 0;
          text-align: justify;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header Section -->
        <div class="header">
          <div class="header-left flex-col flex-1 gap-2">
            <div>Người nhận:</div>
            <div class="text-bold">${data.recipient.name}</div>
            ${data.payment.collectCost > 0 ? `<div>Thu hộ: <span class="amount">${data.payment.collectCost.toLocaleString('vi-VN')}</span> đồng</div>` : ''}
            <div>ĐT: <span class="text-bold">${data.recipient.phone}</span></div>
            <div><span class="text-bold">${data.recipient.address}</span></div>
          </div>

          <div class="flex-col flex-2 center" style="gap: 0;">
            <div class="barcode flex-row center" style="margin: 0; padding: 0;">
              <span class="text-2xl mr-2">${data.date}</span>
              <img src="${barcodeDataURL}" alt="Barcode">
              <span class="text-2xl">SL: ${data.packageInfo.quantity}</span>
            </div>
            <div class="receipt-number" style="height:8rem; margin: -0.5rem; margin-top: -1.5rem;">${data.receiptNumber.slice(-4)}</div>
          </div>

          <div class="header-right flex-col flex-1 gap-2">
            <div class="flex-col flex-1 gap-2">
              ${data.packageInfo.homeDeliveryCost > 0 ? `<div><span class="text-bold">GTN:</span> <span class="amount">${data.packageInfo.homeDeliveryCost.toLocaleString('vi-VN')} đồng</span></div>` : ''}
              ${data.payment.total > 0 ? `<div><span class="text-bold">Nợ cước:</span> <span class="amount">${data.payment.total.toLocaleString('vi-VN')} đồng</span></div>` : ''}
            </div>
            <div class="flex-col flex-1 gap-2">
              <div class="text-bold">${data.fromRoute.name} - ${data.toRoute.name}</div>
              ${data.packageInfo.value > 0 ? `<div><span class="text-bold">Tr.G:</span> <span class="amount">${data.packageInfo.value.toLocaleString('vi-VN')} đồng</span></div>` : ''}
            </div>
            <div class="flex-row mt-auto" style="align-items: end;">
              <div class="qr-code">
                <h3>${data.subCode}</h3>
                <img src="${qrCodeSubDataURL}" alt="QR Code Sub Code">
              </div>
            </div>
          </div>
        </div>

        <!-- Separator -->
        <div class="divider"></div>

        <!-- Company Info -->
        <div class="header">
          <div class="header-left">
            ${companyLogoSvg ? `<div class="company-logo">${companyLogoSvg}</div>` : `<div class="company-name">${data.company.name}</div>`}
          </div>
          <div class="header-center flex-col flex-2 center">
            <div style="font-size: 18px; font-weight: bold;">BIÊN NHẬN GỬI HÀNG</div>
            <div>(Liên 2: Giao cho khách hàng)</div>
          </div>
          <div class="header-right">
            <div class="qr-code">
              <h3>${data.fullCode}</h3>
              <img src="${qrCodeDataURL}" alt="QR Code">
            </div>
          </div>
        </div>

        <!-- Customer Information -->
        <div class="customer-section">
          <div class="sender">
            <div>Người gửi: <span class="text-bold">${data.sender.name}</span></div>
            <div class="info-row">Điện thoại: <span class="text-bold">${data.sender.phone}</span></div>
            <div class="info-row">Địa chỉ: <span class="text-bold">${data.sender.address}</span></div>
          </div>

          <div class="recipient">
            <div>Người nhận: <span class="text-bold">${data.recipient.name}</span></div>
            <div class="info-row">Điện thoại: <span class="text-bold">${data.recipient.phone}</span></div>
            <div class="info-row">Địa chỉ: <span class="text-bold">${data.recipient.address}</span></div>
          </div>
        </div>

        <!-- Package Information -->
        <div class="package-info">
          <div class="info-row">Tên hàng: <span class="text-bold">${data.packageInfo.description}</span></div>
          <div class="info-row">Số lượng: <span class="text-bold">${data.packageInfo.quantity}</span></div>
          ${data.payment.total > 0 ? `<div class="info-row">Nợ cước: <span class="amount">${data.payment.total.toLocaleString('vi-VN')} đồng</span></div>` : ''}
          <div class="info-row">
          ${checkboxSvg ? checkboxSvg : '<span class="checkbox checked"></span>'}
          ${
            data.packageInfo.value > 0
              ? `Hàng kê khai giá trị: <span class="amount">
          ${data.packageInfo.value.toLocaleString('vi-VN')} đồng</span> <span class="text-bold ml-3">(Mang đúng CMND)</span>`
              : 'Hàng không kê khai giá trị'
          }</div>
          ${data.packageInfo.notes ? `<div class="info-row">Ghi chú: <span class="text-bold">${data.packageInfo.notes}</span></div>` : ''}
        </div>

        <!-- Payment Information -->
        <div class="payment-info">
          <div>Chữ ký: STK nhận tiền thu hộ: VIETCOMBANK, ${data.sender.name}</div>
          <div>${new Date().toLocaleTimeString('vi-VN')} ngày ${data.date}</div>
        </div>

        <!-- Signature Section -->
        <div style="display: flex; justify-content: space-between; gap: 20mm;">
          <div class="stamp-area" style="flex: 1;">
            <div>Người gửi</div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="stamp-area" style="flex: 1;">
            <div>Nhân viên nhận hàng</div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
        <!-- Notification for customer -->
        <div class="notification">
          <div>
            <strong>Lưu ý:</strong>
            <ul>
              <li>Kiểm tra kỹ thông tin, địa chỉ GTN trên biên nhận, khách không kiểm tra khi sai thông tin sẽ không được khiểu nại.</li>
              <li>Hàng nhập lậu hoặc không hóa đơn chứng từ cơ quan chức năng kiêm tra khách tự chịu trách nhiệm.</li>
              <li>Khách tư đóng gói, bảo quản kỹ trước khi gửi. Hàng hóa trong quá trinh vận chuyển bị hư, môp, méo, xi, sốc, bê, đặp, gãy, ướt, rớt, rách, chuột cắn, động vật chết thông cảm không đền.</li>
              <li style="font-weight: bold;">Công ty chí giải quyết khiếu nại với người trực tiếp gửi hàng ghi trên Biên nhận này.</li>
              <li>Hàng vận chuyên qua ngày sẽ co, thông cảm nếu châm 2 - 3 ngày, trường hợp quá 3 ngày vui lòng liên hệ với sđt 0909090909</li>
              <li>Trường hợp thất lạc hàng hoá có kê khai trị giá (trong 7 ngày kể từ ngày gửi) công ty sẽ bồi thường đúng với giá trị kê khai là ${data.packageInfo.value.toLocaleString('vi-VN')} đồng (không có phí GTN)</li>
              <li>Khi nhận hàng, tiền vui lòng đem CCCD, GPL xe hoặc hộ chiếu. Biên nhận này có giá trị đến ${data.expiryDate}</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate PDF receipt for a delivery
   */
  public async generateReceiptPDF(delivery: PopulatedDelivery): Promise<Buffer> {
    try {
      // Transform delivery data
      const receiptData = this.transformDeliveryData(delivery);

      // Generate barcode and QR code with fallbacks
      const barcodeDataURL = await this.generateBarcode(delivery.fullCode);
      const qrCodeDataURL = await this.generateQRCode(delivery.fullCode);
      const qrCodeSubDataURL = await this.generateQRCode(delivery.subCode);

      // Validate that we have valid data URLs
      if (!barcodeDataURL.startsWith('data:image/') || !qrCodeDataURL.startsWith('data:image/')) {
        console.warn('Invalid barcode or QR code data URL, using fallbacks');
      }

      // Generate HTML
      const html = this.generateReceiptHTML(
        receiptData,
        barcodeDataURL,
        qrCodeDataURL,
        qrCodeSubDataURL
      );

      // Basic HTML validation
      if (!html.includes('</html>') || !html.includes('<body>')) {
        throw new Error('Generated HTML appears to be malformed');
      }

      // Generate PDF from HTML
      const options = {
        format: 'A4',
        width: '210mm',
        height: '297mm',
        border: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        printBackground: false,
        displayHeaderFooter: false,
        headless: true,
        dumpio: false,
      };

      const file = { content: html };

      // Add dumpio: false to explicitly prevent stdout/stderr piping from Puppeteer
      const optionsWithDumpio = {
        ...options,
        dumpio: false,
        pipe: false,
        // Add environment variables to suppress Chrome output
        env: {
          ...process.env,
          PUPPETEER_DISABLE_HEADLESS_WARNING: 'true',
          CHROME_LOG_FILE: '/dev/null',
        },
      };

      return new Promise<Buffer>((resolve, reject) => {
        htmlPdf.generatePdf(file, optionsWithDumpio, (err: any, buffer: Buffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(buffer);
          }
        });
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF receipt: ${error}`);
    }
  }

  /**
   * Generate preview HTML for testing
   */
  public async generateReceiptHTMLPreview(delivery: PopulatedDelivery): Promise<string> {
    try {
      const receiptData = this.transformDeliveryData(delivery);
      const barcodeDataURL = await this.generateBarcode(delivery.subCode);
      const qrCodeDataURL = await this.generateQRCode(delivery.fullCode);
      const qrCodeSubDataURL = await this.generateQRCode(delivery.subCode);

      return this.generateReceiptHTML(receiptData, barcodeDataURL, qrCodeDataURL, qrCodeSubDataURL);
    } catch (error) {
      throw new Error(`Failed to generate HTML receipt: ${error}`);
    }
  }
}
