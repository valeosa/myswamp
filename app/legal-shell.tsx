import Link from 'next/link'
import { LilyIcon } from '@/app/lily-icon'

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#07100b] px-6 pb-20 pt-24 text-[#c8d8b8]">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#8fa66c] opacity-75 transition-opacity hover:opacity-100"><LilyIcon /> back to swamp</Link>
        <header className="mb-10 mt-8 border-b border-[#294532] pb-7">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-[#718067]">last updated {updated}</p>
        </header>
        <div className="legal-copy space-y-8 text-sm leading-7 text-[#aebe9f]">{children}</div>
      </article>
    </main>
  )
}
