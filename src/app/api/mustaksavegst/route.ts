// src/app/api/mustaksavegst/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import QRCode from 'qrcode';

// Define the expected shape of a single item
interface Item {
  no: number;
  description: string;
  hsn?: string; // Optional
  quantity: number;
  rate: number;
  taxableAmount: number;
  gst: number; // 18%
  totalAmount: number;
}

// Define the expected shape of the GST invoice data
interface GstInvoiceData {
  date: string; // Format: DD/MM/YYYY
  clientName: string;
  clientAddress: string;
  email?: string; // Optional
  mobile?: string; // Optional
  gstin?: string; // Optional
  notes?: string; // Optional
  items: Item[];
  totalAmountBeforeTax: number;
  cgst: number; // 9%
  sgst: number; // 9%
  totalTaxAmount: number;
  totalAmountAfterTax: number;
  amountInWords: string;
}

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';
const collectionName = 'mustakgst';

// Create a MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Generate invoice number in format INV-YYYY-NNN
async function generateInvoiceNumber(db: Db, year: string): Promise<string> {
  const collection = db.collection(collectionName);

  // Find the latest invoice for the given year
  const latestInvoice = await collection
    .find({ invoiceNumber: { $regex: `^INV-${year}-` } })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();

  let sequence = 1;
  if (latestInvoice.length > 0) {
    const lastInvoiceNumber = latestInvoice[0].invoiceNumber; // e.g., INV-2025-001
    const lastSequence = parseInt(lastInvoiceNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  // Pad sequence to three digits (e.g., 001, 002, etc.)
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `INV-${year}-${paddedSequence}`;
}

// POST handler for the /api/mustaksavegst endpoint
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body: GstInvoiceData = await req.json();

    // Validate required fields
    if (
      !body.date ||
      !body.clientName ||
      !body.clientAddress ||
      (!body.email && !body.mobile) || // At least one of email or mobile required
      !body.items ||
      body.items.length === 0 ||
      body.totalAmountBeforeTax === undefined ||
      body.cgst === undefined ||
      body.sgst === undefined ||
      body.totalTaxAmount === undefined ||
      body.totalAmountAfterTax === undefined ||
      !body.amountInWords
    ) {
      return NextResponse.json(
        {
          message:
            'Missing required fields: date, clientName, clientAddress, at least one of email or mobile, items, totalAmountBeforeTax, cgst, sgst, totalTaxAmount, totalAmountAfterTax, and amountInWords are required',
        },
        { status: 400 },
      );
    }

    // Validate date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { message: 'Invalid date format. Use DD/MM/YYYY' },
        { status: 400 },
      );
    }

    // Validate items
    for (const item of body.items) {
      if (
        !item.no ||
        !item.description ||
        !item.quantity ||
        !item.rate ||
        item.taxableAmount === undefined ||
        item.gst === undefined ||
        item.totalAmount === undefined
      ) {
        return NextResponse.json(
          {
            message:
              'Each item must have no, description, quantity, rate, taxableAmount, gst, and totalAmount',
          },
          { status: 400 },
        );
      }
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);

    // Extract year from date (DD/MM/YYYY -> YYYY)
    const year = body.date.split('/')[2];

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(db, year);

    const issuer = 'mustak';
    const documentType = 'gst';
    const verifyRoute = 'verifyqrcodefrontendmustak';

    const baseUrl = process.env.WEBSITE_DEPLOYEMENT || 'http://localhost:3000';

    // Generate QR code (encoding the verify endpoint URL with invoiceNumber)
    const qrCodeDataURL = await QRCode.toDataURL(
      `${baseUrl}/${verifyRoute}?invoiceNumber=${invoiceNumber}&type=${documentType}`,
    );

    // ✅ Prepare the document to insert (NO pdfLink)
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
      totalAmountBeforeTax: body.totalAmountBeforeTax,
      cgst: body.cgst,
      sgst: body.sgst,
      totalTaxAmount: body.totalTaxAmount,
      totalAmountAfterTax: body.totalAmountAfterTax,
      amountInWords: body.amountInWords,
      qrCode: qrCodeDataURL,
      createdAt: new Date(),
    };

    const collection = db.collection(collectionName);

    // Insert the document into the mustakgst collection
    const result = await collection.insertOne(document);

    // Close the MongoDB connection
    await client.close();

    return NextResponse.json(
      {
        message: 'GST invoice saved successfully',
        invoiceId: result.insertedId.toString(),
        invoiceNumber,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('Error saving GST invoice to MongoDB:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        message: `Failed to save GST invoice: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}