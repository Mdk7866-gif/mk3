import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mustakquotation';


export async function GET() {
  try {
    const client = await clientPromise;
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
