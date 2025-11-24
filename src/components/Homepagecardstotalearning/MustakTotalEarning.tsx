// src/components/Homepagecardstotalearning/MustakTotalEarning.tsx

import clientPromise from '@/lib/mongodb';

type MustakGstDoc = {
  totalAmountAfterTax: number;
};

type MustakInvoiceDoc = {
  totalAmount: number;
};

async function getMustakEarnings(): Promise<{
  gstTotal: number;
  invoiceTotal: number;
}> {
  const client = await clientPromise;
  const db = client.db('mk3');

  // 🧮 Sum of GST invoices -> totalAmountAfterTax
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

  const gstTotal = gstResult[0]?.total ?? 0;

  // 🧮 Sum of normal invoices -> totalAmount
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

  const invoiceTotal = invoiceResult[0]?.total ?? 0;

  return { gstTotal, invoiceTotal };
}

// ✅ Server Component
const MustakTotalEarning = async () => {
  const { gstTotal, invoiceTotal } = await getMustakEarnings();
  const combinedTotal = gstTotal + invoiceTotal;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm w-full max-w-sm">
      <h3 className="text-sm font-medium text-gray-500">
        Mustak Total Earnings
      </h3>

      {/* Combined total */}
      <p className="mt-2 text-3xl font-semibold text-gray-900">
        ₹
        {combinedTotal.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        (GST + Simple Invoice)
      </p>

      {/* Breakdown */}
      <div className="mt-4 space-y-1 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>From GST bills:</span>
          <span className="font-medium">
            ₹
            {gstTotal.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>From simple invoices:</span>
          <span className="font-medium">
            ₹
            {invoiceTotal.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MustakTotalEarning;
