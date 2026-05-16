//src/app/api/verifyqrcode/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';

const COLLECTION_MAP: Record<string, Record<string, string>> = {
  mushahid: {
    gst: 'mushahidgst',
    invoice: 'mushahidinvoice',
    quotation: 'mushahidquotation',
    quotationdiscountrate: 'mushahidquotationdiscountrate',
  },
  mustak: {
    gst: 'mustakgst',
    invoice: 'mustakinvoice',
    quotation: 'mustakquotation',
    quotationdiscountrate: 'mustakquotationdiscountrate',
  },
};

// Create a MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// GET handler for the /api/verifyqrcode endpoint
export async function GET(req: NextRequest) {
  const invoiceNumber = req.nextUrl.searchParams.get('invoiceNumber');
  const issuer = req.nextUrl.searchParams.get('issuer') || undefined;
  const requestedType = req.nextUrl.searchParams.get('type') || undefined;

  if (!invoiceNumber) {
    return NextResponse.json(
      { message: 'Invoice number is required in query parameter: ?invoiceNumber=INV-YYYY-NNN' },
      { status: 400 }
    );
  }

  try {
    await client.connect();
    const db = client.db(dbName);

    const searchIssuers = issuer ? [issuer] : Object.keys(COLLECTION_MAP);
    let resolvedInvoice: Record<string, unknown> | null = null;
    let resolvedIssuer = issuer;
    let resolvedType = requestedType;

    for (const issuerKey of searchIssuers) {
      const collectionsForIssuer = COLLECTION_MAP[issuerKey];
      if (!collectionsForIssuer) {
        continue;
      }

      const searchTypes = requestedType ? [requestedType] : Object.keys(collectionsForIssuer);
      for (const typeKey of searchTypes) {
        const collectionName = collectionsForIssuer[typeKey];
        if (!collectionName) {
          continue;
        }
        const collection = db.collection(collectionName);
        const invoice = await collection.findOne({ invoiceNumber });
        if (invoice) {
          resolvedInvoice = invoice;
          resolvedIssuer = issuerKey;
          resolvedType = typeKey;
          break;
        }
      }

      if (resolvedInvoice) {
        break;
      }
    }

    if (!resolvedInvoice) {
      return NextResponse.json(
        { message: `Invoice with number ${invoiceNumber} not found.` },
        { status: 404 }
      );
    }

    const publicInvoice = { ...(resolvedInvoice as Record<string, unknown>) };
    delete (publicInvoice as Record<string, unknown>)._id;

    const response = {
      verified: true,
      message: `Invoice verification successful. The following details have been confirmed from our records:`,
      issuer: resolvedIssuer,
      documentType: resolvedType,
      ...publicInvoice,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error verifying QR code/invoice:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Verification failed: ${message}` },
      { status: 500 }
    );
  } finally {
    await client.close().catch(() => {});
  }
}