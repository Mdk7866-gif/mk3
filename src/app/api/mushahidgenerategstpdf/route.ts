// src/app/api/mushahidgenerategstpdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';
const collectionName = 'mushahidgst';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/**
 * Convert invoice.qr (possible shapes) to a data URI suitable for <img src="">
 * Supports:
 * - data URI string already stored
 * - Buffer-like (.buffer)
 * - binary array
 */
function getQrDataUri(qr: any): string | null {
  try {
    if (!qr) return null;
    if (typeof qr === 'string') {
      if (qr.startsWith('data:')) return qr;
      // assume base64 without prefix: default to png
      return `data:image/png;base64,${qr}`;
    }
    // mongodb binary: { buffer: ... } or Buffer
    if (qr.buffer) {
      const b = Buffer.isBuffer(qr.buffer) ? qr.buffer : Buffer.from(qr.buffer);
      return `data:image/png;base64,${b.toString('base64')}`;
    }
    if (Buffer.isBuffer(qr)) {
      return `data:image/png;base64,${qr.toString('base64')}`;
    }
    // Array-like binary
    if (Array.isArray(qr)) {
      return `data:image/png;base64,${Buffer.from(qr).toString('base64')}`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function buildInvoiceHtml(invoice: any) {
  const qrDataUri = getQrDataUri(invoice.qr);

  const itemsRows = (invoice.items || [])
    .map(
      (item: any) => `
        <tr>
          <td style="border:1px solid #dedede;padding:8px;text-align:center;font-size:11px;">${item.no ?? ''}</td>
          <td style="border:1px solid #dedede;padding:8px;font-size:11px;">${item.description ?? ''}</td>
          <td style="border:1px solid #dedede;padding:8px;text-align:center;font-size:11px;">${item.hsn || '-'}</td>
          <td style="border:1px solid #dedede;padding:8px;text-align:center;font-size:11px;">${item.quantity ?? ''}</td>
          <td style="border:1px solid #dedede;padding:8px;text-align:right;font-size:11px;">₹${(parseFloat(item.rate || 0)).toFixed(2)}</td>
          <td style="border:1px solid #dedede;padding:8px;text-align:right;font-size:11px;">₹${(parseFloat(item.taxableAmount || 0)).toFixed(2)}</td>
          <td style="border:1px solid #dedede;padding:8px;text-align:right;font-size:11px;">${item.gst ?? ''}%</td>
          <td style="border:1px solid #dedede;padding:8px;text-align:right;font-size:11px;font-weight:600;">₹${(parseFloat(item.totalAmount || 0)).toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  // Professional / formal styling + page rules for printing.
  return `<!DOCTYPE html>
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

          .invoice-wrapper {
            max-width: 800px;
            margin: 12px auto;
            border: 1px solid #e5e7eb;
            padding: 12px;
            background: #fff;
          }

          .header {
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
            border-bottom: 1px solid #e6e6e6;
            padding-bottom:12px;
            margin-bottom:12px;
          }

          .company {
            line-height:1.25;
          }
          .company h1 {
            font-size:18px;
            margin:0 0 4px 0;
            letter-spacing:0.5px;
          }
          .muted { color:#6b7280; font-size:11px; }

          .qr {
            width:96px;
            height:96px;
            border:1px solid #e6e6e6;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#fff;
            padding:6px;
          }
          .qr img { max-width:100%; max-height:100%; display:block; }

          .title {
            text-align:center;
            font-weight:700;
            font-size:16px;
            letter-spacing:1px;
            margin: 4px 0 12px 0;
            padding:8px 0;
            background:#f3f4f6;
            border-radius:4px;
          }

          .meta {
            display:flex;
            gap:12px;
            margin-bottom:12px;
            border-bottom:1px solid #eef0f2;
            padding-bottom:8px;
          }
          .meta .left, .meta .right { flex:1; }

          .section {
            display:flex;
            gap:12px;
            margin-bottom:12px;
          }
          .section .box { flex:1; padding:10px; border:1px solid #f3f4f6; border-radius:4px; background:#fbfbfc; }
          .section .box h4 { margin:0 0 6px 0; font-size:12px; }

          table.items {
            width:100%;
            border-collapse: collapse;
            margin-bottom:12px;
            font-size:11px;
          }
          table.items th {
            text-align:center;
            padding:10px 8px;
            border-bottom:1px solid #e6e6e6;
            background:#f8fafb;
            font-weight:700;
          }
          table.items td { padding:8px; border-bottom:1px solid #f1f1f1; vertical-align:middle; }

          /* Avoid splitting rows across pages */
          table, thead, tbody, tr, td, th { page-break-inside: avoid; -webkit-column-break-inside: avoid; -webkit-page-break-inside: avoid; }
          tr { break-inside: avoid; }

          .totals {
            width:320px;
            margin-left:auto;
            border:1px solid #eef0f2;
            border-radius:4px;
            overflow:hidden;
          }
          .totals .row {
            display:flex;
            justify-content:space-between;
            padding:8px 12px;
            border-bottom:1px solid #f1f1f1;
            font-size:11px;
            background:#fff;
          }
          .totals .row.total { font-weight:700; background:#f8fafb; }

          .footer {
            margin-top:14px;
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
          }
          .notes { font-size:11px; color:#4b5563; flex:1; }
          .sign { text-align:center; width:220px; }

          .signature-line {
            margin-top:36px;
            border-top:1px solid #111827;
            padding-top:6px;
            font-weight:600;
            font-size:12px;
          }

          @media print {
            .invoice-wrapper { margin:0; border:none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="header">
            <div class="company">
              <h1>MUSTAK KHAN</h1>
              <div class="muted">(An expert in ceiling design)</div>
              <div class="muted">C.207 Marjan Residency No. Alpola Conael, Road Vatva, Ahmedabad - 382440</div>
              <div style="margin-top:6px;font-size:12px;">
                <strong>Mob:</strong> 9979131416 &nbsp; &nbsp; <strong>Email:</strong> mustakbhaimrik510@gmail.com
              </div>
              <div style="margin-top:6px;font-size:12px;"><strong>GSTIN:</strong> 24BEGPK9997B4Z-W</div>
            </div>

            <div class="qr" aria-hidden="${qrDataUri ? 'false' : 'true'}">
              ${
                qrDataUri
                  ? `<img alt="QR Code" src="${qrDataUri}" />`
                  : `<div style="font-size:11px;color:#6b7280;text-align:center">QR Not Available</div>`
              }
            </div>
          </div>

          <div class="title">TAX INVOICE</div>

          <div class="meta">
            <div class="left"><strong>Invoice No:</strong> ${invoice.invoiceNumber ?? 'N/A'}</div>
            <div class="right" style="text-align:right"><strong>Invoice Date:</strong> ${invoice.date ?? new Date().toLocaleDateString('en-IN')}</div>
          </div>

          <div class="section">
            <div class="box">
              <h4>Company Details</h4>
              <div style="font-size:11px;">
                <strong>Name:</strong> MUSTAK KHAN<br />
                <strong>Address:</strong> C.207 Marjan Residency No. Alpola Conael Road Vatva Ahmedabad - 382440, Gujarat<br />
                <strong>Mobile:</strong> 9979131416<br />
                <strong>Email:</strong> mustakbhaimrik510@gmail.com<br />
                <strong>GSTIN:</strong> 24BEGPK9997B4Z-W
              </div>
            </div>

            <div class="box">
              <h4>Bill To</h4>
              <div style="font-size:11px;">
                <strong>Name:</strong> ${invoice.clientName ?? 'N/A'}<br />
                <strong>Address:</strong> ${invoice.clientAddress ?? 'N/A'}<br />
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
                Bank Name: SBI BANK - Shahjalam Gate<br/>
                A/C: 30231750262<br/>
                IFSC: SBIN0003046
              </div>

              <div style="margin-top:10px;font-size:11px;color:#4b5563">
                <strong>Terms & Conditions:</strong>
                <div style="margin-top:6px;">
                  1. Goods once sold will not be taken back.<br/>
                  2. All disputes subject to Ahmedabad jurisdiction.
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

            <div class="sign">
              <div class="signature-line">Authorised Signatory</div>
            </div>
          </div>

          <div style="text-align:center;margin-top:10px;font-size:10px;color:#6b7280;">This is a computer generated invoice.</div>
        </div>
      </body>
    </html>
  `;
}

export async function GET(_req: NextRequest) {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const latest = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (!latest.length) {
      return NextResponse.json(
        { message: 'No invoices found for Mushahid GST.' },
        { status: 404 }
      );
    }

    const invoice = latest[0];
    const html = buildInvoiceHtml(invoice);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set content and wait for fonts/images to load
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Measure content height in CSS pixels
    const contentHeightPx = await page.evaluate(() => {
      const el = document.documentElement || document.body;
      return Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
    });

    // A4 height in inches is 11.69. Convert to CSS px assuming 96dpi (common browser default)
    const cssPixelsPerInch = 96;
    const a4HeightPx = 11.69 * cssPixelsPerInch; // ≈ 1122 px
    const verticalMarginsPx = 10 + 10; // top + bottom margins you set in page.pdf (10px each)
    const availableHeight = a4HeightPx - verticalMarginsPx;

    // If content is taller than available height, scale down. Clamp scale to reasonable limits.
    let scale = 1;
    if (contentHeightPx > availableHeight) {
      scale = availableHeight / contentHeightPx;
      // Do not shrink below 0.55 (to avoid unreadably small text). Adjust if needed.
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
    console.error('Error generating Mushahid GST PDF:', error);
    return NextResponse.json(
      { message: `Failed to generate PDF: ${error?.message ?? 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    await client.close().catch(() => {});
  }
}
