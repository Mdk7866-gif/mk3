//src/app/api/verifyqrcode/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';

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

// GET handler for the /api/verifyqrcode endpoint
export async function GET(req: NextRequest) {
  try {
    // Extract invoiceNumber from query parameter
    const invoiceNumber = req.nextUrl.searchParams.get('invoiceNumber');
    if (!invoiceNumber) {
      return NextResponse.json(
        { message: 'Invoice number is required in query parameter: ?invoiceNumber=INV-YYYY-NNN' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Query the database for the invoice
    const invoice = await collection.findOne({ invoiceNumber });

    // Close the MongoDB connection
    await client.close();

    if (!invoice) {
      return NextResponse.json(
        { message: `Invoice with number ${invoiceNumber} not found.` },
        { status: 404 }
      );
    }

    // Formal response with invoice details
    const response = {
      verified: true,
      message: `Invoice verification successful. The following details have been confirmed from our records:`,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      clientName: invoice.clientName,
      clientAddress: invoice.clientAddress,
      email: invoice.email,
      mobile: invoice.mobile,
      gstin: invoice.gstin,
      notes: invoice.notes,
      items: invoice.items,
      totalAmountBeforeTax: invoice.totalAmountBeforeTax,
      cgst: invoice.cgst,
      sgst: invoice.sgst,
      totalTaxAmount: invoice.totalTaxAmount,
      totalAmountAfterTax: invoice.totalAmountAfterTax,
      amountInWords: invoice.amountInWords,
      pdfLink: invoice.pdfLink,
      qrCode: invoice.qrCode, // Optional: include if needed for display
      createdAt: invoice.createdAt,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error verifying QR code/invoice:', error);
    return NextResponse.json(
      { message: `Verification failed: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}