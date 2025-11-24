// src/app/upi-pay/page.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export default function UpiPayPage() {
  const searchParams = useSearchParams();

  // Build the UPI deep link from query params
  const upiUrl = useMemo(() => {
    const pa = searchParams.get('pa') || '9979174216@ybl';
    const pn = searchParams.get('pn') || 'Mustak Ishamohmmed Khan';
    const am = searchParams.get('am') || '';
    const tn = searchParams.get('tn') || 'thank you for yourpayment';
    const cu = searchParams.get('cu') || 'INR';

    const params = new URLSearchParams({
      pa,
      pn,
      tn,
      cu,
    });

    if (am) params.set('am', am);

    return `upi://pay?${params.toString()}`;
  }, [searchParams]);

  useEffect(() => {
    // Try automatic redirect to UPI app
    if (!upiUrl) return;
    try {
      window.location.href = upiUrl;
    } catch {
      // ignore, user can tap the button below
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
            padding: '10px 18px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            background:
              'linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #14b8a6 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(79,70,229,0.35)',
          }}
        >
          Open in UPI app
        </button>

        <p
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            marginTop: '12px',
          }}
        >
          If you still don&apos;t see your UPI app, copy the link from the
          browser and open it in your UPI-enabled device.
        </p>
      </div>
    </main>
  );
}
