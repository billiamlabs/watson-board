'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  return (
    <nav className="w-full md:w-64 bg-slate-900 border-r border-slate-700 flex md:flex-col">
      <Link
        href="/"
        className={`flex-1 md:flex-none px-4 py-3 border-b border-slate-700 transition ${
          isActive('/') ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800'
        }`}
      >
        Projects
      </Link>
      <Link
        href="/tasks"
        className={`flex-1 md:flex-none px-4 py-3 border-b border-slate-700 transition ${
          isActive('/tasks') ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800'
        }`}
      >
        Tasks
      </Link>
      <Link
        href="/feed"
        className={`flex-1 md:flex-none px-4 py-3 border-b border-slate-700 transition ${
          isActive('/feed') ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800'
        }`}
      >
        Activity
      </Link>
    </nav>
  )
}
