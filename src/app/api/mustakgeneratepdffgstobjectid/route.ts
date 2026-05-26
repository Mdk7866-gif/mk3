// src/app/api/mustakgenerategstpdff/route.ts
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb'; // Imported ObjectId
import puppeteer, { Page } from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mustakgst';

const vercelUrl = process.env.VERCEL_URL;
const normalizedVercelUrl = vercelUrl
  ? vercelUrl.startsWith('http')
    ? vercelUrl
    : `https://${vercelUrl}`
  : null;

const DEFAULT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.SITE_URL ||
  process.env.WEBSITE_DEPLOYEMENT ||
  normalizedVercelUrl ||
  'http://localhost:3000';

/* ---------- TYPES ---------- */

interface GstInvoiceItem {
  no?: number;
  description?: string;
  hsn?: string;
  quantity?: number | string;
  rate?: number | string;
  taxableAmount?: number | string;
  gst?: number | string;
  totalAmount?: number | string;
}

interface GstInvoice {
  _id?: unknown;

  qrCode?: unknown;
  qr?: unknown;

  verificationUrl?: string;
  verifyUrl?: string;
  qrLink?: string;

  invoiceNumber?: string;
  issuer?: string;
  documentType?: string;

  paymentLink?: string;
  paymentUrl?: string;
  paymentPage?: string;
  phonePeLink?: string;
  gpayLink?: string;
  paytmLink?: string;

  upiId?: string;
  upi?: string;
  upiName?: string;
  clientName?: string;
  clientAddress?: string;
  mobile?: string;
  email?: string;
  gstin?: string;

  items?: GstInvoiceItem[];

  amountInWords?: string;
  notes?: string;
  date?: string;

  totalAmountBeforeTax?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  igst?: number | string;
  totalTaxAmount?: number | string;
  totalAmountAfterTax?: number | string;
  totalAmount?: number | string;

  createdAt?: Date | string;

  [key: string]: unknown;
}


/* ---------- HELPERS ---------- */

function getQrDataUri(qrAny: unknown): string | null {
  try {
    if (!qrAny) return null;

    const qr =
      typeof qrAny === 'object' &&
      qrAny !== null &&
      ('qrCode' in qrAny || 'qr' in qrAny)
        ? ((qrAny as { qrCode?: unknown; qr?: unknown }).qrCode ??
           (qrAny as { qrCode?: unknown; qr?: unknown }).qr)
        : qrAny;

    if (!qr) return null;

    if (typeof qr === 'string' && qr.startsWith('data:')) return qr;
    if (typeof qr === 'string' && (qr.startsWith('http://') || qr.startsWith('https://')))
      return qr;

    if (
      typeof qr === 'string' &&
      (qr.startsWith('/') || qr.includes('./') || qr.includes('../') || qr.includes('/mnt/'))
    ) {
      try {
        const filePath = path.isAbsolute(qr) ? qr : path.resolve(process.cwd(), qr);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          return `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      } catch {
        // ignore file errors
      }
    }

    if (typeof qr === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(qr) && qr.length > 100) {
      return `data:image/png;base64,${qr.replace(/\s+/g, '')}`;
    }

    if (qr && typeof qr === 'object' && 'buffer' in qr) {
      const bufLike = (qr as { buffer: Buffer | ArrayBuffer | Uint8Array }).buffer;
      const b = Buffer.isBuffer(bufLike) ? bufLike : Buffer.from(bufLike as ArrayBuffer);
      return `data:image/png;base64,${b.toString('base64')}`;
    }

    if (Buffer.isBuffer(qr)) {
      return `data:image/png;base64,${qr.toString('base64')}`;
    }

    if (Array.isArray(qr) && qr.length > 0 && typeof qr[0] === 'number') {
      return `data:image/png;base64,${Buffer.from(qr).toString('base64')}`;
    }

    return null;
  } catch (err) {
    console.error('getQrDataUri error:', err);
    return null;
  }
}

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

function buildVerificationUrl(invoice: GstInvoice): string | null {
  const rawUrl =
    (typeof invoice.verificationUrl === 'string' && invoice.verificationUrl.length > 4 && invoice.verificationUrl) ||
    (typeof invoice.verifyUrl === 'string' && invoice.verifyUrl.length > 4 && invoice.verifyUrl) ||
    (typeof invoice.qrLink === 'string' && invoice.qrLink.length > 4 && invoice.qrLink) ||
    null;

  if (rawUrl) return rawUrl;

  const invoiceNumber = invoice.invoiceNumber;
  if (!invoiceNumber) return null;

  const issuer = (invoice.issuer ?? '').toString().toLowerCase();
  const pathname =
    issuer === 'mushahid'
      ? '/verifyqrcodefrontendmushahid'
      : issuer === 'mustak'
      ? '/verifyqrcodefrontendmustak'
      : '/verifyqrcodefrontendmustak';

  const base =
    DEFAULT_PUBLIC_BASE_URL.startsWith('http')
      ? DEFAULT_PUBLIC_BASE_URL
      : `https://${DEFAULT_PUBLIC_BASE_URL}`;

  const url = new URL(pathname, base);
  url.searchParams.set('invoiceNumber', invoiceNumber);
  if (invoice.documentType) url.searchParams.set('type', String(invoice.documentType));
  url.searchParams.set('issuer', issuer || 'mustak');

  return url.toString();
}

function buildPaymentLinks(invoice: GstInvoice): { primary: string; deepLink?: string } | null {
  // If a direct payment link is provided in the invoice, use that first
  const direct =
    (typeof invoice.paymentLink === 'string' && invoice.paymentLink) ||
    (typeof invoice.paymentUrl === 'string' && invoice.paymentUrl) ||
    (typeof invoice.paymentPage === 'string' && invoice.paymentPage) ||
    (typeof invoice.phonePeLink === 'string' && invoice.phonePeLink) ||
    (typeof invoice.gpayLink === 'string' && invoice.gpayLink) ||
    (typeof invoice.paytmLink === 'string' && invoice.paytmLink) ||
    '';

  if (direct && direct.length > 4) {
    return { primary: direct };
  }

  // ✅ Your fixed UPI details for MUSTAK
  const upiId = '9979174216@ybl';
  const payeeName = 'Mustak Ishamohmmed Khan';
  const note = 'thank you for yourpayment';

  const amountRaw =
    invoice.totalAmountAfterTax ??
    invoice.totalAmount;

  // Common UPI params
  const upiParams = new URLSearchParams({
    pa: upiId,    // UPI ID
    pn: payeeName,
    cu: 'INR',
    tn: note,
  });

  if (amountRaw !== undefined && amountRaw !== null && amountRaw !== '') {
    upiParams.set('am', String(amountRaw));
  }

  // Deep UPI link (what /upi-pay will actually open)
  const deepLink = `upi://pay?${upiParams.toString()}`;

  // HTTPS link to your redirect page: https://your-domain/upi-pay?... 
  const base =
    DEFAULT_PUBLIC_BASE_URL.startsWith('http')
      ? DEFAULT_PUBLIC_BASE_URL
      : `https://${DEFAULT_PUBLIC_BASE_URL}`;

  const redirectUrl = new URL('/upi-pay', base);
  redirectUrl.search = upiParams.toString();

  return {
    primary: redirectUrl.toString(), // 🔹 goes into PDF <a href="">
    deepLink,
  };
}

function buildInvoiceHtml(invoice: GstInvoice): string {
  const qrDataUri = getQrDataUri(invoice.qrCode ?? invoice.qr);
  const phonePeQr = loadLocalImageAsDataURI('phonepe-qr.jpg');
  const verificationUrl = buildVerificationUrl(invoice);
  const paymentLinks = buildPaymentLinks(invoice);
  const items: GstInvoiceItem[] = invoice.items ?? [];
  const itemsCount = items.length;
  const densityClass =
    itemsCount > 34 ? 'density-ultra' : itemsCount > 24 ? 'density-compact' : 'density-regular';

  const itemsRows = items
    .map(
      (item: GstInvoiceItem) => `
  <tr>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.no ?? ''}</td>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.description ?? ''}</td>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.hsn || '-'}</td>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.quantity ?? ''}</td>
    <td style="padding:5px 4px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${Number(item.rate ?? 0).toFixed(2)}</td>
    <td style="padding:5px 4px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${Number(item.taxableAmount ?? 0).toFixed(2)}</td>
    <td style="padding:5px 4px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${Number(item.gst ?? 0).toFixed(2)}</td>
    <td style="padding:5px 4px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;font-weight:600;">₹${Number(item.totalAmount ?? 0).toFixed(2)}</td>
  </tr>`,
    )
    .join('');

  const qrImage = qrDataUri
    ? `<img alt="Invoice QR" src="${qrDataUri}" style="width:88px;height:88px;display:block;margin:0 auto;" decoding="async" />`
    : `<div style="font-size:10px;color:#6b7280;text-align:center">No QR</div>`;

  const qrHtml = verificationUrl
    ? `<a href="${verificationUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;display:block;">
        ${qrImage}
        <div style="font-size:9px;text-align:center;color:#0f172a;margin-top:2px;">Scan or tap to verify</div>
      </a>`
    : qrImage;

  const paymentHref = paymentLinks?.primary || '#';

  // ---------- TEMPORARY TOGGLE ----------
  // Set this to `true` to restore PhonePe QR and label.
  // Default: false (so QR removed and blank placeholder used).
  const showPhonePe = false;
  // -------------------------------------

  // If showPhonePe is enabled and phonePeQr exists, render the original QR + link.
  // Otherwise render an explicit blank placeholder with the same visual size to preserve layout.
  const phonePeHtml = showPhonePe && phonePeQr
    ? `<a href="${paymentHref}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;">
         <img alt="UPI Payment QR" src="${phonePeQr}" style="width:80px;height:auto;display:block;margin:0 auto;border-radius:4px;" decoding="async" />
         <div style="font-size:9px;color:#0f172a;margin-top:3px;font-weight:600;">Scan or tap to pay</div>
       </a>`
    : `<div style="width:80px;height:88px;display:block;margin:0 auto;border-radius:4px;">
         </div>`;

  const termsContent = `
    <div style="line-height:1.2;">
      1.) SUBJECT TO AHMEDABAD JURISDICTION.<br/>
      2.) ANY TAXES APPLICABLE WILL BE BORNE BY THE CUSTOMER.<br/>
      3.) PLEASE PAY BY CASH / CROSSED CHEQUE / DEMAND DRAFT / UPI / NETBANKING ONLY.<br/>
      4.) PLEASE MAKE CHEQUE PAYMENTS PAYABLE TO THE APPROPRIATE BENEFICIARY AS ADVISED.
    </div>`;

  const amountWordsHtml = invoice.amountInWords
    ? `<div style="margin-top:4px;font-weight:800;font-size:10.5px;color:#0b1220;">Amount in Words: ${invoice.amountInWords}</div>`
    : '';

  const notesHtml = invoice.notes
    ? `<div style="margin-top:3px;"><strong>Notes:</strong> ${invoice.notes}</div>`
    : '';

  const certHtml =
    '<div style="margin-top:3px;">Certified that the particulars given above are true &amp; correct. For <strong>MUSTAK ISHAMOHAMMAD KHAN</strong>.</div>';

  const totalBeforeTax = Number(invoice.totalAmountBeforeTax ?? 0).toFixed(2);
  const cgst = Number(invoice.cgst ?? 0).toFixed(2);
  const sgst = Number(invoice.sgst ?? 0).toFixed(2);
  const igst = Number(invoice.igst ?? 0).toFixed(2);
  const totalTaxAmount = Number(invoice.totalTaxAmount ?? 0).toFixed(2);
  const totalAfterTax = Number(invoice.totalAmountAfterTax ?? 0).toFixed(2);

  const invoiceDate =
    typeof invoice.date === 'string' && invoice.date
      ? invoice.date
      : new Date().toLocaleDateString('en-IN');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice ${invoice.invoiceNumber ?? ''}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    @page { size: A4; margin: 5px; }
    html, body { height:100%; margin: 0; padding: 0; }
    * { box-sizing: border-box; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

    body {
      font-family: 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      font-size: 11.5px;
      background: #fff;
    }

    .container {
      max-width: 750px;
      margin: 0 auto;
      padding: 0 5px;
      background: #fff;
    }

    .header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
      border-bottom:1px solid #eef2f7;
      padding-bottom:6px;
      margin-bottom:8px;
      padding-top: 8px;
    }

    .company h1 { font-size:20px; margin:0 0 4px 0; letter-spacing:0.5px; color:#0b1220; font-weight: 800; }
    .muted { color:#475569; font-size:11px; margin-top:2px; }

    .qr-holder {
      width:86px;
      height:86px;
      border-radius:4px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fff;
      padding:2px;
    }

    .title {
      text-align:center;
      font-weight:700;
      font-size:15px;
      letter-spacing:1px;
      margin: 4px 0 8px;
      padding:5px 0;
      background:#f1f5f9;
      color:#0b3d91;
      border-radius:4px;
      text-transform: uppercase;
    }

    .meta { display:flex; justify-content:space-between; gap:12px; margin-bottom:8px; border-bottom: 1px dotted #e6eef6; padding-bottom: 6px; }
    
    .section { display:flex; gap:12px; margin-bottom:8px; }
    .box { flex:1; padding:8px; border-radius:4px; background:#f8fafc; border:1px solid #eef2f9; }
    .box h4 { margin:0 0 3px 0; font-size:11.5px; color:#0b1220; text-transform: uppercase; }

    table.items { width:100%; border-collapse: collapse; margin-bottom:8px; font-size:11px; }
    table.items thead th {
      text-align:center;
      padding:6px 4px;
      background:#eef2f7; 
      font-weight:700;
      border-bottom: 2px solid #e2e8f0;
      color:#0b1220;
    }
        table.items td { padding:5px 4px; vertical-align:middle; color:#0f172a; border-bottom:1px solid #f1f5f9; }
    table.items td.right { text-align:right; }

    table, thead, tbody, tr, td, th { page-break-inside: avoid; }

    .bottom-split { display: flex; gap: 16px; align-items: flex-start; }
    .bottom-left { flex: 1; }
    
    .totals { width:320px; margin-left:auto; border:1px solid #eef2f7; border-radius:4px; overflow:hidden; }
    .totals .row { display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; background:#fff; color:#0b1220; }
    .totals .row.total { font-weight:800; background:#f1f5f9; border-bottom: none; }

    .sign-block { 
      display:flex; 
      justify-content:space-between; 
      gap:20px; 
      align-items:flex-end; 
      margin-top: 0px;
      padding-top: 4px; 
      border-top: 1px solid #f1f5f9;
    }
    .signature-line { border-top:1.5px solid #0b1220; width:160px; padding-top:4px; font-weight:700; font-size:10.5px; text-align:center; margin-bottom: 2px;}

    .phonepe-box { width:105px; border:1px solid #eef2f7; border-radius:6px; padding:4px; text-align:center; background:#fff; }
    .phonepe-box h5 { margin:0 0 3px 0; font-size:10.5px; color:#0b1220; font-weight: 700; }

    .density-compact table.items td, .density-compact table.items th { padding:4px 3px; font-size:10px; }
    .density-compact .box { padding:5px; }
    .density-compact .totals .row { padding:5px 8px; font-size:10px; }
    
    .density-ultra table.items td, .density-ultra table.items th { padding:2px 2px; font-size:9.5px; }
    .density-ultra .box { padding:4px; }
    .density-ultra body, .density-ultra .container { font-size:10px; }
    .density-ultra .totals .row { padding:4px 5px; font-size:9.5px; }
    .density-ultra .sign-block { margin-top: 0; padding-top: 2px; }
    .density-ultra .signature-line { padding-top: 2px; }

    @media print { .container { margin:0 auto; border:none; padding:0 5px; } }
  </style>
</head>
<body class="${densityClass}">
  <div class="container">
    <div class="header">
      <div class="company">
        <h1>MUSTAK ISHAMOHAMMAD KHAN</h1>
        <div class="muted" style="font-weight:500; color:#334155;">(An expert in plaster of paris (POP))</div>
        <div class="muted">C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat</div>
        <div style="margin-top:4px;font-size:11px;">
          <strong>Mob:</strong> 9979174216 &nbsp;&nbsp;<strong>Email:</strong> mustakkhan.mk550@gmail.com
        </div>
        <div style="margin-top:2px;font-size:11px;"><strong>GSTIN:</strong> 24BEQPK9997B1ZW</div>
      </div>
      <div class="qr-holder" title="Invoice QR">${qrHtml}</div>
    </div>

    <div class="title">TAX INVOICE</div>

    <div class="meta">
      <div><strong>Invoice No:</strong> ${invoice.invoiceNumber ?? 'N/A'}</div>
      <div style="text-align:right"><strong>Invoice Date:</strong> ${invoiceDate}</div>
    </div>

    <div class="section">
      <div class="box">
        <h4>Company Details</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.25;">
          <strong>Name:</strong> MUSTAK ISHAMOHAMMAD KHAN<br/>
          <strong>Address:</strong> C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat<br/>
          <strong>Mobile:</strong> 9979174216<br/>
          <strong>Email:</strong> mustakkhan.mk550@gmail.com<br/>
          <strong>GSTIN:</strong> 24BEQPK9997B1ZW
        </div>
      </div>
      <div class="box">
        <h4>Bill To</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.25;">
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
          <th style="width:44%;">Product Description</th>
          <th style="width:5%;">HSN</th>
          <th style="width:5%;">QTY.</th>
          <th style="width:5%;">Rate</th>
          <th style="width:8%;">Taxable Value</th>
          <th style="width:8%;">GST(18%)</th>
          <th style="width:8%;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="bottom-split">
      <div class="bottom-left">
        <div style="font-size:11px;font-weight:700;color:#0b1220;text-transform:uppercase;margin-bottom:2px;">Bank Details</div>
        <div style="font-size:10.5px;color:#374151;line-height:1.25;">
          Bank Name: SBI BANK-SHAHALAM GATE<br/>
          A/C: 30391756262 &nbsp;|&nbsp; IFSC: SBIN0003046 &nbsp;|&nbsp; PAN No: BEQPK9997B
        </div>
        ${amountWordsHtml}
        <div style="margin-top:4px;font-size:9.5px;color:#374151;text-transform:uppercase;">
          <strong>Terms &amp; Conditions:</strong>${termsContent}
        </div>
        <div style="font-size:9.5px;color:#475569;margin-top:3px;">${notesHtml}${certHtml}</div>
      </div>
      <div class="totals" role="note" aria-label="Tax Summary">
        <div class="row"><div>Total Amount Before Tax</div><div>₹${totalBeforeTax}</div></div>
        <div class="row"><div>CGST (9%)</div><div>₹${cgst}</div></div>
        <div class="row"><div>SGST (9%)</div><div>₹${sgst}</div></div>
        <div class="row"><div>IGST (18%)</div><div>₹${igst}</div></div>
        <div class="row"><div>Total Tax Amount</div><div>₹${totalTaxAmount}</div></div>
        <div class="row total"><div>Total Amount After Tax</div><div>₹${totalAfterTax}</div></div>
      </div>
    </div>

     <div class="sign-block">
      <div style="text-align:center;">
        <div style="height: 10px;"></div> <div class="signature-line">Customer Signature</div>
      </div>
      <div style="text-align:center;">
        <div style="height: 10px;"></div> <div class="signature-line">Authorised Signatory</div>
      </div>

      <div
        class="phonepe-box"
        title="Pay via PhonePe"
        style="${showPhonePe ? '' : 'border:none;background:transparent;padding:4px;'}"
        aria-hidden="${showPhonePe ? 'false' : 'true'}"
      >
        ${showPhonePe ? `<h5>Pay via PhonePe</h5>${phonePeHtml}` : phonePeHtml}
      </div>
    </div>

    <div style="text-align:center;margin-top:4px;font-size:9px;color:#94a3b8;">This is a computer generated invoice.</div>
  </div>
</body>
</html>`;
}

/* ---------- PUPPETEER HELPERS ---------- */

async function waitForImagesLoad(page: Page, timeoutMs = 6000): Promise<void> {
  await page.evaluate(
    (timeout: number) =>
      new Promise<void>((resolve) => {
        const imgs = Array.from(document.images || []);
        if (!imgs.length) return resolve();
        let settled = 0;
        const done = () => {
          settled++;
          if (settled >= imgs.length) resolve();
        };
        imgs.forEach((img) => {
          const htmlImg = img as HTMLImageElement;
          if (htmlImg.complete) return done();
          const onDone = () => {
            htmlImg.removeEventListener('load', onDone);
            htmlImg.removeEventListener('error', onDone);
            done();
          };
          htmlImg.addEventListener('load', onDone);
          htmlImg.addEventListener('error', onDone);
        });
        setTimeout(() => resolve(), timeout);
      }),
    timeoutMs,
  );
}

/* ---------- ROUTE HANDLER ---------- */

// Updated GET function to accept Request to access search params
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // 1. Parse the URL to look for query parameters (e.g. ?id=...)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<GstInvoice>(COLLECTION_NAME);

    let invoice: GstInvoice | null = null;

    if (id) {
        // 2a. If an ID is provided, validate it and search by ID
        if (!ObjectId.isValid(id)) {
             return NextResponse.json({ message: 'Invalid Invoice ID provided' }, { status: 400 });
        }
        invoice = await collection.findOne({ _id: new ObjectId(id) });
    } else {
        // 2b. If NO ID is provided, fallback to the original behavior (get the most recent one)
        const latest = await collection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
        invoice = latest.length > 0 ? latest[0] : null;
    }

    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found.' }, { status: 404 });
    }

    const html = buildInvoiceHtml(invoice);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    const a4WidthPx = 794;
    const a4HeightPx = 1123;
    
    const page = await browser.newPage();
    await page.setViewport({ width: a4WidthPx, height: a4HeightPx });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await waitForImagesLoad(page, 6000);

    const measureContentHeight = async (): Promise<number> =>
      page.evaluate(() => {
        const el = document.documentElement || document.body;
        return Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
      });

    let contentHeightPx = await measureContentHeight();
    const verticalMarginsPx = 5 + 5;
    const availableHeight = a4HeightPx - verticalMarginsPx;

    const extraDensityClasses: string[] = ['density-tight', 'density-micro'];
    if (contentHeightPx > availableHeight) {
      for (const density of extraDensityClasses) {
        await page.evaluate((densityClass: string) => {
          if (!document.body.classList.contains(densityClass)) {
            document.body.classList.add(densityClass);
          }
        }, density);
        await waitForImagesLoad(page, 500);
        contentHeightPx = await measureContentHeight();
        if (contentHeightPx <= availableHeight) break;
      }
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '5px', right: '10px', bottom: '5px', left: '10px' },
      scale: 1,
    });

    await browser.close();
    const fileName = `tax-invoice-${invoice.invoiceNumber || 'invoice'}.pdf`;
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    ) as ArrayBuffer;
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Failed to generate PDF: ${message}` },
      { status: 500 },
    );
  } finally {
      }
}