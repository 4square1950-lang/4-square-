interface FourSquareCoinProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export function FourSquareCoin({className='',size=24,animate=false}:FourSquareCoinProps) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" fill="none"
    className={'shrink-0 '+(animate?'hover:rotate-12 transition-transform ':'')+className}>
    <circle cx="16" cy="16" r="14" fill="#e7ad45" stroke="#754619" strokeWidth="2"/>
    <circle cx="16" cy="16" r="11" stroke="#ffdf8f" strokeWidth="1.25"/>
    <path d="M10.5 10.5h11v11h-11zM16 10.5v11m-5.5-5.5h11" stroke="#3b2718" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
