// src/components/Homepagecardstotalearning/MushahidTotalEarning.tsx

import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb'; // 👈 change this path/name if needed

type MushahidGstDoc = {
  _id: ObjectId;
  totalAmountAfterTax: number;
};

async function getMushahidTotalEarning(): Promise<number> {
  const client = await clientPromise;
  const db = client.db('mk3');

  // Aggregate all documents and sum totalAmountAfterTax
  const result = await db
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

  return result[0]?.total ?? 0;
}

// ✅ Server component (no "use client")
const MushahidTotalEarning = async () => {
  const totalEarning = await getMushahidTotalEarning();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">
        Mushahid Total Earning
      </h3>
      <p className="mt-2 text-2xl font-semibold text-gray-900">
        ₹
        {totalEarning.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Sum of all invoices (totalAmountAfterTax)
      </p>
    </div>
  );
};

export default MushahidTotalEarning;
