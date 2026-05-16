import { NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mushahidquotation';

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function GET() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const latestDoc = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (!latestDoc.length) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ items: latestDoc[0].items || [] });
  } catch (error) {
    console.error('Error fetching prefetch data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch prefetch data', error: String(error) },
      { status: 500 }
    );
  }
}
