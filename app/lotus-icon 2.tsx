export function LotusIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 18"
      aria-hidden="true"
      className={`lotus-toggle h-3.5 w-5 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2.1c1.55 1.42 2.35 2.82 2.35 4.2 0 1.12-.54 2.16-1.6 3.12 1.76-1.36 3.62-1.92 5.58-1.68-.18 1.88-1.12 3.36-2.82 4.44 2.02-.62 3.9-.42 5.64.6-1.76 2.22-4.6 3.34-8.52 3.34h-1.26c-3.92 0-6.76-1.12-8.52-3.34 1.74-1.02 3.62-1.22 5.64-.6-1.7-1.08-2.64-2.56-2.82-4.44 1.96-.24 3.82.32 5.58 1.68-1.06-.96-1.6-2-1.6-3.12 0-1.38.8-2.78 2.35-4.2Z"
        fill="currentColor"
        opacity="0.88"
      />
      <path
        d="M5.7 13.8c1.62.6 3.72.9 6.3.9s4.68-.3 6.3-.9"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.42"
        strokeLinecap="round"
      />
    </svg>
  )
}
