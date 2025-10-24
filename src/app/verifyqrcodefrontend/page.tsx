"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface InvoiceItem {
  no: number;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  taxableAmount: number;
  gst: number;
  totalAmount: number;
}

interface InvoiceData {
  verified: boolean;
  message: string;
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientAddress: string;
  email: string;
  mobile: string;
  gstin: string;
  items: InvoiceItem[];
  totalAmountBeforeTax: number;
  cgst: number;
  sgst: number;
  totalTaxAmount: number;
  totalAmountAfterTax: number;
  amountInWords: string;
  pdfLink: string;
  createdAt: string;
}

export default function VerifyQRCodeFrontend() {
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get("invoiceNumber");

  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invoiceNumber) {
      fetchData(invoiceNumber);
    } else {
      setError("❌ No invoice number provided in URL");
      setLoading(false);
    }
  }, [invoiceNumber]);

  const fetchData = async (invoiceNo: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/api/verifyqrcode?invoiceNumber=${invoiceNo}`
      );
      if (!res.ok) throw new Error("API request failed");
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err) {
      console.error(err);
      setError("❌ Failed to fetch invoice data");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700 font-medium">
        Loading invoice details...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600 font-semibold text-lg">{error}</p>
      </div>
    );

  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No invoice data found</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-12">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-6 sm:p-10 border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Invoice Verified
            </h2>
            <p className="text-sm text-gray-600">{data.message}</p>
          </div>
        </div>

        {/* Client + Invoice Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1 text-gray-700">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">
              Client Details
            </h3>
            <p><b>Name:</b> {data.clientName}</p>
            <p><b>Address:</b> {data.clientAddress}</p>
            <p><b>Email:</b> {data.email}</p>
            <p><b>Mobile:</b> {data.mobile}</p>
            <p><b>GSTIN:</b> {data.gstin}</p>
          </div>

          <div className="space-y-1 text-gray-700">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">
              Invoice Info
            </h3>
            <p><b>Invoice No:</b> {data.invoiceNumber}</p>
            <p><b>Date:</b> {data.date}</p>
            <p><b>Created At:</b> {new Date(data.createdAt).toLocaleString()}</p>
            <a
              href={data.pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline mt-1 inline-block"
            >
              View PDF Invoice
            </a>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">#</th>
                <th className="border px-3 py-2 text-left">Description</th>
                <th className="border px-3 py-2 text-center">HSN</th>
                <th className="border px-3 py-2 text-center">Qty</th>
                <th className="border px-3 py-2 text-right">Rate</th>
                <th className="border px-3 py-2 text-right">Taxable</th>
                <th className="border px-3 py-2 text-right">GST</th>
                <th className="border px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.no} className="border-b hover:bg-gray-50">
                  <td className="border px-3 py-2">{item.no}</td>
                  <td className="border px-3 py-2">{item.description}</td>
                  <td className="border px-3 py-2 text-center">{item.hsn}</td>
                  <td className="border px-3 py-2 text-center">{item.quantity}</td>
                  <td className="border px-3 py-2 text-right">₹{item.rate}</td>
                  <td className="border px-3 py-2 text-right">₹{item.taxableAmount}</td>
                  <td className="border px-3 py-2 text-right">₹{item.gst}</td>
                  <td className="border px-3 py-2 text-right">₹{item.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-8 bg-gray-50 p-5 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Summary</h3>
          <div className="space-y-1 text-gray-700 text-sm sm:text-base">
            <p><b>Amount Before Tax:</b> ₹{data.totalAmountBeforeTax}</p>
            <p><b>CGST:</b> ₹{data.cgst}</p>
            <p><b>SGST:</b> ₹{data.sgst}</p>
            <p><b>Total Tax:</b> ₹{data.totalTaxAmount}</p>
            <p className="text-xl font-bold mt-2">
              Total After Tax: ₹{data.totalAmountAfterTax}
            </p>
            <p className="text-gray-600">({data.amountInWords})</p>
          </div>
        </div>

        {/* Verification Status */}
        <div className="mt-8 flex flex-col items-center">
          {data.verified ? (
            <p className="text-green-600 font-semibold text-lg">
              ✅ Invoice Verified Successfully
            </p>
          ) : (
            <p className="text-red-600 font-semibold text-lg">
              ❌ Invoice Verification Failed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
