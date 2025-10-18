import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Define the expected shape of the invoice data
interface InvoiceData {
  client: {
    clientName: string;
    clientAddress: string;
    [key: string]: any; // Allow additional client fields
  };
  items: Array<{
    description?: string;
    amount?: number;
    [key: string]: any; // Allow additional item fields
  }>;
  totals?: {
    totalAmount?: number;
    [key: string]: any; // Allow additional totals fields (e.g., GST-specific fields)
  };
  type?: string; // Optional field to distinguish between invoice, GST invoice, or quotation
}

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'mk3';
const collectionName = 'mushahidinvoice';

// Create a MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// POST handler for the /api/mushahidsaveinvoice endpoint
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body: InvoiceData = await req.json();

    // Basic validation
    if (!body.client || !body.client.clientName || !body.client.clientAddress || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { message: 'Missing required fields: client details and at least one item are required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Prepare the document to insert
    const document = {
      ...body,
      createdAt: new Date(),
      invoiceId: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate a unique invoice ID
    };

    // Insert the document into the mushahidinvoice collection
    const result = await collection.insertOne(document);

    // Close the MongoDB connection
    await client.close();

    return NextResponse.json(
      {
        message: 'Invoice saved successfully',
        invoiceId: result.insertedId.toString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving invoice to MongoDB:', error);
    return NextResponse.json(
      { message: `Failed to save invoice: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}