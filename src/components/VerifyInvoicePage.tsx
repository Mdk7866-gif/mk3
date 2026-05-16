'use client';

import { useMemo, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type DocumentType = 'gst' | 'invoice' | 'quotation' | 'quotationdiscountrate' | undefined;

interface InvoiceItem {
  no: number;
  description: string;
  hsn?: string;
  quantity: number;
  rate?: number;
  originalRate?: number;
  discountRate?: number;
  taxableAmount?: number;
  gst?: number;
  totalAmount?: number;
  amount?: number;
}

interface InvoiceData {
  verified: boolean;
  message: string;
  issuer?: string;
  documentType?: DocumentType;
  invoiceNumber: string;
  date?: string;
  clientName: string;
  clientAddress: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  notes?: string;
  items?: InvoiceItem[];
  totalAmountBeforeTax?: number;
  cgst?: number;
  sgst?: number;
  totalTaxAmount?: number;
  totalAmountAfterTax?: number;
  totalAmount?: number;
  amountInWords?: string;
  pdfLink?: string;
  qrCode?: string;
  createdAt?: string;
}

interface VerifyInvoicePageProps {
  issuer: 'mushahid' | 'mustak';
  title?: string;
}

const toCurrency = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '—';
  }
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const humanizeDocumentType = (type?: DocumentType) => {
  switch (type) {
    case 'gst':
      return 'GST Invoice';
    case 'invoice':
      return 'Invoice';
    case 'quotation':
      return 'Quotation';
    case 'quotationdiscountrate':
      return 'Quotation (Discount)';
    default:
      return 'Document';
  }
};

export default function VerifyInvoicePage({ issuer, title }: VerifyInvoicePageProps) {
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get('invoiceNumber');
  const documentTypeParam = searchParams.get('type') || undefined;

  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoiceNumber) {
      setError('❌ No invoice number provided in URL');
      setLoading(false);
      return;
    }
    fetchData(invoiceNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNumber, documentTypeParam, issuer]);

  const fetchData = async (invoiceNo: string) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ invoiceNumber: invoiceNo, issuer });
      if (documentTypeParam) {
        query.append('type', documentTypeParam);
      }
      const res = await fetch(`/api/verifyqrcode?${query.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      setData(json);
      setError('');
    } catch (err) {
      console.error(err);
      setError('❌ Failed to fetch invoice data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Memoize items so the reference is stable
  const items = useMemo<InvoiceItem[]>(() => {
    return data?.items ?? [];
  }, [data?.items]);

  // ✅ These now depend on a stable `items` reference
  const hasHsnColumn = useMemo(
    () => items.some((item) => Boolean(item.hsn)),
    [items]
  );
  const hasTaxableColumn = useMemo(
    () => items.some((item) => item.taxableAmount !== undefined),
    [items]
  );
  const hasGstColumn = useMemo(
    () => items.some((item) => item.gst !== undefined),
    [items]
  );
  const hasItemTotalColumn = useMemo(
    () => items.some((item) => item.totalAmount !== undefined),
    [items]
  );
  const hasAmountColumn = useMemo(
    () => items.some((item) => item.amount !== undefined),
    [items]
  );
  const hasDiscountRateColumn = useMemo(
    () => items.some((item) => item.originalRate !== undefined || item.discountRate !== undefined),
    [items]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700 font-medium">
        Loading invoice details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600 font-semibold text-lg text-center px-4">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No invoice data found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-12">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-6 sm:p-10 border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {title || 'Invoice Verified'}
            </h2>
            <p className="text-sm text-gray-600">{data.message}</p>
          </div>
          <div className="text-sm text-gray-600 space-y-0.5">
            <p>
              <b>Issuer:</b>{' '}
              <span className="capitalize">{data.issuer ?? issuer}</span>
            </p>
            <p>
              <b>Document Type:</b> {humanizeDocumentType(data.documentType)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-sm sm:text-base">
          <div className="space-y-1 text-gray-700">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Client Details</h3>
            <p><b>Name:</b> {data.clientName}</p>
            <p><b>Address:</b> {data.clientAddress}</p>
            {data.email && <p><b>Email:</b> {data.email}</p>}
            {data.mobile && <p><b>Mobile:</b> {data.mobile}</p>}
            {data.gstin && <p><b>GSTIN:</b> {data.gstin}</p>}
          </div>

          <div className="space-y-1 text-gray-700">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Document Info</h3>
            <p><b>No:</b> {data.invoiceNumber}</p>
            {data.date && <p><b>Date:</b> {data.date}</p>}
            {data.createdAt && (
              <p>
                <b>Created At:</b>{' '}
                {new Date(data.createdAt).toLocaleString()}
              </p>
            )}
            {data.pdfLink && (
              <a
                href={data.pdfLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline mt-1 inline-block"
              >
                View PDF
              </a>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">#</th>
                  <th className="border px-3 py-2 text-left">Description</th>
                  {hasHsnColumn && <th className="border px-3 py-2 text-center">HSN</th>}
                  <th className="border px-3 py-2 text-center">Qty</th>
                  <th className="border px-3 py-2 text-right">Rate</th>
                  {hasDiscountRateColumn && <th className="border px-3 py-2 text-right">Discount Rate</th>}
                  {hasTaxableColumn && <th className="border px-3 py-2 text-right">Taxable</th>}
                  {hasGstColumn && <th className="border px-3 py-2 text-right">GST</th>}
                  {hasItemTotalColumn && <th className="border px-3 py-2 text-right">Total</th>}
                  {hasAmountColumn && <th className="border px-3 py-2 text-right">Amount</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.no} className="border-b hover:bg-gray-50">
                    <td className="border px-3 py-2">{item.no}</td>
                    <td className="border px-3 py-2">{item.description}</td>
                    {hasHsnColumn && (
                      <td className="border px-3 py-2 text-center">{item.hsn || '—'}</td>
                    )}
                    <td className="border px-3 py-2 text-center">{item.quantity}</td>
                    <td className="border px-3 py-2 text-right">
                       {item.originalRate !== undefined ? (
                         item.originalRate === item.discountRate ? (
                           toCurrency(item.originalRate)
                         ) : (
                           <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.85em', marginRight: 4 }}>
                             {toCurrency(item.originalRate)}
                           </span>
                         )
                       ) : (
                         toCurrency(item.rate)
                       )}
                    </td>
                    {hasDiscountRateColumn && (
                       <td className="border px-3 py-2 text-right font-semibold text-green-700">
                         {item.discountRate !== undefined && item.originalRate !== item.discountRate
                           ? toCurrency(item.discountRate)
                           : '—'}
                       </td>
                     )}
                    {hasTaxableColumn && (
                      <td className="border px-3 py-2 text-right">
                        {toCurrency(item.taxableAmount)}
                      </td>
                    )}
                    {hasGstColumn && (
                      <td className="border px-3 py-2 text-right">
                        {toCurrency(item.gst)}
                      </td>
                    )}
                    {hasItemTotalColumn && (
                      <td className="border px-3 py-2 text-right">
                        {toCurrency(item.totalAmount)}
                      </td>
                    )}
                    {hasAmountColumn && (
                      <td className="border px-3 py-2 text-right">
                        {toCurrency(item.amount)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-2 text-gray-700 text-sm sm:text-base">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Summary</h3>
          {data.documentType === 'gst' ? (
            <>
              <p><b>Amount Before Tax:</b> {toCurrency(data.totalAmountBeforeTax)}</p>
              <p><b>CGST:</b> {toCurrency(data.cgst)}</p>
              <p><b>SGST:</b> {toCurrency(data.sgst)}</p>
              <p><b>Total Tax:</b> {toCurrency(data.totalTaxAmount)}</p>
              <p className="text-xl font-bold mt-2">
                Total After Tax: {toCurrency(data.totalAmountAfterTax)}
              </p>
              {data.amountInWords && <p className="text-gray-600">({data.amountInWords})</p>}
            </>
          ) : data.totalAmount !== undefined ? (
            <>
              <p><b>Total Amount:</b> {toCurrency(data.totalAmount)}</p>
              {data.amountInWords && <p className="text-gray-600">({data.amountInWords})</p>}
            </>
          ) : (
            <p>This quotation does not include final totals.</p>
          )}
          {data.notes && <p className="text-gray-600"><b>Notes:</b> {data.notes}</p>}
        </div>

        <div className="mt-8 flex flex-col items-center">
          {data.verified ? (
            <p className="text-green-600 font-semibold text-lg">
              ✅ Document Verified Successfully
            </p>
          ) : (
            <p className="text-red-600 font-semibold text-lg">
              ❌ Verification Failed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

