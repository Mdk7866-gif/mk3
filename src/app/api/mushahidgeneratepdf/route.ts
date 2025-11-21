// src/app/api/mushahidgeneratepdf/route.ts

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

function buildInvoiceHtml(invoice: any) {
  const itemsRows = (invoice.items || [])
    .map(
      (item: any) => `
        <tr>
          <td style="border:1px solid #ccc;padding:4px;text-align:center;">${item.no}</td>
          <td style="border:1px solid #ccc;padding:4px;">${item.description}</td>
          <td style="border:1px solid #ccc;padding:4px;text-align:center;">${item.hsn || ''}</td>
          <td style="border:1px solid #ccc;padding:4px;text-align:center;">${item.quantity}</td>
          <td style="border:1px solid #ccc;padding:4px;text-align:right;">${item.rate}</td>
          <td style="border:1px solid #ccc;padding:4px;text-align:right;">${item.taxableAmount}</td>
          <td style="border:1px solid #ccc;padding:4px;text-align:right;">${item.gst}</td>
          <td style="border:1px solid #ccc;padding:4px;text-align:right;">${item.totalAmount}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px;
            margin: 24px;
            color: #111827;
          }
          h1, h2, h3, h4 {
            margin: 0;
            padding: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .section {
            margin-bottom: 16px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>GST Invoice</h1>
            <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${invoice.date}</p>
          </div>
          <div style="text-align:right;">
            <p><strong>Created At:</strong> ${new Date(invoice.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div class="section">
          <h3>Bill To</h3>
          <p><strong>Name:</strong> ${invoice.clientName}</p>
          <p><strong>Address:</strong> ${invoice.clientAddress}</p>
          ${invoice.email ? `<p><strong>Email:</strong> ${invoice.email}</p>` : ''}
          ${invoice.mobile ? `<p><strong>Mobile:</strong> ${invoice.mobile}</p>` : ''}
          ${invoice.gstin ? `<p><strong>GSTIN:</strong> ${invoice.gstin}</p>` : ''}
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th style="border:1px solid #ccc;padding:4px;text-align:left;">#</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:left;">Description</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:center;">HSN</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:center;">Qty</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:right;">Rate</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:right;">Taxable</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:right;">GST</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="max-width:55%;">
            ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            ${invoice.amountInWords ? `<p><strong>Amount in words:</strong> ${invoice.amountInWords}</p>` : ''}
          </div>
          <div style="text-align:right;min-width:40%;">
            <p><strong>Amount Before Tax:</strong> ${invoice.totalAmountBeforeTax}</p>
            <p><strong>CGST:</strong> ${invoice.cgst}</p>
            <p><strong>SGST:</strong> ${invoice.sgst}</p>
            <p><strong>Total Tax:</strong> ${invoice.totalTaxAmount}</p>
            <p><strong>Total After Tax:</strong> ${invoice.totalAmountAfterTax}</p>
          </div>
        </div>

        <div style="margin-top:32px;text-align:right;">
          <p>Authorised Signatory</p>
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
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '16px', bottom: '20px', left: '16px' },
    });

    await browser.close();

    const fileName = `mushahid-gst-${invoice.invoiceNumber || 'invoice'}.pdf`;

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
      { message: `Failed to generate PDF: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    await client.close().catch(() => {});
  }
}


