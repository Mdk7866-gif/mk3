// src/app/mustak/quotationdiscountrate/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import ClientDetails, { ClientFormData } from "@/components/ClientDetails";
import ItemsDetailsQuotationDiscountRate, {
  QuotationDiscountItem,
} from "@/components/ItemsDetailsQuotationDiscountRate";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import PasswordProtection from "@/components/PasswordProtection";

// Shape expected by /api/mustaksavequotationdiscountrate
interface QuotationDiscountData {
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
    originalRate: number;
    discountRate: number;
  }>;
}

const CreateMustakQuotationDiscountPageContent: React.FC = () => {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationDiscountItem[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  const handleQuotationItemsChange = useCallback(
    (items: QuotationDiscountItem[]) => {
      setQuotationItems(items);
    },
    []
  );

  const getQuotationPayload = (): QuotationDiscountData | null => {
    if (
      !clientData ||
      !clientData.clientName ||
      !clientData.clientAddress ||
      (!clientData.email && !clientData.mobile)
    ) {
      toast.error(
        "Client Name, Address, and at least one of Email or Mobile are required.",
        { id: "quotationDRError" }
      );
      return null;
    }

    if (!clientData.date) {
      toast.error("Please select quotation date.", { id: "quotationDRError" });
      return null;
    }

    const validItems = quotationItems.filter((item) => {
      if (item.description.trim() === "") return false;
      const qty =
        typeof item.quantity === "string"
          ? parseFloat(item.quantity)
          : item.quantity;
      const orig =
        typeof item.originalRate === "string"
          ? parseFloat(item.originalRate)
          : item.originalRate;
      const disc =
        typeof item.discountRate === "string"
          ? parseFloat(item.discountRate)
          : item.discountRate;
      return !!qty && qty > 0 && !!orig && orig > 0 && !!disc && disc > 0;
    });

    if (validItems.length === 0) {
      toast.error(
        "Please add at least one valid item with description, quantity, original rate and discount rate.",
        { id: "quotationDRError" }
      );
      return null;
    }

    const dateParts = clientData.date.split("-");
    if (dateParts.length !== 3) {
      toast.error("Invalid date format.", { id: "quotationDRError" });
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
        originalRate:
          typeof item.originalRate === "string"
            ? parseFloat(item.originalRate) || 0
            : item.originalRate,
        discountRate:
          typeof item.discountRate === "string"
            ? parseFloat(item.discountRate) || 0
            : item.discountRate,
      })),
    };
  };

  const handleGeneratePdfAndSave = async () => {
    setMessage(null);
    const quotationPayload = getQuotationPayload();
    if (!quotationPayload) return;

    setIsProcessing(true);
    toast.loading("Saving quotation...", { id: "mustakQuotationDR" });

    try {
      // 1) Save quotation
      const saveResponse = await fetch("/api/mustaksavequotationdiscountrate", {
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
      console.log("Quotation (Discount Rate) saved:", saveResult);

      toast.loading("Quotation saved. Generating PDF...", {
        id: "mustakQuotationDR",
      });

      // 2) Generate PDF
      const generateResponse = await fetch(
        "/api/mustakgeneratequotationdiscountratepdff",
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
      const fileName = `quotation-discount-${saveResult.invoiceNumber}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const successText = `Quotation saved & PDF generated! (No: ${saveResult.invoiceNumber})`;
      toast.success(successText, { id: "mustakQuotationDR" });
      setMessage(successText);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to save quotation or generate PDF";
      console.error("Error processing discount quotation:", error);
      toast.error(`Error: ${msg}`, { id: "mustakQuotationDR" });
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
    const orig =
      typeof item.originalRate === "string"
        ? parseFloat(item.originalRate)
        : item.originalRate;
    const disc =
      typeof item.discountRate === "string"
        ? parseFloat(item.discountRate)
        : item.discountRate;
    return !!qty && qty > 0 && !!orig && orig > 0 && !!disc && disc > 0;
  }).length;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />

      {/* Top loading bar */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 animate-pulse" />
        </div>
      )}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Create Quotation with Discount — Mustak Khan
        </h1>
        <span className="text-sm text-gray-500">
          Fill client details &amp; items with original &amp; discount rates.
        </span>
      </header>

      <main className="max-w-5xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsQuotationDiscountRate
          onItemsChange={handleQuotationItemsChange}
        />

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
              Only valid items (description, quantity, original rate &amp;
              discount rate all filled) will be saved and included in the PDF.
              If original rate = discount rate, no strikethrough is shown.
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
                : "bg-orange-600 hover:bg-orange-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
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

export default function CreateMustakQuotationDiscountPage() {
  return (
    <PasswordProtection>
      <CreateMustakQuotationDiscountPageContent />
    </PasswordProtection>
  );
}
