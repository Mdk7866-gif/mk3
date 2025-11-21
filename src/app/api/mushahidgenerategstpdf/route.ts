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
 * Normalize various QR shapes into a src usable by <img src="...">
 * Supports:
 *  - data:image/png;base64,... (returns as-is)
 *  - base64 string (no data: prefix) -> assume PNG
 *  - http(s) url (returns as-is)
 *  - local file path -> read and convert to data URI
 *  - Buffer / Mongo Binary -> convert to data URI
 *  - Array<number> -> convert to data URI
 */
function getQrDataUri(qrAny: any): string | null {
  try {
    if (!qrAny) return null;

    // if caller passed an object { qrCode: '...' } allow that
    const qr = typeof qrAny === 'object' && (qrAny.qrCode || qrAny.qr) ? (qrAny.qrCode ?? qrAny.qr) : qrAny;

    if (!qr) return null;

    // Already a data URI
    if (typeof qr === 'string' && qr.startsWith('data:')) return qr;

    // HTTP(S) url -> return as-is (puppeteer/browser will fetch)
    if (typeof qr === 'string' && (qr.startsWith('http://') || qr.startsWith('https://'))) {
      return qr;
    }

    // Local file path (absolute or relative). Useful for local testing.
    // Example local path (from your uploaded test image): /mnt/data/Screenshot 2025-11-21 152144.png
    if (typeof qr === 'string' && (qr.startsWith('/') || qr.includes('./') || qr.includes('../') || qr.includes('/mnt/'))) {
      try {
        const filePath = path.isAbsolute(qr) ? qr : path.resolve(process.cwd(), qr);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          return `data:image/png;base64,${fileBuffer.toString('base64')}`;
        }
      } catch (e) {
        // proceed to other handlers
      }
    }

    // Plain base64 string without prefix (very long string)
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

    // Array<number> bytes
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
 * Build invoice HTML. This function uses invoice.qrCode (preferred) or invoice.qr.
 * The function keeps styling compact and professional for scannable QR on PDF.
 */
function buildInvoiceHtml(invoice: any) {
  const qrDataUri = getQrDataUri(invoice.qrCode ?? invoice.qr);

  const itemsRows = (invoice.items || [])
    .map(
      (item: any) => `
      <tr>
        <td style="padding:8px;text-align:center;font-size:11px;border-bottom:1px solid #eee;">${item.no ?? ''}</td>
        <td style="padding:8px;font-size:11px;border-bottom:1px solid #eee;">${item.description ?? ''}</td>
        <td style="padding:8px;text-align:center;font-size:11px;border-bottom:1px solid #eee;">${item.hsn || '-'}</td>
        <td style="padding:8px;text-align:center;font-size:11px;border-bottom:1px solid #eee;">${item.quantity ?? ''}</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #eee;">₹${(parseFloat(item.rate||0)).toFixed(2)}</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #eee;">₹${(parseFloat(item.taxableAmount||0)).toFixed(2)}</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #eee;">${item.gst ?? ''}%</td>
        <td style="padding:8px;text-align:right;font-size:11px;border-bottom:1px solid #eee;font-weight:600;">₹${(parseFloat(item.totalAmount||0)).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const qrHtml = qrDataUri
    ? `<img alt="QR Code" src="${qrDataUri}" style="max-width:100%;max-height:100%;display:block;" decoding="async" />`
    : `<div style="font-size:11px;color:#6b7280;text-align:center">QR Not Available</div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice ${invoice.invoiceNumber ?? ''}</title>
  <style>
    @page { size: A4; margin: 10px; }
    html,body { height:100%; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      color: #111827;
      font-size: 12px;
      padding: 0;
      margin: 0;
      background: white;
    }

    .wrapper {
      max-width: 800px;
      margin: 10px auto;
      border: 1px solid #e6e6e6;
      padding: 12px;
      background: #fff;
    }

    .header {
      display:flex;
      justify-content:space-between;
      gap:12px;
      border-bottom: 1px solid #e6e6e6;
      padding-bottom:12px;
      margin-bottom:12px;
    }

    .company h1 { font-size:18px; margin:0 0 4px 0; letter-spacing:0.5px; }
    .muted { color:#6b7280; font-size:11px; margin-top:2px; }

    .qrbox {
      width:96px;
      height:96px;
      border:1px solid #e6e6e6;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fff;
      padding:6px;
    }

    .title { text-align:center; font-weight:700; font-size:16px; letter-spacing:1px; margin: 6px 0 12px; padding:8px 0; background:#f3f4f6; border-radius:4px; }

    .meta { display:flex; justify-content:space-between; gap:12px; margin-bottom:12px; border-bottom:1px solid #eef0f2; padding-bottom:8px; }
    .section { display:flex; gap:12px; margin-bottom:12px; }
    .box { flex:1; padding:10px; border:1px solid #f3f4f6; border-radius:4px; background:#fbfbfc; }
    .box h4 { margin:0 0 6px 0; font-size:12px; }

    table.items { width:100%; border-collapse: collapse; margin-bottom:12px; font-size:11px; }
    table.items th { text-align:center; padding:10px 8px; border-bottom:1px solid #e6e6e6; background:#f8fafb; font-weight:700; }
    table.items td { padding:8px; vertical-align:middle; }

    /* Avoid splitting rows across pages */
    table, thead, tbody, tr, td, th { page-break-inside: avoid; -webkit-column-break-inside: avoid; -webkit-page-break-inside: avoid; }
    tr { break-inside: avoid; }

    .totals { width:320px; margin-left:auto; border:1px solid #eef0f2; border-radius:4px; overflow:hidden; }
    .totals .row { display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #f1f1f1; font-size:11px; background:#fff; }
    .totals .row.total { font-weight:700; background:#f8fafb; }

    .footer { margin-top:14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .notes { font-size:11px; color:#4b5563; flex:1; }

    .signature-line { margin-top:36px; border-top:1px solid #111827; padding-top:6px; font-weight:600; font-size:12px; }

    @media print { .wrapper { margin:0; border:none; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="company">
        <h1>MUSTAK KHAN</h1>
        <div class="muted">(All Type Of Ceiling Designs)</div>
        <div class="muted">C-1/207 Marjan Residency Nr. Canal Road, Vatva Ahmedabad - 382440, Gujarat</div>
        <div style="margin-top:6px;font-size:12px;"><strong>Mobile:</strong> 9979174216 &nbsp; <strong>Email:</strong> mustakkhan.mk550@gmail.com</div>
        <div style="margin-top:6px;font-size:12px;"><strong>GSTIN:</strong> 24BEQPK9997B1ZW</div>
      </div>

      <div class="qrbox" aria-hidden="${qrDataUri ? 'false' : 'true'}">
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
        <div style="font-size:11px;">
          <strong>Name:</strong> MUSTAK KHAN<br/>
          <strong>Address:</strong> C-1/207 Marjan Residency Nr. Canal Road, Vatva Ahmedabad - 382440, Gujarat<br/>
          <strong>Mobile:</strong> 9979174216<br/>
          <strong>Email:</strong> mustakkhan.mk550@gmail.com<br/>
          <strong>GSTIN:</strong> 24BEQPK9997B1ZW
        </div>
      </div>

      <div class="box">
        <h4>Bill To</h4>
        <div style="font-size:11px;">
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
          <th style="width:40%;text-align:left;">Product Description</th>
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
        <div style="font-size:11px;"><strong>Bank Details</strong></div>
        <div style="font-size:11px;color:#374151;margin-top:6px;">
          Bank Name: SBIBANK-SHAHALAMGATE<br/>
          A/C: 30391756262<br/>
          IFSC: SBIN0003046<br/>
          Pan No: BEQPK9997B
        </div>

       <div style="margin-top:10px;font-size:11px;color:#4b5563">
  <strong>Terms &amp; Conditions:</strong>
  <div style="margin-top:6px; line-height:1.5; text-transform:uppercase;">
    1.) SUBJECT TO AHMEDABAD JURISDICTION.<br/>
    2.) ANY TAXES APPLICABLE WILL BE BORNE BY THE CUSTOMER.<br/>
    3.) PLEASE PAY BY CASH / CROSSED CHEQUE / UPI / NETBANKING ONLY.<br/>
    4.) PLEASE MAKE CHEQUE PAYMENTS PAYABLE TO THE APPROPRIATE BENEFICIARY AS ADVISED.
  </div>
</div>
      </div>

      <div class="totals" role="note" aria-label="Tax Summary">
        <div class="row"><div>Total Amount Before Tax</div><div>₹${(parseFloat(invoice.totalAmountBeforeTax||0)).toFixed(2)}</div></div>
        <div class="row"><div>CGST (9%)</div><div>₹${(parseFloat(invoice.cgst||0)).toFixed(2)}</div></div>
        <div class="row"><div>SGST (9%)</div><div>₹${(parseFloat(invoice.sgst||0)).toFixed(2)}</div></div>
        <div class="row"><div>IGST (18%)</div><div>₹${(parseFloat(invoice.igst||0)).toFixed(2)}</div></div>
        <div class="row"><div>Total Tax Amount</div><div>₹${(parseFloat(invoice.totalTaxAmount||0)).toFixed(2)}</div></div>
        <div class="row total"><div>Total Amount After Tax</div><div>₹${(parseFloat(invoice.totalAmountAfterTax||0)).toFixed(2)}</div></div>
      </div>
    </div>

    <div class="footer">
      <div class="notes">
        ${invoice.amountInWords ? `<div style="font-weight:700;margin-bottom:6px">Amount in Words: ${invoice.amountInWords}</div>` : ''}
        <div style="font-size:11px;color:#6b7280;margin-top:6px;">
          Certified that the particulars given above are true &amp; correct. For <strong>MUSTAK KHAN</strong>
        </div>
        ${invoice.notes ? `<div style="margin-top:8px;font-size:11px;color:#374151;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
      </div>
      <div style="text-align:center;width:220px;">
        <div class="signature-line">Authorised Signatory</div>
      </div>
    </div>

    <div style="text-align:center;margin-top:10px;font-size:10px;color:#6b7280;">This is a computer generated invoice.</div>
  </div>
</body>
</html>`;
}

/**
 * Helper to wait for images to load (with a timeout to avoid hanging)
 */
async function waitForImagesLoad(page: puppeteer.Page, timeoutMs = 5000) {
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
        // safety timeout
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

    // Fetch latest invoice
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

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for images (QR) to finish loading or timeout
    await waitForImagesLoad(page, 5000);

    // Measure content height and scale to fit into A4 if needed
    const contentHeightPx = await page.evaluate(() => {
      const el = document.documentElement || document.body;
      return Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
    });

    const cssPixelsPerInch = 96;
    const a4HeightPx = 11.69 * cssPixelsPerInch; // ~1122 px
    const verticalMarginsPx = 10 + 10; // top + bottom margins used in pdf options
    const availableHeight = a4HeightPx - verticalMarginsPx;

    let scale = 1;
    if (contentHeightPx > availableHeight) {
      scale = availableHeight / contentHeightPx;
      // do not shrink below 0.55 to keep text readable
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
    return NextResponse.json({ message: `Failed to generate PDF: ${error?.message ?? 'Unknown'}` }, { status: 500 });
  } finally {
    await client.close().catch(() => {});
  }
}

/*
  LOCAL TEST TIP:
  - If you want to test locally with the screenshot you uploaded, set an invoice's qrCode to:
    "/mnt/data/Screenshot 2025-11-21 152144.png"
  - Or, when saving a QR in your production app, store it as a data URI like:
    "data:image/png;base64,<base64 here>"
*/
