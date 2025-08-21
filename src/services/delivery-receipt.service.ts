import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import { IDelivery } from '@/models/delivery.model';
import { ICustomer } from '@/models/customer.model';
import { IRoute } from '@/models/route.model';

export interface DeliveryReceiptData {
  // Basic info
  receiptNumber: string;
  date: string;
  barcode: string;
  trackingCode: string;

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
    totalCost: number;
    isFragile: boolean;
    specialInstructions: string[];
  };

  // Payment info
  payment: {
    cashOnDelivery: number;
    shippingFee: number;
    total: number;
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

    return {
      receiptNumber: delivery.code,
      date: dateStr,
      barcode: delivery.code,
      trackingCode: delivery.code,
      sender: {
        name: delivery.sender.name,
        phone: delivery.sender.phone,
        address: delivery.fromRoute.name, // Using route name as address for now
      },
      recipient: {
        name: delivery.receiver.name,
        phone: delivery.receiver.phone,
        address: delivery.homeDelivery || delivery.toRoute.name,
      },
      packageInfo: {
        description: delivery.name,
        quantity: 1,
        value: delivery.itemValue,
        totalCost: delivery.totalCost,
        isFragile: delivery.notes?.toLowerCase().includes('dễ vỡ') || false,
        specialInstructions: delivery.notes ? [delivery.notes] : [],
      },
      payment: {
        cashOnDelivery: delivery.collectCost,
        shippingFee: delivery.cost + delivery.itemCost,
        total: delivery.totalCost,
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
    qrCodeDataURL: string
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
          font-size: 11px;
          line-height: 1.2;
          color: #000;
          background: white;
        }
        
        .receipt {
          width: 210mm;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 5mm;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 3mm;
          border-bottom: 1px solid #000;
          padding-bottom: 3mm;
        }
        
        .header-left {
          flex: 1;
        }
        
        .header-center {
          flex: 2;
          text-align: center;
        }
        
        .header-right {
          flex: 1;
          text-align: right;
        }
        
        .receipt-number {
          font-size: 48px;
          font-weight: bold;
          margin: 5mm 0;
        }
        
        .company-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        
        .barcode {
          margin: 5mm 0;
        }
        
        .barcode img {
          max-width: 100%;
          height: auto;
        }
        
        .customer-section {
          display: flex;
          gap: 10mm;
          margin: 5mm 0;
          border: 1px solid #000;
          padding: 3mm;
        }
        
        .sender, .recipient {
          flex: 1;
          border: 1px dashed #000;
          padding: 2mm;
        }
        
        .section-title {
          font-weight: bold;
          margin-bottom: 2mm;
        }
        
        .package-info {
          margin: 3mm 0;
          border: 1px solid #000;
          padding: 3mm;
        }
        
        .payment-info {
          display: flex;
          justify-content: space-between;
          margin: 3mm 0;
        }
        
        .qr-code {
          text-align: right;
          margin: 3mm 0;
        }
        
        .qr-code img {
          width: 60px;
          height: 60px;
        }
        
        .divider {
          border-top: 2px dashed #000;
          margin: 10mm 0;
          position: relative;
        }
        
        .divider::before {
          content: "✂️ CẮT THEO ĐƯỜNG NÀY";
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 0 5mm;
          font-size: 10px;
          font-weight: bold;
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
          margin: 5mm 0;
          border: 1px solid #000;
          padding: 3mm;
          height: 40mm;
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
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header Section -->
        <div class="header">
          <div class="header-left">
            <div>Người nhận: ${data.date}</div>
            <div>ĐT: ${data.sender.phone}</div>
            <div>${data.sender.address}</div>
          </div>
          
          <div class="header-center">
            <div class="receipt-number">${data.receiptNumber}</div>
            <div class="barcode">
              <img src="${barcodeDataURL}" alt="Barcode">
            </div>
          </div>
          
          <div class="header-right">
            <div>SL: 1</div>
            <div>(GTN) Nợ cước</div>
            <div>(${data.payment.total.toLocaleString('vi-VN')})</div>
            <div>SĐ-TP.HCM</div>
            <div>Tr.G:${data.payment.total.toLocaleString('vi-VN')}</div>
            <div class="qr-code">
              <img src="${qrCodeDataURL}" alt="QR Code">
            </div>
          </div>
        </div>

        <!-- Company Info -->
        <div class="company-name">${data.company.name}</div>
        <div>BIÊN NHẬN GỬI HÀNG</div>
        <div>(Liên 2: Giao cho khách hàng)</div>

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
          <div class="info-row">Hàng có khai giá trị: <span class="amount">${data.packageInfo.value.toLocaleString('vi-VN')}</span></div>
          <div class="info-row">Ghi chú: ${data.sender.address}</div>
        </div>

        <!-- Payment Information -->
        <div class="payment-info">
          <div>Chữ ký: STK nhận tiền thu hộ: VIETCOMBANK, ${data.sender.name}</div>
          <div>${new Date().toLocaleTimeString('vi-VN')} ngày ${data.date}</div>
        </div>

        <!-- Separator -->
        <div class="divider"></div>

        <!-- Package Label Section -->
        <div class="package-label">
          <div class="label-header">NHÃN KIỆN HÀNG</div>
          
          <div class="recipient-info">
            <div><strong>Người nhận: ${data.recipient.name}</strong></div>
            <div>Điện thoại: ${data.recipient.phone}</div>
            <div>Địa chỉ: ${data.recipient.address}</div>
          </div>

          <div class="info-row">Tên hàng: ${data.packageInfo.description}</div>
          ${data.payment.cashOnDelivery > 0 ? `<div class="info-row">Thu hộ: <span class="amount">${data.payment.cashOnDelivery.toLocaleString('vi-VN')} đồng</span></div>` : ''}

          ${
            data.packageInfo.isFragile || data.packageInfo.specialInstructions.length > 0
              ? `
          <div class="special-instructions">
            <strong>Lưu ý đặc biệt:</strong>
            ${data.packageInfo.isFragile ? '<div>❌ HÀNG DỄ VỠ - KHÔNG ĐỂ NGƯỢC</div>' : ''}
            ${data.packageInfo.specialInstructions.map(instruction => `<div>${instruction}</div>`).join('')}
          </div>
          `
              : ''
          }

          <div class="stamp-area">
            <div>Xác nhận giao hàng</div>
            <div>(Ký, ghi rõ họ tên)</div>
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
    let browser: any = null;

    try {
      console.log('Starting PDF generation for delivery:', delivery.code);
      
      // Transform delivery data
      const receiptData = this.transformDeliveryData(delivery);
      console.log('Receipt data transformed successfully');

      // Generate barcode and QR code
      const barcodeDataURL = await this.generateBarcode(delivery.code);
      const qrCodeDataURL = await this.generateQRCode(delivery.code);
      console.log('Barcode and QR code generated successfully');

      // Generate HTML
      const html = this.generateReceiptHTML(receiptData, barcodeDataURL, qrCodeDataURL);
      console.log('HTML template generated, length:', html.length);

      // Launch puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      console.log('Puppeteer browser launched');

      const page = await browser.newPage();

      // Set content and generate PDF
      await page.setContent(html, { waitUntil: 'networkidle0' });
      console.log('HTML content set in browser');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });
      console.log('PDF generated successfully, size:', pdfBuffer.length);

      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF receipt: ${error}`);
    } finally {
      if (browser) {
        await browser.close();
        console.log('Browser closed');
      }
    }
  }

  /**
   * Generate preview HTML for testing
   */
  public async generateReceiptHTMLPreview(delivery: PopulatedDelivery): Promise<string> {
    try {
      const receiptData = this.transformDeliveryData(delivery);
      const barcodeDataURL = await this.generateBarcode(delivery.code);
      const qrCodeDataURL = await this.generateQRCode(delivery.code);

      return this.generateReceiptHTML(receiptData, barcodeDataURL, qrCodeDataURL);
    } catch (error) {
      throw new Error(`Failed to generate HTML receipt: ${error}`);
    }
  }
}
