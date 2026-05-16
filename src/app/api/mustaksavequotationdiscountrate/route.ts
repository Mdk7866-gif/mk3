// src/app/api/mustaksavequotationdiscountrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import QRCode from 'qrcode';

// Define the expected shape of a single item
interface DiscountItem {
  no: number;
  description: string;
  hsn?: string;
  quantity: number;
  originalRate: number;
  discountRate: number;
}

// Define the expected shape of the quotation data
interface QuotationDiscountData {
  date: string; // Format: DD/MM/YYYY
  clientName: string;
  clientAddress: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  notes?: string;
  items: DiscountItem[];
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';
const collectionName = 'mustakquotationdiscountrate';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Generate quotation number in format QTDR-YYYY-NNN
async function generateQuotationNumber(db: Db, year: string): Promise<string> {
  const collection = db.collection(collectionName);
  const latestQuotation = await collection
    .find({ invoiceNumber: { $regex: `^QTDR-${year}-` } })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();

  let sequence = 1;
  if (latestQuotation.length > 0) {
    const lastQuotationNumber = latestQuotation[0].invoiceNumber as string;
    const lastSequence = parseInt(lastQuotationNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  const paddedSequence = sequence.toString().padStart(3, '0');
  return `QTDR-${year}-${paddedSequence}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: QuotationDiscountData = await req.json();

    // Validate required fields
    if (
      !body.date ||
      !body.clientName ||
      !body.clientAddress ||
      (!body.email && !body.mobile) ||
      !body.items ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Missing required fields: date, clientName, clientAddress, at least one of email or mobile, and items are required',
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
        !item.originalRate ||
        !item.discountRate
      ) {
        return NextResponse.json(
          {
            message:
              'Each item must have no, description, quantity, originalRate, and discountRate',
          },
          { status: 400 },
        );
      }
    }

    await client.connect();
    const db = client.db(dbName);

    const year = body.date.split('/')[2];
    const quotationNumber = await generateQuotationNumber(db, year);

    const issuer = 'mustak';
    const documentType = 'quotationdiscountrate';
    const verifyRoute = 'verifyqrcodefrontendmustak';

    const baseUrl = process.env.WEBSITE_DEPLOYEMENT || 'http://localhost:3000';

    const qrCodeDataURL = await QRCode.toDataURL(
      `${baseUrl}/${verifyRoute}?invoiceNumber=${quotationNumber}&type=${documentType}`,
    );

    const document = {
      invoiceNumber: quotationNumber,
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
      qrCode: qrCodeDataURL,
      createdAt: new Date(),
    };

    const collection = db.collection(collectionName);
    const result = await collection.insertOne(document);

    await client.close();

    return NextResponse.json(
      {
        message: 'Quotation (discount rate) saved successfully',
        quotationId: result.insertedId.toString(),
        invoiceNumber: quotationNumber,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('Error saving discount rate quotation to MongoDB:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Failed to save quotation: ${errorMessage}` },
      { status: 500 },
    );
  }
}
