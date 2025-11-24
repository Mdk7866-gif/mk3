// src/app/upi-payquotation/page.tsx

import UpiPayClientQuotation from './UpiPayClientQuotation'

type SearchParams = { [key: string]: string | string[] | undefined };

interface PageProps {
  searchParams?: SearchParams;
}

function getParam(searchParams: SearchParams | undefined, key: string, fallback = ''): string {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return (value as string | undefined) ?? fallback;
}

export default function UpiPayQuotationPage({ searchParams }: PageProps) {
  const pa = getParam(searchParams, 'pa', '9979174216@ybl');
  const pn = getParam(searchParams, 'pn', 'Mustak Ishamohmmed Khan');
  const tn = getParam(searchParams, 'tn', 'Thank you for your payment');
  const cu = getParam(searchParams, 'cu', 'INR');

  return (
    <UpiPayClientQuotation
      pa={pa}
      pn={pn}
      tn={tn}
      cu={cu}
    />
  );
}
