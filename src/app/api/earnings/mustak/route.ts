import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

type MustakGstDoc = {
  totalAmountAfterTax: number;
};

type MustakInvoiceDoc = {
  totalAmount: number;
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('mk3');

    const gstResult = await db
      .collection<MustakGstDoc>('mustakgst')
      .aggregate<{ _id: null; total: number }>([
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmountAfterTax' },
          },
        },
      ])
      .toArray();

    const invoiceResult = await db
      .collection<MustakInvoiceDoc>('mustakinvoice')
      .aggregate<{ _id: null; total: number }>([
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      gstTotal: gstResult[0]?.total ?? 0,
      invoiceTotal: invoiceResult[0]?.total ?? 0,
    });
  } catch (error) {
    console.error('Error fetching Mustak earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}


