// src/app/mustak/quotation/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import ClientDetails, { ClientFormData } from "@/components/ClientDetails";
import ItemsDetailsQuotation, {
  QuotationItem,
} from "@/components/ItemsDetailsQuotation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";

// Shape expected by /api/mustaksavequotation
interface QuotationData {
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
  }>;
}

const CreateMustakQuotationPage: React.FC = () => {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  const handleQuotationItemsChange = useCallback(
    (items: QuotationItem[]) => {
      setQuotationItems(items);
    },
    []
  );

  const getQuotationPayload = (): QuotationData | null => {
    if (
      !clientData ||
      !clientData.clientName ||
      !clientData.clientAddress ||
      (!clientData.email && !clientData.mobile)
    ) {
      toast.error(
        "Client Name, Address, and at least one of Email or Mobile are required.",
        { id: "quotationError" }
      );
      return null;
    }

    if (!clientData.date) {
      toast.error("Please select quotation date.", { id: "quotationError" });
      return null;
    }

    const validItems = quotationItems.filter((item) => {
      if (item.description.trim() === "") return false;
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
        "Please add at least one valid work item with description, quantity, and rate.",
        { id: "quotationError" }
      );
      return null;
    }

    const dateParts = clientData.date.split("-");
    if (dateParts.length !== 3) {
      toast.error("Invalid date format.", { id: "quotationError" });
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
      })),
    };
  };

  const handleGeneratePdfAndSave = async () => {
    setMessage(null);
    const quotationPayload = getQuotationPayload();
    if (!quotationPayload) return;

    setIsProcessing(true);
    toast.loading("Saving quotation...", { id: "mustakQuotation" });

    try {
      // 1) Save quotation
      const saveResponse = await fetch("/api/mustaksavequotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotationPayload),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => null);
        throw new Error(
          errorData?.message || "Failed to save quotation to database."
        );
      }

      const saveResult = await saveResponse.json();
      console.log("Quotation saved (Mustak):", saveResult);

      toast.loading("Quotation saved. Generating PDF...", {
        id: "mustakQuotation",
      });

      // 2) Generate latest quotation PDF
      const generateResponse = await fetch(
        "/api/mustakgeneratequotationpdff",
        { method: "GET" }
      );

      if (!generateResponse.ok) {
        let msg = "Failed to generate quotation PDF";
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
      const fileName = `quotation-${saveResult.invoiceNumber}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const successText = `Quotation saved & PDF generated successfully! (No: ${saveResult.invoiceNumber})`;
      toast.success(successText, { id: "mustakQuotation" });
      setMessage(successText);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to save quotation or generate PDF";
      console.error("Error processing quotation (Mustak):", error);
      toast.error(`Error: ${msg}`, { id: "mustakQuotation" });
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

  const hasAnyItems = quotationItems.length > 0;

  const isButtonDisabled = isProcessing || !hasClientBasic || !hasAnyItems;

  const validItemsCount = quotationItems.filter((item) => {
    if (item.description.trim() === "") return false;
    const qty =
      typeof item.quantity === "string"
        ? parseFloat(item.quantity)
        : item.quantity;
    const rate =
      typeof item.rate === "string" ? parseFloat(item.rate) : item.rate;
    return !!qty && qty > 0 && !!rate && rate > 0;
  }).length;

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
          Create Quotation for Mustak Khan
        </h1>
        <span className="text-sm text-gray-500">
          Fill client details & work items, then generate a quotation PDF.
        </span>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsQuotation onItemsChange={handleQuotationItemsChange} />

        {/* Summary card */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Quotation Summary
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-700">
            <div>
              <div>
                <span className="font-medium">Total Items Entered: </span>
                {quotationItems.length}
              </div>
              <div>
                <span className="font-medium">Valid Items: </span>
                {validItemsCount}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 max-w-md">
              Only valid items (with description, quantity &amp; rate) will be
              saved and included in the PDF.
            </div>
          </div>
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
              "Save & Generate PDF"
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
};

export default CreateMustakQuotationPage;
