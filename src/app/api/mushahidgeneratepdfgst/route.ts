import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion, Collection } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';
const collectionName = 'mushahidgst';

// Create a MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Define interfaces for better type safety
interface InvoiceItem {
  no: number;
  description: string;
  hsn?: string;
  quantity: number;
  rate: number;
  taxableAmount: number;
  gst: number;
  totalAmount: number;
}

interface Invoice {
  _id: string; // Assuming MongoDB ObjectId is represented as a string
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientAddress: string;
  email: string;
  mobile: string;
  gstin: string;
  qrCode: string; // Base64 string for the QR code
  items: InvoiceItem[];
  totalAmountBeforeTax: number;
  cgst: number;
  sgst: number;
  totalTaxAmount: number;
  totalAmountAfterTax: number;
  amountInWords: string;
  createdAt: Date; // Assuming a Date object for sorting
  pdfLink?: string; // Optional, as it's added later
}

export async function POST(req: NextRequest) {
  let pdfMake: any;
  let isConnected = false; // Flag to track connection status

  try {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

    pdfMake = pdfMakeModule.default;
    pdfMake.vfs = (pdfFontsModule.default as any);

    // Connect to MongoDB
    await client.connect();
    isConnected = true; // Set flag after successful connection
    const db = client.db(dbName);
    const collection: Collection<Invoice> = db.collection<Invoice>(collectionName);

    // Fetch the newest entry (most recent by createdAt)
    const newestInvoice = await collection.find().sort({ createdAt: -1 }).limit(1).toArray();

    if (newestInvoice.length === 0) {
      return NextResponse.json(
        { message: 'No GST invoices found in the database.' },
        { status: 404 }
      );
    }

    const invoice: Invoice = newestInvoice[0];

    // Read UPI QR image from public folder (convert to base64)
    const upiQRPath = path.join(process.cwd(), 'public', 'upi-qr.png');
    let upiQRBase64 = '';
    if (fs.existsSync(upiQRPath)) {
      const upiQRBuffer = fs.readFileSync(upiQRPath);
      upiQRBase64 = `data:image/png;base64,${upiQRBuffer.toString('base64')}`;
    } else {
      upiQRBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    }

    const docDefinition = {
      content: [
        {
          columns: [
            { text: '', width: 100, alignment: 'left' },
            {
              stack: [
                { text: 'MUSTAK KHAN', style: 'header', alignment: 'right' },
                { text: 'All type of painting design', style: 'subheader', alignment: 'right' },
                { text: 'C-207, Majan residency no. alkapuri corner, (M) 9898317216 email: mustakmk3@gmail.com', style: 'address', alignment: 'right' },
                { text: 'GSTIN : 24BEFPK9998B1Z5', style: 'gstin', alignment: 'right' },
              ],
              alignment: 'right',
            },
          ],
          margin: [0, 0, 0, 20],
        },
        {
          columns: [
            { image: invoice.qrCode, width: 80, alignment: 'left', margin: [0, 0, 20, 0] },
            { image: upiQRBase64, width: 80, alignment: 'right' },
          ],
          margin: [0, 0, 0, 20],
        },
        { text: 'TAX INVOICE', style: 'title', alignment: 'center', margin: [0, 0, 0, 20] },
        {
          columns: [
            { text: `Invoice No : ${invoice.invoiceNumber}`, style: 'info' },
            { text: `Invoice Date: ${invoice.date}`, style: 'info', alignment: 'right' },
          ],
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                {
                  stack: [
                    { text: 'Company Details', bold: true },
                    { text: `Name: MUSTAK KHAN` },
                    { text: `Address: C-207, Majan residency no. alkapuri corner` },
                    { text: `Email: mustakmk3@gmail.com` },
                    { text: `Mobile: 9898317216` },
                    { text: `GSTIN: 24BEFPK9998B1Z5` },
                  ],
                },
                {
                  stack: [
                    { text: 'Bill To Party', bold: true },
                    { text: `Name: ${invoice.clientName}` },
                    { text: `Address: ${invoice.clientAddress}` },
                    { text: `Email: ${invoice.email}` },
                    { text: `Mobile: ${invoice.mobile}` },
                    { text: `GSTIN: ${invoice.gstin}` },
                  ],
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'], // 8 columns
            body: [
              [
                { text: 'S.No.', style: 'tableHeader' },
                { text: 'Product/Description', style: 'tableHeader' },
                { text: 'HSN', style: 'tableHeader' },
                { text: 'Qty.', style: 'tableHeader' },
                { text: 'Rate', style: 'tableHeader' },
                { text: 'Taxable Value', style: 'tableHeader' },
                { text: 'GST (18%)', style: 'tableHeader' },
                { text: 'Total', style: 'tableHeader' },
              ],
              ...invoice.items.map((item: InvoiceItem) => [
                { text: item.no.toString(), alignment: 'center' },
                { text: item.description, margin: [0, 2, 0, 2] },
                { text: item.hsn || '-', alignment: 'center' },
                { text: item.quantity.toString(), alignment: 'right' },
                { text: `₹${item.rate.toFixed(2)}`, alignment: 'right' },
                { text: `₹${item.taxableAmount.toFixed(2)}`, alignment: 'right' },
                { text: `₹${item.gst.toFixed(2)}`, alignment: 'right' },
                { text: `₹${item.totalAmount.toFixed(2)}`, alignment: 'right' },
              ]),
              [
                { text: 'Total', colSpan: 5, bold: true, alignment: 'right' }, // Spans 5 columns (S.No. to Rate)
                {}, {}, {}, {}, // These are the 4 empty cells "covered" by colSpan: 5
                { text: `₹${invoice.totalAmountBeforeTax.toFixed(2)}`, bold: true, alignment: 'right' }, // column 6 (Taxable Value)
                { text: '', alignment: 'right' }, // column 7 (GST)
                { text: `₹${invoice.totalAmountAfterTax.toFixed(2)}`, bold: true, alignment: 'right' }, // column 8 (Total)
              ],
            ],
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#e3f2fd' : null),
          },
          margin: [0, 0, 0, 20],
        },
        // Tax Breakdown
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'Total Amount Before Tax:', bold: true },
                { text: `₹${invoice.totalAmountBeforeTax.toFixed(2)}`, alignment: 'right' },
              ],
              [
                { text: `CGST (9%):`, bold: true },
                { text: `₹${invoice.cgst.toFixed(2)}`, alignment: 'right' },
              ],
              [
                { text: `SGST (9%):`, bold: true },
                { text: `₹${invoice.sgst.toFixed(2)}`, alignment: 'right' },
              ],
              [
                { text: 'Total Tax Amount:', bold: true },
                { text: `₹${invoice.totalTaxAmount.toFixed(2)}`, alignment: 'right', fillColor: '#ffebee' },
              ],
              [
                { text: 'Total Amount After Tax:', bold: true },
                { text: `₹${invoice.totalAmountAfterTax.toFixed(2)}`, alignment: 'right', fillColor: '#e8f5e8' },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20],
        },
        // Amount in Words
        { text: `Amount in Words: ${invoice.amountInWords}`, style: 'amountInWords', margin: [0, 0, 0, 20] },
        // Bank Details - *Potential issue here too, review later if needed*
        {
          table: {
            widths: ['*', 'auto'], // 2 columns
            body: [
              [
                { text: 'Bank Details:', bold: true },
                { text: 'Total Amount Before Tax:', alignment: 'right' },
              ],
              [
                { text: 'Bank Name: SBI Bank - Shahalam', margin: [0, 2, 0, 0] },
                { text: `CGST (9%):`, alignment: 'right' },
              ],
              [
                { text: 'A/c No: 3081756262', margin: [0, 2, 0, 0] },
                { text: `SGST (9%):`, alignment: 'right' }, // You had a typo 'right`' here
              ],
              [
                { text: 'Bank IFSC: SBIN0008046', margin: [0, 2, 0, 0] },
                { text: 'Total Tax Amount:', alignment: 'right', fillColor: '#ffebee' },
              ],
              [
                { text: 'UPI QR Code:', margin: [0, 2, 0, 0] },
                { text: 'Total Amount After Tax:', alignment: 'right', fillColor: '#e8f5e8' },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20],
        },
        // Terms and Conditions
        {
          text: 'Terms & conditions: 1. Payment due within 30 days. 2. All disputes subject to Ahmedabad jurisdiction.',
          style: 'terms',
          margin: [0, 0, 0, 10],
        },
        // Notes
        {
          text: 'Notes: This is a computer generated invoice.',
          style: 'notes',
          margin: [0, 0, 0, 0],
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, color: '#2c3e50' },
        subheader: { fontSize: 10, italics: true },
        address: { fontSize: 9 },
        gstin: { fontSize: 9, bold: true },
        title: { fontSize: 20, bold: true, color: '#2c3e50' },
        info: { fontSize: 12 },
        tableHeader: { bold: true, fontSize: 10, color: 'white', fillColor: '#3498db' },
        amountInWords: { fontSize: 12, italics: true },
        terms: { fontSize: 9 },
        notes: { fontSize: 9, italics: true },
      },
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 40],
      defaultStyle: { fontSize: 9 },
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        if (buffer) resolve(buffer);
        else reject(new Error('Failed to generate PDF buffer'));
      });
    });

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'mk3/mushahid/gst',
          public_id: `gst-invoice-${invoice.invoiceNumber}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(pdfBuffer);
    });

    const pdfLink = (uploadResult as any).secure_url;

    const updateResult = await collection.updateOne(
      { _id: invoice._id },
      { $set: { pdfLink } }
    );

    if (!updateResult.acknowledged) {
      return NextResponse.json(
        { message: 'Failed to update PDF link in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'GST invoice PDF generated and uploaded successfully',
        pdfLink,
        invoiceNumber: invoice.invoiceNumber,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error generating GST invoice PDF:', error);
    return NextResponse.json(
      { message: `Failed to generate PDF: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    if (isConnected) {
      await client.close();
    }
  }
}