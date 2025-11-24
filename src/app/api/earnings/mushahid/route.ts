import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

type MushahidGstDoc = {
  totalAmountAfterTax: number;
};

type MushahidInvoiceDoc = {
  totalAmount: number;
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('mk3');

    const gstResult = await db
      .collection<MushahidGstDoc>('mushahidgst')
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
      .collection<MushahidInvoiceDoc>('mushahidinvoice')
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
    console.error('Error fetching Mushahid earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}

