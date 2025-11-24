// src/app/upi-pay/UpiPayClient.tsx
'use client';

import { useMemo } from 'react';

interface UpiPayClientProps {
  pa: string;   // UPI ID
  pn: string;   // Payee name
  am?: string;  // Amount (optional)
  tn: string;   // Note
  cu: string;   // Currency
}

export default function UpiPayClient({ pa, pn, am, tn, cu }: UpiPayClientProps) {
  const upiUrl = useMemo(() => {
    const params = new URLSearchParams({ pa, pn, tn, cu });
    if (am) params.set('am', am);
    return `upi://pay?${params.toString()}`;
  }, [pa, pn, am, tn, cu]);

  const handleClick = () => {
    if (!upiUrl) return;
    try {
      window.location.href = upiUrl;
    } catch {
      // If something fails, we silently do nothing
    }
  };

  const formattedAmount = am && !Number.isNaN(Number(am)) ? Number(am).toFixed(2) : am || '-';

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
          UPI Payment
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#4b5563',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Review the payment details below and tap the button to continue in your UPI app
          (PhonePe, Google Pay, Paytm, etc.).
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 500 }}>Amount</span>
            <span>
              {cu} {formattedAmount}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 500 }}>Note</span>
            <span>{tn}</span>
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
              background: '#22c55e', // green
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
              transition: 'all 0.18s ease-in-out',
              minWidth: '150px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#16a34a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#22c55e';
            }}
          >
            Pay Now
          </button>

          <p
            style={{
              fontSize: '11px',
              color: '#9ca3af',
              marginTop: '10px',
            }}
          >
            You&apos;ll be taken to your UPI app to complete the payment securely.
          </p>
        </div>
      </div>
    </main>
  );
}
