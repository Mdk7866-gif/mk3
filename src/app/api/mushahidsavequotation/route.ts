// src/app/api/mushahidsavequotation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import QRCode from 'qrcode';
import clientPromise from '@/lib/mongodb';

interface Item {
  no: number;
  description: string;
  hsn?: string;
  quantity: number;
  rate: number;
}

interface QuotationData {
  date: string;
  clientName: string;
  clientAddress: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  notes?: string;
  items: Item[];
}

const dbName = 'mk3';
const collectionName = 'mushahidquotation';


// QT-YYYY-NNN generator
async function generateQuotationNumber(db: Db, year: string): Promise<string> {
  const collection = db.collection(collectionName);

  const latest = await collection
    .find({ invoiceNumber: { $regex: `^QT-${year}-` } })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();

  let seq = 1;
  if (latest.length > 0) {
    const lastSeq = parseInt(latest[0].invoiceNumber.split('-')[2], 10);
    seq = lastSeq + 1;
  }

  return `QT-${year}-${seq.toString().padStart(3, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: QuotationData = await req.json();

    // Validation
    if (
      !body.date ||
      !body.clientName ||
      !body.clientAddress ||
      (!body.email && !body.mobile) ||
      !body.items ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(body.date)) {
      return NextResponse.json(
        { message: 'Invalid date format. Use DD/MM/YYYY' },
        { status: 400 }
      );
    }

    for (const item of body.items) {
      if (!item.no || !item.description || !item.quantity || !item.rate) {
        return NextResponse.json(
          { message: 'Each item must have no, description, quantity, and rate' },
          { status: 400 }
        );
      }
    }

    const client = await clientPromise;
    const db = client.db(dbName);

    const year = body.date.split('/')[2];
    const quotationNumber = await generateQuotationNumber(db, year);

    const issuer = 'mushahid';
    const documentType = 'quotation';
    const verifyRoute = 'verifyqrcodefrontendmushahid';

    const baseUrl = process.env.WEBSITE_DEPLOYEMENT || 'http://localhost:3000';

    const qrCodeDataURL = await QRCode.toDataURL(
      `${baseUrl}/${verifyRoute}?invoiceNumber=${quotationNumber}&type=${documentType}`
    );

    // ✅ CLEAN DOCUMENT (NO pdfLink)
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

    
    return NextResponse.json(
      {
        message: 'Quotation saved successfully',
        quotationId: result.insertedId.toString(),
        invoiceNumber: quotationNumber,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error saving quotation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Failed to save quotation: ${errorMessage}` },
      { status: 500 }
    );
  }
}