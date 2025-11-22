// src/app/api/mushahidsaveinvoice/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import QRCode from 'qrcode';

// Define the expected shape of a single item
interface Item {
  no: number;
  description: string;
  hsn?: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Define the expected shape of the invoice data
interface InvoiceData {
  date: string;
  clientName: string;
  clientAddress: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  notes?: string;
  items: Item[];
  totalAmount: number;
  amountInWords: string;
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';
const collectionName = 'mushahidinvoice';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Generate invoice number INV-YYYY-NNN
async function generateInvoiceNumber(db: any, year: string): Promise<string> {
  const collection = db.collection(collectionName);

  const latest = await collection
    .find({ invoiceNumber: { $regex: `^INV-${year}-` } })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();

  let seq = 1;
  if (latest.length > 0) {
    const lastSeq = parseInt(latest[0].invoiceNumber.split('-')[2], 10);
    seq = lastSeq + 1;
  }

  return `INV-${year}-${seq.toString().padStart(3, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: InvoiceData = await req.json();

    // Required validation
    if (
      !body.date ||
      !body.clientName ||
      !body.clientAddress ||
      (!body.email && !body.mobile) ||
      !body.items ||
      body.items.length === 0 ||
      !body.totalAmount ||
      !body.amountInWords
    ) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Date validation
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(body.date)) {
      return NextResponse.json(
        { message: 'Invalid date format. Use DD/MM/YYYY' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of body.items) {
      if (!item.no || !item.description || !item.quantity || !item.rate || !item.amount) {
        return NextResponse.json(
          { message: 'Each item must have no, description, quantity, rate, and amount' },
          { status: 400 }
        );
      }
    }

    await client.connect();
    const db = client.db(dbName);

    const year = body.date.split('/')[2];
    const invoiceNumber = await generateInvoiceNumber(db, year);

    const issuer = 'mushahid';
    const documentType = 'invoice';
    const verifyRoute = 'verifyqrcodefrontendmushahid';

    const qrCodeDataURL = await QRCode.toDataURL(
      `http://localhost:3000/${verifyRoute}?invoiceNumber=${invoiceNumber}&type=${documentType}`
    );

    // ✅ FINAL CLEAN DOCUMENT (NO pdfLink)
    const document = {
      invoiceNumber,
      issuer,
      documentType,
      date: body.date,
      clientName: body.clientName,
      clientAddress: body.clientAddress,
      email: body.email || '',
      mobile: body.mobile || '',
      gstin: body.gstin || '',
      notes: body.notes || '',
      items: body.items,
      totalAmount: body.totalAmount,
      amountInWords: body.amountInWords,
      qrCode: qrCodeDataURL,
      createdAt: new Date(),
    };

    const collection = db.collection(collectionName);
    const result = await collection.insertOne(document);

    await client.close();

    return NextResponse.json(
      {
        message: 'Invoice saved successfully',
        invoiceId: result.insertedId.toString(),
        invoiceNumber,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    return NextResponse.json(
      { message: `Failed to save invoice: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
