import { Suspense } from 'react';
import VerifyInvoicePage from '@/components/VerifyInvoicePage';

export default function VerifyQRCodeFrontendMushahid() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700 font-medium">
        Loading invoice details...
      </div>
    }>
      <VerifyInvoicePage issuer="mushahid" title="Mushahid Invoice Verification" />
    </Suspense>
  );
}
