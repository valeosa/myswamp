export function LilyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 14"
      className={`lily-toggle h-3 w-4 shrink-0 fill-current opacity-80 ${className}`}
    >
      <path d="M1 8.5C3.8 2.5 10.8.4 17 3.4c-1.2 1.1-2.3 2-3.4 2.8L19 8.8C14 13.2 5.8 13.4 1 8.5Z" />
    </svg>
  )
}
