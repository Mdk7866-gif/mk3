"use client";

import React, { useState } from "react";

interface Item {
  no: number;
  description: string;
  hsn?: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  date: string; // DD/MM/YYYY
  clientName: string;
  clientAddress: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  notes?: string;
  items: Item[];
  totalAmount: number;
  amountInWords: string;
}

const TestingPage: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveAndGenerate = async () => {
    setIsProcessing(true);

    try {
      // ===== 1) Build sample invoice data (for testing) =====
      const items: Item[] = [
        {
          no: 1,
          description: "POP False Ceiling Work",
          quantity: 100,
          rate: 150,
          amount: 100 * 150,
        },
        {
          no: 2,
          description: "Wall Putty & Finishing",
          quantity: 50,
          rate: 120,
          amount: 50 * 120,
        },
      ];

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      const invoicePayload: InvoiceData = {
        date: "22/11/2025", // must be DD/MM/YYYY
        clientName: "Test Client",
        clientAddress: "Somewhere in Ahmedabad, Gujarat",
        email: "testclient@example.com", // or you can use mobile instead
        // mobile: "9999999999",
        gstin: "24ABCDE1234F1Z5",
        notes: "This is a test invoice generated from testing page.",
        items,
        totalAmount,
        amountInWords: "Two Lakh Ten Thousand Rupees Only",
      };

      // ===== 2) First hit /api/mushahidsaveinvoice (POST) =====
      const saveRes = await fetch("/api/mushahidsaveinvoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoicePayload),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json().catch(() => null);
        console.error("Save invoice error:", errorData || saveRes.statusText);
        alert(
          errorData?.message ||
            "Failed to save invoice. Please check API or data."
        );
        setIsProcessing(false);
        return;
      }

      const saveData = await saveRes.json();
      console.log("Invoice saved:", saveData);
      // saveData.invoiceNumber, saveData.invoiceId available here

      // ===== 3) After successful save, hit /api/mushahidgenerateinvoicepdff =====
      const pdfRes = await fetch("/api/mushahidgenerateinvoicepdff", {
        method: "GET",
      });

      if (!pdfRes.ok) {
        const errorText = await pdfRes.text().catch(() => "");
        console.error("Generate PDF error:", errorText || pdfRes.statusText);
        alert("Invoice saved but failed to generate PDF.");
        setIsProcessing(false);
        return;
      }

      // ===== 4) Download the PDF =====
      const blob = await pdfRes.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${saveData.invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert("Invoice saved & PDF generated successfully!");
    } catch (err) {
      console.error("Error in save + generate flow:", err);
      alert("Something went wrong while saving or generating invoice.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        padding: "32px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        alignItems: "flex-start",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Testing Page</h1>
      <p style={{ maxWidth: 480, fontSize: 14, opacity: 0.8 }}>
        This button will first <b>save the invoice</b> to MongoDB and then{" "}
        <b>generate & download</b> the latest invoice PDF.
      </p>

      <button
        onClick={handleSaveAndGenerate}
        disabled={isProcessing}
        style={{
          padding: "10px 20px",
          borderRadius: 6,
          border: "none",
          fontSize: 16,
          fontWeight: 600,
          cursor: isProcessing ? "not-allowed" : "pointer",
          backgroundColor: "#16a34a",
          color: "#ffffff",
          opacity: isProcessing ? 0.7 : 1,
        }}
      >
        {isProcessing ? "Processing..." : "Save & Generate Invoice PDF"}
      </button>
    </div>
  );
};

export default TestingPage;
