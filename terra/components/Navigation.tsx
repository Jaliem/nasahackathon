'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const controlNavbar = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.scrollY > lastScrollY && window.scrollY > 50) { // if scroll down hide the navbar
        setVisible(false)
      } else { // if scroll up show the navbar
        setVisible(true)
      }

      // remember current page location to use in the next move
      setLastScrollY(window.scrollY)
    }
  }, [lastScrollY])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar)

      // cleanup function
      return () => {
        window.removeEventListener('scroll', controlNavbar)
      }
    }
  }, [lastScrollY, controlNavbar])


  const links = [
    { href: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <header className={`bg-black fixed w-full top-0 z-[1003] transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/Terra_logo.jpeg"
            alt="Terra"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="text-lg font-medium text-gray-300 group-hover:text-gray-100 transition-colors">
            Terra
          </span>
        </Link>

        <nav className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors relative py-1 ${
                pathname === link.href
                  ? 'text-gray-100'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute -bottom-4 left-0 right-0 h-px bg-gray-100"></span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}