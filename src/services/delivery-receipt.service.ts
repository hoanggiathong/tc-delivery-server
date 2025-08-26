import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import htmlPdf from 'html-pdf-node';
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
    specialInstructions: string[];
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
    const currentDate = new Date();
    const dateStr = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear().toString().slice(-2)}`;

    // Calculate expiry date (current date + 7 days)
    const expiryDate = new Date(currentDate);
    expiryDate.setDate(currentDate.getDate() + 7);
    const expiryDateStr = `ngày ${expiryDate.getDate()} tháng ${expiryDate.getMonth() + 1} năm ${expiryDate.getFullYear()}`;

    return {
      receiptNumber: delivery.code,
      subCode: delivery.subCode,
      date: dateStr,
      expiryDate: expiryDateStr,
      barcode: delivery.fullCode,
      trackingCode: delivery.fullCode,
      fromRoute: delivery.fromRoute,
      toRoute: delivery.toRoute,
      sender: {
        name: delivery.sender.name,
        phone: delivery.sender.phone,
        address: delivery.fromRoute.address || '',
      },
      recipient: {
        name: delivery.receiver.name,
        phone: delivery.receiver.phone,
        address: delivery.homeDelivery || delivery.toRoute.name,
      },
      packageInfo: {
        description: delivery.name,
        quantity: delivery.quantity || 1,
        value: delivery.itemValue,
        homeDeliveryCost: delivery.homeDeliveryCost,
        isFragile: delivery.notes?.toLowerCase().includes('dễ vỡ') || false,
        specialInstructions: delivery.notes ? [delivery.notes] : [],
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

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2mm;
          padding-bottom: 1mm;
          font-size: 13px;
        }

        .header-left {
          flex: 1;
        }

        .header-center {
          flex: 1;
          text-align: center;
        }

        .header-right {
          flex: 1;
          text-align: right;
        }

        .receipt-number {
          font-size: 32px;
          font-weight: bold;
          margin: 2mm 0;
        }

        .company-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 1mm;
        }

        .barcode {
          margin: 2mm 0;
        }

        .barcode img {
          max-width: 100%;
          height: auto;
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
          width: 40px;
          height: 40px;
        }

        .divider {
          border-top: 2px dashed #000;
          margin: 3mm 0;
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
          <div class="header-left">
            <div>Người nhận: ${data.recipient.name}</div>
            ${data.payment.collectCost > 0 ? `<div>Thu hộ: <span class="amount">${data.payment.collectCost.toLocaleString('vi-VN')}</span> đồng</div>` : ''}
            <div>ĐT: ${data.recipient.phone}</div>
            <div>Địa chỉ: ${data.recipient.address}</div>
          </div>

          <div class="header-center">
            <div class="receipt-number">${data.receiptNumber.slice(-4)}</div>
            <div class="barcode">
              <img src="${barcodeDataURL}" alt="Barcode">
            </div>
          </div>

          <div class="header-right">
            <div>SL: ${data.packageInfo.quantity}</div>
            <div>GTN: <span class="amount">${data.packageInfo.homeDeliveryCost.toLocaleString('vi-VN')} đồng</span></div>
            <div>Nợ cước: <span class="amount">${data.payment.total.toLocaleString('vi-VN')} đồng</span></div>
            <div>${data.fromRoute.name}-${data.toRoute.name}</div>
            <div>Tr.G:<span class="amount">${data.packageInfo.value.toLocaleString('vi-VN')} đồng</span></div>
            <div class="qr-code">
              <h3>${data.subCode}</h3>
              <img src="${qrCodeSubDataURL}" alt="QR Code Sub Code">
            </div>
          </div>
        </div>

        <!-- Separator -->
        <div class="divider"></div>

        <!-- Company Info -->
        <div class="header">
          <div class="header-left">
            <div class="company-name">${data.company.name}</div>
          </div>
          <div class="header-center">
            <div style="font-size: 18px; font-weight: bold;">BIÊN NHẬN GỬI HÀNG</div>
            <div>(Liên 2: Giao cho khách hàng)</div>
          </div>
          <div class="header-right">
            <div class="qr-code">
              <h3>${data.receiptNumber}</h3>
              <img src="${qrCodeDataURL}" alt="QR Code">
            </div>
          </div>
        </div>

        <!-- Customer Information -->
        <div class="customer-section">
          <div class="sender">
            <div class="section-title">Người gửi: ${data.sender.name}</div>
            <div class="info-row">Điện thoại: ${data.sender.phone}</div>
            <div class="info-row">Địa chỉ: ${data.sender.address}</div>
          </div>

          <div class="recipient">
            <div class="section-title">Người nhận: ${data.recipient.name}</div>
            <div class="info-row">Điện thoại: ${data.recipient.phone}</div>
            <div class="info-row">Địa chỉ: ${data.recipient.address}</div>
          </div>
        </div>

        <!-- Package Information -->
        <div class="package-info">
          <div class="info-row">Tên hàng: ${data.packageInfo.description}</div>
          <div class="info-row">Số lượng: ${data.packageInfo.quantity}</div>
          <div class="info-row">Nợ cước: <span class="amount">${data.payment.total.toLocaleString('vi-VN')} đồng</span></div>
          <div class="info-row">Hàng có khai giá trị: <span class="amount">${data.packageInfo.value.toLocaleString('vi-VN')} đồng</span></div>
          <div class="info-row">Ghi chú: ${data.sender.address}</div>
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
        printBackground: true,
        displayHeaderFooter: false,
      };

      const file = { content: html };

      return new Promise<Buffer>((resolve, reject) => {
        htmlPdf.generatePdf(file, options, (err: any, buffer: Buffer) => {
          if (err) {
            reject(err);
          } else {
            console.log('PDF generated successfully, size:', buffer.length);
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
      const barcodeDataURL = await this.generateBarcode(delivery.fullCode);
      const qrCodeDataURL = await this.generateQRCode(delivery.fullCode);
      const qrCodeSubDataURL = await this.generateQRCode(delivery.subCode);

      return this.generateReceiptHTML(receiptData, barcodeDataURL, qrCodeDataURL, qrCodeSubDataURL);
    } catch (error) {
      throw new Error(`Failed to generate HTML receipt: ${error}`);
    }
  }
}
