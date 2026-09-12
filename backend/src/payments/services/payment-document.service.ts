import { Injectable } from '@nestjs/common';

export interface DocumentGenerationData {
  payment: any;
  student?: any;
  application?: any;
  college?: any;
  course?: any;
}

@Injectable()
export class PaymentDocumentService {
  private readonly companyDetails = {
    name: 'Swayam Admission Portal Pvt Ltd',
    tagline: 'Enterprise Admission & Career Management ERP',
    address:
      'Suite 504, Tech Park Towers, Bandra Kurla Complex, Mumbai, MH 400051',
    email: 'finance@swayamadmission.com',
    phone: '+91 1800-572-9800',
    gstin: '27AAACS9821R1ZX',
    website: 'https://swayamadmission.com',
  };

  generateReceiptHtml(data: DocumentGenerationData): string {
    const { payment, student, application, college, course } = data;
    const rcpNo =
      payment.receiptNumber || `RCP-${payment.id.slice(-8).toUpperCase()}`;
    const dateStr = payment.paidAt
      ? new Date(payment.paidAt).toLocaleDateString('en-IN')
      : new Date(payment.createdAt).toLocaleDateString('en-IN');
    const studentName =
      student?.fullName || payment.user?.fullName || 'Valued Student';
    const studentEmail = student?.email || payment.user?.email || 'N/A';
    const studentMobile = student?.mobile || payment.user?.mobile || 'N/A';
    const collegeName =
      college?.name ||
      application?.college?.name ||
      'Partner University / Institute';
    const courseName =
      course?.name || application?.course?.name || 'Selected Program';
    const verificationUrl = `${this.companyDetails.website}/verify/receipt/${rcpNo}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${rcpNo}</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1E293B; background: #F8FAFC; }
    .container { max-width: 800px; margin: auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 800; color: #0F172A; }
    .brand span { color: #4A7B5B; }
    .subtitle { font-size: 12px; color: #64748B; margin-top: 4px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 20px; margin: 0; color: #4A7B5B; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title p { font-size: 13px; color: #64748B; margin: 4px 0 0 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .box { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 8px; padding: 16px; font-size: 13px; }
    .box-title { font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    .table th { background: #F1F5F9; text-align: left; padding: 12px; font-weight: 600; color: #334155; border-bottom: 2px solid #E2E8F0; }
    .table td { padding: 12px; border-bottom: 1px solid #E2E8F0; color: #334155; }
    .text-right { text-align: right; }
    .total-box { margin-left: auto; width: 300px; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { border-top: 2px solid #0F172A; font-weight: 800; font-size: 16px; color: #0F172A; padding-top: 10px; margin-top: 6px; }
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; pt: 20px; margin-top: 40px; font-size: 11px; color: #94A3B8; }
    .verified-badge { display: inline-block; padding: 4px 10px; background: #DCFCE7; color: #166534; font-weight: 700; border-radius: 9999px; font-size: 11px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">SWAYAM <span>ADMISSION</span></div>
        <div class="subtitle">${this.companyDetails.tagline} • GSTIN: ${this.companyDetails.gstin}</div>
        <div class="subtitle">${this.companyDetails.address}</div>
      </div>
      <div class="doc-title">
        <h1>Official Receipt</h1>
        <p>Receipt No: <strong>${rcpNo}</strong></p>
        <p>Date: ${dateStr}</p>
        <div class="verified-badge">✓ PAYMENT VERIFIED</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Student Details</div>
        <div><strong>${studentName}</strong></div>
        <div>Email: ${studentEmail}</div>
        <div>Mobile: ${studentMobile}</div>
        <div>App ID: ${application?.applicationId || payment.applicationId || 'N/A'}</div>
      </div>
      <div class="box">
        <div class="box-title">Payment & Gateway Details</div>
        <div>Transaction ID: <strong>${payment.transactionId || payment.id}</strong></div>
        <div>Order ID: ${payment.orderId || 'N/A'}</div>
        <div>Method: ${payment.paymentMethod || 'Online'}</div>
        <div>Gateway: ${payment.gateway || 'Manual/Portal'}</div>
      </div>
    </div>

    <div class="box" style="margin-bottom: 20px;">
      <div class="box-title">College & Program Information</div>
      <div><strong>${collegeName}</strong></div>
      <div>Course: ${courseName}</div>
      <div>Fee Type: ${payment.paymentType}</div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Gross ${payment.paymentType} Fee</td>
          <td class="text-right">₹${(payment.amount || 0).toLocaleString('en-IN')}</td>
        </tr>
        ${payment.scholarshipAmount ? `<tr><td>Scholarship Benefit (-)</td><td class="text-right">-₹${payment.scholarshipAmount.toLocaleString('en-IN')}</td></tr>` : ''}
        ${payment.discountAmount ? `<tr><td>Concession / Discount (-)</td><td class="text-right">-₹${payment.discountAmount.toLocaleString('en-IN')}</td></tr>` : ''}
        ${payment.gstAmount ? `<tr><td>GST (18%)</td><td class="text-right">+₹${payment.gstAmount.toLocaleString('en-IN')}</td></tr>` : ''}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row"><span>Total Payable:</span> <span>₹${(payment.amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Amount Received:</span> <span style="color:#166534;font-weight:700;">₹${(payment.paidAmount || payment.amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Pending Due:</span> <span>₹${(payment.pendingAmount || 0).toLocaleString('en-IN')}</span></div>
      <div class="total-row grand-total"><span>Net Paid:</span> <span>₹${(payment.paidAmount || payment.amount || 0).toLocaleString('en-IN')}</span></div>
    </div>

    <div class="footer">
      <div>
        <img src="${qrApiUrl}" alt="QR Code" width="90" height="90" style="border: 1px solid #E2E8F0; padding: 4px; border-radius: 6px;" />
        <div style="margin-top:4px;">Scan to verify receipt online</div>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; font-weight: 600; color: #334155;">Computer Generated Electronic Receipt</p>
        <p style="margin: 4px 0 0 0;">Authorized Signature Not Required</p>
        <p style="margin: 4px 0 0 0;">Helpdesk: ${this.companyDetails.phone} | ${this.companyDetails.email}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  generateInvoiceHtml(data: DocumentGenerationData): string {
    const { payment, student, application, college, course } = data;
    const invNo =
      payment.invoiceNumber || `INV-${payment.id.slice(-8).toUpperCase()}`;
    const dateStr = new Date(payment.createdAt).toLocaleDateString('en-IN');
    const dueDateStr = payment.dueDate
      ? new Date(payment.dueDate).toLocaleDateString('en-IN')
      : dateStr;
    const studentName =
      student?.fullName || payment.user?.fullName || 'Valued Student';
    const studentEmail = student?.email || payment.user?.email || 'N/A';
    const studentMobile = student?.mobile || payment.user?.mobile || 'N/A';
    const collegeName =
      college?.name ||
      application?.college?.name ||
      'Partner University / Institute';
    const courseName =
      course?.name || application?.course?.name || 'Selected Program';
    const verificationUrl = `${this.companyDetails.website}/verify/invoice/${invNo}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`;

    const grossAmount = payment.amount || 0;
    const discount =
      (payment.discountAmount || 0) + (payment.scholarshipAmount || 0);
    const taxableValue = Math.max(0, grossAmount - discount);
    const gstAmount = payment.gstAmount || Math.round(taxableValue * 0.18);
    const cgst = Math.round(gstAmount / 2);
    const sgst = Math.round(gstAmount / 2);
    const totalInvoiceAmount = taxableValue + gstAmount;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invNo}</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1E293B; background: #F8FAFC; }
    .container { max-width: 800px; margin: auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 800; color: #0F172A; }
    .brand span { color: #2563EB; }
    .subtitle { font-size: 12px; color: #64748B; margin-top: 4px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 22px; margin: 0; color: #1E3A8A; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title p { font-size: 13px; color: #64748B; margin: 4px 0 0 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .box { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 8px; padding: 16px; font-size: 13px; }
    .box-title { font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    .table th { background: #F1F5F9; text-align: left; padding: 12px; font-weight: 600; color: #334155; border-bottom: 2px solid #E2E8F0; }
    .table td { padding: 12px; border-bottom: 1px solid #E2E8F0; color: #334155; }
    .text-right { text-align: right; }
    .total-box { margin-left: auto; width: 320px; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { border-top: 2px solid #0F172A; font-weight: 800; font-size: 16px; color: #0F172A; padding-top: 10px; margin-top: 6px; }
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 40px; font-size: 11px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">SWAYAM <span>ENTERPRISE ERP</span></div>
        <div class="subtitle">${this.companyDetails.name}</div>
        <div class="subtitle">GSTIN: ${this.companyDetails.gstin} • ${this.companyDetails.address}</div>
      </div>
      <div class="doc-title">
        <h1>TAX INVOICE</h1>
        <p>Invoice No: <strong>${invNo}</strong></p>
        <p>Invoice Date: ${dateStr}</p>
        <p>Due Date: ${dueDateStr}</p>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Billed To (Student)</div>
        <div><strong>${studentName}</strong></div>
        <div>Email: ${studentEmail}</div>
        <div>Mobile: ${studentMobile}</div>
        <div>App ID: ${application?.applicationId || payment.applicationId || 'N/A'}</div>
      </div>
      <div class="box">
        <div class="box-title">Institution & Course Details</div>
        <div>College: <strong>${collegeName}</strong></div>
        <div>Program: ${courseName}</div>
        <div>Type: ${payment.paymentType}</div>
        <div>Status: <span style="font-weight:700;color:${payment.status === 'COMPLETED' || payment.status === 'SUCCESS' ? '#166534' : '#D97706'}">${payment.status}</span></div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>SAC Code</th>
          <th>Item Description</th>
          <th class="text-right">Gross Amount</th>
          <th class="text-right">Discount/Scholarship</th>
          <th class="text-right">Taxable Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>999293</td>
          <td>Higher Education Fee (${payment.paymentType}) - ${courseName}</td>
          <td class="text-right">₹${grossAmount.toLocaleString('en-IN')}</td>
          <td class="text-right">₹${discount.toLocaleString('en-IN')}</td>
          <td class="text-right">₹${taxableValue.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row"><span>Taxable Amount:</span> <span>₹${taxableValue.toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>CGST (9%):</span> <span>₹${cgst.toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>SGST (9%):</span> <span>₹${sgst.toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Total GST (18%):</span> <span>₹${gstAmount.toLocaleString('en-IN')}</span></div>
      <div class="total-row grand-total"><span>Grand Total:</span> <span>₹${totalInvoiceAmount.toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Paid Amount:</span> <span style="font-weight:700;color:#166534;">₹${(payment.paidAmount || grossAmount).toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Balance Due:</span> <span>₹${(payment.pendingAmount || 0).toLocaleString('en-IN')}</span></div>
    </div>

    <div class="footer">
      <div>
        <img src="${qrApiUrl}" alt="QR Code" width="90" height="90" style="border: 1px solid #E2E8F0; padding: 4px; border-radius: 6px;" />
        <div style="margin-top:4px;">Scan to verify tax invoice online</div>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; font-weight: 600; color: #334155;">This is an authentic computer generated Tax Invoice.</p>
        <p style="margin: 4px 0 0 0;">Subject to Mumbai Jurisdiction</p>
        <p style="margin: 4px 0 0 0;">Support: ${this.companyDetails.email}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }
}
