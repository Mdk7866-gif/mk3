// src/app/api/mustaksavequotation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import QRCode from 'qrcode';

// Define the expected shape of a single item
interface Item {
  no: number;
  description: string;
  hsn?: string; // Optional
  quantity: number;
  rate: number;
}

// Define the expected shape of the quotation data
interface QuotationData {
  date: string; // Format: DD/MM/YYYY
  clientName: string;
  clientAddress: string;
  email?: string; // Optional
  mobile?: string; // Optional
  gstin?: string; // Optional
  notes?: string; // Optional
  items: Item[];
}

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';
const collectionName = 'mustakquotation';

// Create a MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Generate quotation number in format QT-YYYY-NNN
async function generateQuotationNumber(db: any, year: string): Promise<string> {
  const collection = db.collection(collectionName);
  
  // Find the latest quotation for the given year
  const latestQuotation = await collection
    .find({ invoiceNumber: { $regex: `^QT-${year}-` } })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();

  let sequence = 1;
  if (latestQuotation.length > 0) {
    const lastQuotationNumber = latestQuotation[0].invoiceNumber; // e.g., QT-2025-001
    const lastSequence = parseInt(lastQuotationNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  // Pad sequence to three digits (e.g., 001, 002, etc.)
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `QT-${year}-${paddedSequence}`;
}

// POST handler for the /api/mustaksavequotation endpoint
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body: QuotationData = await req.json();

    // Validate required fields
    if (
      !body.date ||
      !body.clientName ||
      !body.clientAddress ||
      (!body.email && !body.mobile) || // At least one of email or mobile required
      !body.items ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { message: 'Missing required fields: date, clientName, clientAddress, at least one of email or mobile, and items are required' },
        { status: 400 }
      );
    }

    // Validate date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { message: 'Invalid date format. Use DD/MM/YYYY' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of body.items) {
      if (
        !item.no ||
        !item.description ||
        !item.quantity ||
        !item.rate
      ) {
        return NextResponse.json(
          { message: 'Each item must have no, description, quantity, and rate' },
          { status: 400 }
        );
      }
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);

    // Extract year from date (DD/MM/YYYY -> YYYY)
    const year = body.date.split('/')[2];

    // Generate quotation number
    const quotationNumber = await generateQuotationNumber(db, year);

    const issuer = 'mustak';
    const documentType = 'quotation';
    const verifyRoute = 'verifyqrcodefrontendmustak';

    // Generate QR code (encoding the verify endpoint URL with quotationNumber)
    const qrCodeDataURL = await QRCode.toDataURL(
      `http://localhost:3000/${verifyRoute}?invoiceNumber=${quotationNumber}&type=${documentType}`
    );

    // Dummy PDF link (replace with actual Cloudinary link later)
    const pdfLink = `https://res.cloudinary.com/your-cloud-name/image/upload/v${Date.now()}/dummy-quotation-${quotationNumber}.pdf`;

    // Prepare the document to insert
    const document = {
      invoiceNumber: quotationNumber,
      issuer,
      documentType,
      date: body.date,
      clientName: body.clientName,
      clientAddress: body.clientAddress,
      email: body.email || '',
      mobile: body.mobile || '',
      gstin: body.gstin || '', // Default to empty string if not provided
      notes: body.notes || '', // Default to empty string if not provided
      items: body.items,
      qrCode: qrCodeDataURL, // Base64 QR code image
      pdfLink,
      createdAt: new Date(),
    };

    const collection = db.collection(collectionName);

    // Insert the document into the mustakquotation collection
    const result = await collection.insertOne(document);

    // Close the MongoDB connection
    await client.close();

    return NextResponse.json(
      {
        message: 'Quotation saved successfully',
        quotationId: result.insertedId.toString(),
        invoiceNumber: quotationNumber,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving quotation to MongoDB:', error);
    return NextResponse.json(
      { message: `Failed to save quotation: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}