// src/app/api/mushahidgenerategstpdf/route.ts
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mushahidgst';

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/**
 * Convert various QR shapes into a src usable by <img src="...">
 * Supports:
 * - data:image/... (returns as-is)
 * - base64 string (no prefix) -> assume PNG
 * - http(s) url (returns as-is)
 * - local file path -> read and convert to base64
 * - Buffer / Mongo Binary -> convert to data URI
 * - Array<number> -> convert to data URI
 */
function getQrDataUri(qrAny: any): string | null {
  try {
    if (!qrAny) return null;

    // If passed an object with qrCode or qr fields, pick that
    const qr =
      typeof qrAny === 'object' && (qrAny.qrCode || qrAny.qr)
        ? (qrAny.qrCode ?? qrAny.qr)
        : qrAny;

    if (!qr) return null;

    // Already a data URI
    if (typeof qr === 'string' && qr.startsWith('data:')) return qr;

    // HTTP(S) URL
    if (typeof qr === 'string' && (qr.startsWith('http://') || qr.startsWith('https://'))) {
      return qr;
    }

    // Local file path (absolute or relative) - useful for local testing
    if (
      typeof qr === 'string' &&
      (qr.startsWith('/') || qr.includes('./') || qr.includes('../') || qr.includes('/mnt/'))
    ) {
      try {
        const filePath = path.isAbsolute(qr) ? qr : path.resolve(process.cwd(), qr);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          // Guess mime type from extension (basic)
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          return `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (e) {
        // fall through
      }
    }

    // Plain base64 string (no prefix) -> assume PNG
    if (typeof qr === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(qr) && qr.length > 100) {
      return `data:image/png;base64,${qr.replace(/\s+/g, '')}`;
    }

    // MongoDB Binary-like (has .buffer)
    if (qr && typeof qr === 'object' && qr.buffer) {
      const b = Buffer.isBuffer(qr.buffer) ? qr.buffer : Buffer.from(qr.buffer);
      return `data:image/png;base64,${b.toString('base64')}`;
    }

    // Buffer
    if (Buffer.isBuffer(qr)) {
      return `data:image/png;base64,${qr.toString('base64')}`;
    }

    // Array<number> of bytes
    if (Array.isArray(qr) && qr.length > 0 && typeof qr[0] === 'number') {
      return `data:image/png;base64,${Buffer.from(qr).toString('base64')}`;
    }

    return null;
  } catch (err) {
    console.error('getQrDataUri error:', err);
    return null;
  }
}

/**
 * Load a file from ./public and return a data URI (useful for PhonePe QR)
 * Example: loadLocalImageAsDataURI('phonepe-qr.jpg')
 */
function loadLocalImageAsDataURI(relPath: string): string | null {
  try {
    const safeRel = relPath.replace(/^\/+/, '');
    const filePath = path.join(process.cwd(), 'public', safeRel);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.error('loadLocalImageAsDataURI error:', e);
    return null;
  }
}

/**
 * Build invoice HTML — formal, high-contrast, professional.
 * Embeds invoice.qrCode (or invoice.qr) and a PhonePe QR from public/phonepe-qr.jpg
 */
function buildInvoiceHtml(invoice: any) {
  const qrDataUri = getQrDataUri(invoice.qrCode ?? invoice.qr);
  const phonePeQr = loadLocalImageAsDataURI('phonepe-qr.jpg');

  const itemsRows = (invoice.items || [])
    .map(
      (item: any) => `
      <tr>
        <td style="padding:8px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.no ?? ''}</td>
        <td style="padding:8px;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.description ?? ''}</td>
        <td style="padding:8px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.hsn || '-'}</td>
        <td style="padding:8px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.quantity ?? ''}</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${(parseFloat(item.rate || 0)).toFixed(2)}</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${(parseFloat(item.taxableAmount || 0)).toFixed(2)}</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.gst ?? ''}%</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;font-weight:600;">₹${(parseFloat(item.totalAmount || 0)).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const qrHtml = qrDataUri
    ? `<img alt="Invoice QR" src="${qrDataUri}" style="width:88px;height:88px;display:block;margin:0 auto;" decoding="async" />`
    : `<div style="font-size:11px;color:#6b7280;text-align:center">QR Not Available</div>`;

  const phonePeHtml = phonePeQr
    ? `<img alt="PhonePe QR" src="${phonePeQr}" style="width:120px;height:auto;display:block;margin:0 auto;border-radius:6px;" decoding="async" />`
    : `<div style="font-size:11px;color:#6b7280;text-align:center">PhonePe QR Not Found</div>`;

  // Terms & Conditions (from your provided content), uppercase and formal
  const termsHtml = `
    <div style="margin-top:8px;font-size:11px;color:#374151;line-height:1.5;text-transform:uppercase;">
      1.) SUBJECT TO AHMEDABAD JURISDICTION.<br/>
      2.) ANY TAXES APPLICABLE WILL BE BORNE BY THE CUSTOMER.<br/>
      3.) PLEASE PAY BY CASH / CROSSED CHEQUE / DEMAND DRAFT / UPI / NETBANKING ONLY.<br/>
      4.) PLEASE MAKE CHEQUE PAYMENTS PAYABLE TO THE APPROPRIATE BENEFICIARY AS ADVISED.
    </div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice ${invoice.invoiceNumber ?? ''}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    @page { size: A4; margin: 10px; }
    html, body { height:100%; }
    * { box-sizing: border-box; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

    body {
      font-family: 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a; /* deep gray */
      font-size: 12.5px;
      margin: 0;
      padding: 0;
      background: #fff;
    }

    .container {
      max-width: 820px;
      margin: 12px auto;
      padding: 14px;
      border: 1px solid #e6eef6;
      border-radius: 6px;
      background: #fff;
    }

    .header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
      border-bottom:1px solid #eef2f7;
      padding-bottom:12px;
      margin-bottom:12px;
    }

    .company h1 { font-size:20px; margin:0 0 4px 0; letter-spacing:0.6px; color:#0b1220; }
    .muted { color:#475569; font-size:11px; margin-top:3px; }

    .qr-holder {
      width:96px;
      height:96px;
      border-radius:6px;
      border:1px solid #e6eef6;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fff;
      padding:6px;
    }

    .title {
      text-align:center;
      font-weight:700;
      font-size:16px;
      letter-spacing:1px;
      margin: 8px 0 12px;
      padding:10px 0;
      background:#f1f5f9;
      color:#0b3d91;
      border-radius:6px;
      border:1px solid #e6eef8;
    }

    .meta { display:flex; justify-content:space-between; gap:12px; margin-bottom:12px; }
    .section { display:flex; gap:12px; margin-bottom:12px; }
    .box { flex:1; padding:10px; border-radius:6px; background:#fbfcfe; border:1px solid #eef2f9; }
    .box h4 { margin:0 0 6px 0; font-size:12px; color:#0b1220; }

    table.items { width:100%; border-collapse: collapse; margin-bottom:12px; font-size:11.5px; }
    table.items thead th {
      text-align:center;
      padding:10px 8px;
      background:#f8fafc;
      font-weight:700;
      border-bottom: 1px solid #e6eef6;
      color:#0b1220;
    }
    table.items th:nth-child(2) { text-align:left; }
    table.items td { padding:10px 8px; vertical-align:middle; color:#0f172a; border-bottom:1px solid #f1f5f9; }
    table.items td.right { text-align:right; }

    /* Avoid splitting rows across pages */
    table, thead, tbody, tr, td, th { page-break-inside: avoid; -webkit-column-break-inside: avoid; -webkit-page-break-inside: avoid; }
    tr { break-inside: avoid; }

    .totals { width:340px; margin-left:auto; border:1px solid #eef2f7; border-radius:6px; overflow:hidden; }
    .totals .row { display:flex; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #f1f5f9; font-size:11.5px; background:#fff; color:#0b1220; }
    .totals .row.total { font-weight:800; background:#f1f5f9; }

    .footer { margin-top:14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .notes { font-size:11px; color:#475569; flex:1; }

    .sign-block { display:flex; justify-content:space-between; gap:20px; align-items:flex-end; margin-top:18px; }

    .signature-line { margin-top:18px; border-top:1.25px solid #0b1220; width:180px; padding-top:6px; font-weight:700; font-size:12px; text-align:center; }

    /* PhonePe QR box */
    .phonepe-box {
      width:150px;
      border:1px solid #eef2f7;
      border-radius:8px;
      padding:10px;
      text-align:center;
      background:#fff;
    }
    .phonepe-box h5 { margin:0 0 8px 0; font-size:12px; color:#0b1220; }

    @media print {
      .container { margin:0; border:none; border-radius:0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company">
        <h1>MUSTAK KHAN</h1>
        <div class="muted">(An expert in ceiling design)</div>
        <div class="muted">C.207 Marjan Residency No. Alpola Conael, Road Vatva, Ahmedabad - 382440</div>
        <div style="margin-top:8px;font-size:12px;">
          <strong>Mob:</strong> 9979131416 &nbsp;&nbsp;<strong>Email:</strong> mustakbhaimrik510@gmail.com
        </div>
        <div style="margin-top:6px;font-size:12px;"><strong>GSTIN:</strong> 24BEGPK9997B4Z-W</div>
      </div>

      <div class="qr-holder" title="Invoice QR">
        ${qrHtml}
      </div>
    </div>

    <div class="title">TAX INVOICE</div>

    <div class="meta">
      <div><strong>Invoice No:</strong> ${invoice.invoiceNumber ?? 'N/A'}</div>
      <div style="text-align:right"><strong>Invoice Date:</strong> ${invoice.date ?? new Date().toLocaleDateString('en-IN')}</div>
    </div>

    <div class="section">
      <div class="box">
        <h4>Company Details</h4>
        <div style="font-size:11.5px;color:#0b1220;">
          <strong>Name:</strong> MUSTAK KHAN<br/>
          <strong>Address:</strong> C.207 Marjan Residency No. Alpola Conael Road Vatva Ahmedabad - 382440, Gujarat<br/>
          <strong>Mobile:</strong> 9979131416<br/>
          <strong>Email:</strong> mustakbhaimrik510@gmail.com<br/>
          <strong>GSTIN:</strong> 24BEGPK9997B4Z-W
        </div>
      </div>

      <div class="box">
        <h4>Bill To</h4>
        <div style="font-size:11.5px;color:#0b1220;">
          <strong>Name:</strong> ${invoice.clientName ?? 'N/A'}<br/>
          <strong>Address:</strong> ${invoice.clientAddress ?? 'N/A'}<br/>
          ${invoice.mobile ? `<strong>Mobile:</strong> ${invoice.mobile}<br/>` : ''}
          ${invoice.email ? `<strong>Email:</strong> ${invoice.email}<br/>` : ''}
          ${invoice.gstin ? `<strong>GSTIN:</strong> ${invoice.gstin}<br/>` : ''}
        </div>
      </div>
    </div>

    <table class="items" role="table" aria-label="Invoice Items">
      <thead>
        <tr>
          <th style="width:6%;">S. No.</th>
          <th style="width:44%;text-align:left;">Product Description</th>
          <th style="width:10%;">HSN</th>
          <th style="width:8%;">QTY.</th>
          <th style="width:12%;">Rate</th>
          <th style="width:12%;">Taxable Value</th>
          <th style="width:8%;">GST</th>
          <th style="width:12%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="display:flex;gap:12px;align-items:flex-start;">
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;color:#0b1220;">Bank Details</div>
        <div style="font-size:11.5px;color:#374151;margin-top:6px;">
          Bank Name: SBI BANK - Shahjalam Gate<br/>
          A/C: 30231750262<br/>
          IFSC: SBIN0003046
        </div>

        <div style="margin-top:12px;font-size:11.2px;color:#475569;">
          <strong>Terms &amp; Conditions:</strong>
          ${termsHtml}
        </div>
      </div>

      <div class="totals" role="note" aria-label="Tax Summary">
        <div class="row"><div>Total Amount Before Tax</div><div>₹${(parseFloat(invoice.totalAmountBeforeTax || 0)).toFixed(2)}</div></div>
        <div class="row"><div>CGST (9%)</div><div>₹${(parseFloat(invoice.cgst || 0)).toFixed(2)}</div></div>
        <div class="row"><div>SGST (9%)</div><div>₹${(parseFloat(invoice.sgst || 0)).toFixed(2)}</div></div>
        <div class="row"><div>IGST (18%)</div><div>₹${(parseFloat(invoice.igst || 0)).toFixed(2)}</div></div>
        <div class="row"><div>Total Tax Amount</div><div>₹${(parseFloat(invoice.totalTaxAmount || 0)).toFixed(2)}</div></div>
        <div class="row total"><div>Total Amount After Tax</div><div>₹${(parseFloat(invoice.totalAmountAfterTax || 0)).toFixed(2)}</div></div>
      </div>
    </div>

    <div class="footer">
      <div class="notes">
        ${invoice.amountInWords ? `<div style="font-weight:800;margin-bottom:6px">Amount in Words: ${invoice.amountInWords}</div>` : ''}
        <div style="font-size:11.2px;color:#475569;margin-top:6px;">
          Certified that the particulars given above are true &amp; correct. For <strong>MUSTAK KHAN</strong>
        </div>
        ${invoice.notes ? `<div style="margin-top:8px;font-size:11.2px;color:#374151;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
      </div>

      <div style="width:220px;">
        <div style="text-align:center;">
          <div class="signature-line">Authorised Signatory</div>
        </div>
      </div>
    </div>

    <!-- Signature + PhonePe QR row -->
    <div class="sign-block">
      <div style="text-align:center;">
        <div class="signature-line">Customer Signature</div>
      </div>

      <div style="text-align:center;">
        <div class="signature-line">Authorised Signatory</div>
      </div>

      <div class="phonepe-box" title="Pay via PhonePe">
        <h5>Pay via PhonePe</h5>
        ${phonePeHtml}
        <div style="font-size:11px;color:#475569;margin-top:8px;">Scan to pay</div>
      </div>
    </div>

    <div style="text-align:center;margin-top:14px;font-size:10.5px;color:#6b7280;">This is a computer generated invoice.</div>
  </div>
</body>
</html>`;
}

/**
 * Wait for images to load on the page (safety timeout)
 */
async function waitForImagesLoad(page: puppeteer.Page, timeoutMs = 6000) {
  await page.evaluate(
    (timeout) =>
      new Promise<void>((resolve) => {
        const imgs = Array.from(document.images || []);
        if (!imgs.length) return resolve();
        let settled = 0;
        const done = () => {
          settled++;
          if (settled >= imgs.length) resolve();
        };
        imgs.forEach((img) => {
          if ((img as HTMLImageElement).complete) return done();
          const onDone = () => {
            (img as HTMLImageElement).removeEventListener('load', onDone);
            (img as HTMLImageElement).removeEventListener('error', onDone);
            done();
          };
          (img as HTMLImageElement).addEventListener('load', onDone);
          (img as HTMLImageElement).addEventListener('error', onDone);
        });
        setTimeout(() => resolve(), timeout);
      }),
    timeoutMs
  );
}

export async function GET(_req: NextRequest) {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Get latest invoice (you can change query if you wish to fetch by id)
    const latest = await collection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    if (!latest.length) {
      return NextResponse.json({ message: 'No invoices found.' }, { status: 404 });
    }

    const invoice = latest[0];

    // Build HTML
    const html = buildInvoiceHtml(invoice);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for all images (QRs) to load (or timeout)
    await waitForImagesLoad(page, 6000);

    // Measure document height and scale to fit A4 if needed
    const contentHeightPx = await page.evaluate(() => {
      const el = document.documentElement || document.body;
      return Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
    });

    // A4 height in inches is 11.69. Assuming 96dpi for CSS pixels
    const cssPixelsPerInch = 96;
    const a4HeightPx = 11.69 * cssPixelsPerInch; // ~1122px
    const verticalMarginsPx = 10 + 10; // margins used in pdf options
    const availableHeight = a4HeightPx - verticalMarginsPx;

    let scale = 1;
    if (contentHeightPx > availableHeight) {
      scale = availableHeight / contentHeightPx;
      // don't shrink below this threshold (keeps text readable)
      scale = Math.max(scale, 0.55);
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' },
      scale,
    });

    await browser.close();

    const fileName = `tax-invoice-${invoice.invoiceNumber || 'invoice'}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { message: `Failed to generate PDF: ${error?.message ?? 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    await client.close().catch(() => {});
  }
}

/*
  LOCAL TEST / DEBUG NOTES:
  - To test PhonePe QR locally, put your file at: ./public/phonepe-qr.jpg
  - You previously uploaded a sample file at: /mnt/data/Screenshot 2025-11-21 152144.png
    (You can use that path in invoice.qrCode for local tests if desired.)
  - Recommended storage for persistent QR: store invoice.qrCode as a "data:" URI
    (e.g. "data:image/png;base64,<base64>") when creating invoices — that guarantees it embeds everywhere.
*/
