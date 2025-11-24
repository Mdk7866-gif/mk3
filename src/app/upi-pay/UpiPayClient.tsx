// src/app/upi-pay/UpiPayClient.tsx
'use client';

import { useEffect, useMemo } from 'react';

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

  useEffect(() => {
    if (!upiUrl) return;
    try {
      // Try automatic redirect to UPI app
      window.location.href = upiUrl;
    } catch {
      // ignore, user can use button
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
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '8px',
            color: '#0f172a',
          }}
        >
          Opening your UPI app…
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#4b5563',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}
        >
          If nothing happens automatically, tap the button below to continue the
          payment in PhonePe, Google Pay, Paytm, or any other UPI app.
        </p>

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
    background: '#22c55e', // ✅ Green
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
    transition: 'all 0.2s ease-in-out',
  }}
  onMouseEnter={(e) => {
    (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; // ✅ Darker green hover
  }}
  onMouseLeave={(e) => {
    (e.currentTarget as HTMLButtonElement).style.background = '#22c55e'; // ✅ Original green
  }}
>
  Pay Now
</button>


        <p
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            marginTop: '12px',
          }}
        >
          If you still don&apos;t see your UPI app, come back to this page on
          your UPI-enabled mobile device and try again.
        </p>
      </div>
    </main>
  );
}
