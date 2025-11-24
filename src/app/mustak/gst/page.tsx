// src/app/mustak/gst/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import ClientDetails, { ClientFormData } from "@/components/ClientDetails";
import ItemsDetailsGst, {
  GstItem,
  GstInvoiceTotals,
} from "@/components/ItemsDetailsGst";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import PasswordProtection from "@/components/PasswordProtection";

// Define the shape of the GST invoice data (aligned with API)
interface GstInvoiceData {
  date: string; // DD/MM/YYYY
  clientName: string;
  clientAddress: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  notes?: string;
  items: Array<{
    no: number;
    description: string;
    hsn?: string;
    quantity: number;
    rate: number;
    taxableAmount: number;
    gst: number;
    totalAmount: number;
  }>;
  totalAmountBeforeTax: number;
  cgst: number;
  sgst: number;
  totalTaxAmount: number;
  totalAmountAfterTax: number;
  amountInWords: string;
}

function CreateGstInvoicePageContent() {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [gstItems, setGstItems] = useState<GstItem[]>([]);
  const [gstTotals, setGstTotals] = useState<GstInvoiceTotals | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  const handleGstItemsChange = useCallback(
    (items: GstItem[], totals: GstInvoiceTotals) => {
      setGstItems((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(items)) {
          return items;
        }
        return prev;
      });
      setGstTotals((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(totals)) {
          return totals;
        }
        return prev;
      });
    },
    []
  );

  const getGstInvoicePayload = (): GstInvoiceData | null => {
    if (
      !clientData ||
      !clientData.clientName ||
      !clientData.clientAddress ||
      (!clientData.email && !clientData.mobile) ||
      !gstItems.length ||
      !gstTotals
    ) {
      toast.error(
        "Client Name, Address, at least one of Email or Mobile, and at least one item are required.",
        { id: "gstError" }
      );
      return null;
    }

    if (!clientData.date) {
      toast.error("Please select invoice date.", { id: "gstError" });
      return null;
    }

    // Filter out invalid items
    const validItems = gstItems.filter((item) => {
      if (item.description.trim() === "") return false;
      if (item.taxableAmount <= 0) return false;

      const qty =
        typeof item.quantity === "string"
          ? parseFloat(item.quantity)
          : item.quantity;
      const rate =
        typeof item.rate === "string" ? parseFloat(item.rate) : item.rate;

      return !!qty && qty > 0 && !!rate && rate > 0;
    });

    if (validItems.length === 0) {
      toast.error(
        "Please add at least one valid work item with description, quantity, rate, and taxable amount.",
        { id: "gstError" }
      );
      return null;
    }

    if (gstTotals.totalAmountAfterTax <= 0) {
      toast.error("Total amount after tax must be greater than 0.", {
        id: "gstError",
      });
      return null;
    }

    // Convert date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = clientData.date.split("-");
    if (dateParts.length !== 3) {
      toast.error("Invalid date format.", { id: "gstError" });
      return null;
    }
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    return {
      date: formattedDate,
      clientName: clientData.clientName,
      clientAddress: clientData.clientAddress,
      email: clientData.email || "",
      mobile: clientData.mobile || "",
      gstin: clientData.gstin || "",
      notes: clientData.notes || "",
      items: validItems.map((item) => ({
        no: item.no,
        description: item.description,
        hsn: item.hsn || "",
        quantity:
          typeof item.quantity === "string"
            ? parseFloat(item.quantity) || 0
            : item.quantity,
        rate:
          typeof item.rate === "string"
            ? parseFloat(item.rate) || 0
            : item.rate,
        taxableAmount: parseFloat(item.taxableAmount.toFixed(2)),
        gst: parseFloat(item.gst.toFixed(2)),
        totalAmount: parseFloat(item.totalAmount.toFixed(2)),
      })),
      totalAmountBeforeTax: parseFloat(
        gstTotals.totalAmountBeforeTax.toFixed(2)
      ),
      cgst: parseFloat(gstTotals.cgst.toFixed(2)),
      sgst: parseFloat(gstTotals.sgst.toFixed(2)),
      totalTaxAmount: parseFloat(gstTotals.totalTaxAmount.toFixed(2)),
      totalAmountAfterTax: parseFloat(
        gstTotals.totalAmountAfterTax.toFixed(2)
      ),
      amountInWords: gstTotals.amountInWords,
    };
  };

  const handleGeneratePdfAndSave = async () => {
    setMessage(null);
    const gstInvoicePayload = getGstInvoicePayload();
    if (!gstInvoicePayload) return;

    setIsProcessing(true);
    toast.loading("Saving GST invoice...", { id: "gstAction" });

    try {
      // 1) Save to database
      const saveResponse = await fetch("/api/mustaksavegst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gstInvoicePayload),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => null);
        throw new Error(
          errorData?.message || "Failed to save GST invoice to database."
        );
      }

      const saveResult = await saveResponse.json();
      console.log("GST invoice saved (Mustak):", saveResult);

      toast.loading("Invoice saved. Generating GST PDF...", {
        id: "gstAction",
      });

      // 2) Generate latest GST invoice PDF (Mustak)
      const generateResponse = await fetch(
        "/api/mustakgenerategstpdff",
        { method: "GET" }
      );

      if (!generateResponse.ok) {
        let msg = "Failed to generate GST PDF";
        try {
          const err = await generateResponse.json();
          msg = err.message || msg;
        } catch {
          // ignore parse error
        }
        throw new Error(msg);
      }

      // 3) Download PDF
      const pdfBlob = await generateResponse.blob();
      const fileName = `tax-invoice-${saveResult.invoiceNumber}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const successText = `GST invoice saved & PDF generated successfully! (No: ${saveResult.invoiceNumber})`;
      toast.success(successText, { id: "gstAction" });
      setMessage(successText);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save GST invoice or generate PDF";
      toast.error(`Error: ${msg}`, { id: "gstAction" });
      setMessage(`Error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasClientBasic =
    !!clientData &&
    !!clientData.clientName &&
    !!clientData.clientAddress &&
    (!!clientData.email || !!clientData.mobile);

  const hasItems = gstItems.length > 0;
  const hasTotals = !!gstTotals;

  const isButtonDisabled =
    isProcessing || !hasClientBasic || !hasItems || !hasTotals;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />

      {/* Top loading bar */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 w-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 animate-pulse" />
        </div>
      )}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Create GST Bill for Mustak Khan
        </h1>
        <span className="text-sm text-gray-500">
          Fill client details & GST items, then generate a tax invoice PDF.
        </span>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsGst onItemsChange={handleGstItemsChange} />

        {/* Summary card */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            GST Invoice Summary
          </h2>
          {gstTotals ? (
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
              <div>
                <div>
                  <span className="font-medium">Items: </span>
                  {gstItems.length}
                </div>
                <div>
                  <span className="font-medium">Taxable Value: </span>₹
                  {gstTotals.totalAmountBeforeTax.toFixed(2)}
                </div>
              </div>
              <div>
                <div>
                  <span className="font-medium">CGST + SGST: </span>₹
                  {gstTotals.totalTaxAmount.toFixed(2)}{" "}
                  <span className="text-xs text-gray-500">
                    (CGST: ₹{gstTotals.cgst.toFixed(2)}, SGST: ₹
                    {gstTotals.sgst.toFixed(2)})
                  </span>
                </div>
                <div>
                  <span className="font-medium">Grand Total: </span>₹
                  {gstTotals.totalAmountAfterTax.toFixed(2)}
                </div>
              </div>
              {gstTotals.amountInWords && (
                <div className="sm:col-span-2 text-xs sm:text-sm text-gray-600 mt-1">
                  <span className="font-medium">In Words: </span>
                  {gstTotals.amountInWords}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Add items to see GST totals summary.
            </p>
          )}
        </div>

        {/* Action button */}
        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-4 mt-8">
          <button
            onClick={handleGeneratePdfAndSave}
            disabled={isButtonDisabled}
            className={`w-full sm:w-auto px-8 py-3 rounded-md text-lg font-semibold shadow-md transition-all duration-200 ${
              isButtonDisabled
                ? "bg-gray-400 cursor-not-allowed text-gray-100"
                : "bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            }`}
          >
            {isProcessing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              "Save & Generate GST PDF"
            )}
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-md text-center text-base sm:text-lg ${
              message.startsWith("Error")
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            <p>{message}</p>
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/mustak" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm py-4 border-t border-gray-200">
        &copy; {new Date().getFullYear()} MK3. All rights reserved.
      </footer>
    </div>
  );
}

export default function CreateGstInvoicePage() {
  return (
    <PasswordProtection>
      <CreateGstInvoicePageContent />
    </PasswordProtection>
  );
}
