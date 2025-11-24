// src/app/upi-payquotation/UpiPayClientQuotation.tsx
'use client';

import { useEffect, useMemo } from 'react';

interface UpiPayClientQuotationProps {
  pa: string; // UPI ID
  pn: string; // Payee name
  tn: string; // Note
  cu: string; // Currency
}

export default function UpiPayClientQuotation({ pa, pn, tn, cu }: UpiPayClientQuotationProps) {
  // Build UPI URL WITHOUT amount
  const upiUrl = useMemo(() => {
    const params = new URLSearchParams({ pa, pn, tn, cu });
    return `upi://pay?${params.toString()}`;
  }, [pa, pn, tn, cu]);

  useEffect(() => {
    if (!upiUrl) return;
    try {
      // Auto attempt to open UPI app
      window.location.href = upiUrl;
    } catch {
      // ignore; user can tap button
    }
  }, [upiUrl]);

  const handleClick = () => {
    if (!upiUrl) return;
    window.location.href = upiUrl;
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        padding: '16px',
        fontFamily:
          '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
        }}
      >
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '6px',
            color: '#0f172a',
            textAlign: 'center',
          }}
        >
          Open UPI Payment
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#4b5563',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          We&apos;re opening your UPI app. If nothing happens, tap the button below.
          You can enter any amount you wish to pay.
        </p>

        <div
          style={{
            borderRadius: '12px',
            background: '#f3f4f6',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#111827',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 500 }}>Payee</span>
            <span>{pn}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 500 }}>UPI ID</span>
            <span>{pa}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 500 }}>Note</span>
            <span>{tn}</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
            Amount will be entered by you in your UPI app.
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              background: '#22c55e', // green like before
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
              transition: 'all 0.18s ease-in-out',
              minWidth: '160px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#16a34a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#22c55e';
            }}
          >
            Open UPI App
          </button>

          <p
            style={{
              fontSize: '11px',
              color: '#9ca3af',
              marginTop: '10px',
            }}
          >
            You&apos;ll be taken to your UPI app (PhonePe, Google Pay, Paytm, etc.). Enter the
            amount there and complete the payment.
          </p>
        </div>
      </div>
    </main>
  );
}
