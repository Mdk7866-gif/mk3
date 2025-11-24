// src/app/upi-pay/page.tsx
import UpiPayClient from './UpiPayClient';

type SearchParams = { [key: string]: string | string[] | undefined };

interface PageProps {
  searchParams?: SearchParams;
}

function getParam(searchParams: SearchParams | undefined, key: string, fallback = ''): string {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return (value as string | undefined) ?? fallback;
}

export default function UpiPayPage({ searchParams }: PageProps) {
  const pa = getParam(searchParams, 'pa', '9979174216@ybl');
  const pn = getParam(searchParams, 'pn', 'Mustak Ishamohmmed Khan');
  const am = getParam(searchParams, 'am', '');
  const tn = getParam(searchParams, 'tn', 'thank you for yourpayment');
  const cu = getParam(searchParams, 'cu', 'INR');

  return (
    <UpiPayClient
      pa={pa}
      pn={pn}
      am={am}
      tn={tn}
      cu={cu}
    />
  );
}
