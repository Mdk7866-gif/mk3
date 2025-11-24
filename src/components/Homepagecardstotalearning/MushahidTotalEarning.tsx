// src/components/Homepagecardstotalearning/MushahidTotalEarning.tsx

import clientPromise from '@/lib/mongodb';

type MushahidGstDoc = {
  totalAmountAfterTax: number;
};

type MushahidInvoiceDoc = {
  totalAmount: number;
};

async function getMushahidEarnings(): Promise<{
  gstTotal: number;
  invoiceTotal: number;
}> {
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

  return {
    gstTotal: gstResult[0]?.total ?? 0,
    invoiceTotal: invoiceResult[0]?.total ?? 0,
  };
}

const MushahidTotalEarning = async () => {
  const { gstTotal, invoiceTotal } = await getMushahidEarnings();
  const combinedTotal = gstTotal + invoiceTotal;

  return (
    <div className="group relative w-full max-w-md overflow-hidden rounded-2xl bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.16)] hover:ring-blue-500/40">
      {/* Top header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Client
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            Mushahid
          </h3>
          <p className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
            Total Earnings Overview
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/40">
          <span className="text-lg font-semibold">₹</span>
        </div>
      </div>

      {/* Main number */}
      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Overall Revenue
        </p>
        <p className="mt-1 text-3xl font-semibold text-slate-900">
          ₹
          {combinedTotal.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Combined earnings from GST and simple invoices.
        </p>
      </div>

      {/* Breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs sm:text-sm">
        <div>
          <p className="flex items-center gap-1 font-medium text-slate-600">
            GST Bills
            <span className="rounded-full bg-blue-50 px-2 py-[2px] text-[10px] font-semibold text-blue-700">
              GST
            </span>
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            ₹
            {gstTotal.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1 font-medium text-slate-600">
            Simple Invoices
            <span className="rounded-full bg-emerald-50 px-2 py-[2px] text-[10px] font-semibold text-emerald-700">
              Invoice
            </span>
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            ₹
            {invoiceTotal.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 opacity-80" />
    </div>
  );
};

export default MushahidTotalEarning;
