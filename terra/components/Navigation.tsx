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
    // Use a slightly darker border for better contrast on black
    <header className={`bg-black border-b border-white/20 fixed w-full top-0 z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
  
      {/* Reduced vertical padding for a sleeker look */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* The logo and brand name are now a single link to the homepage */}
        <Link href="/" className="flex items-center">
          <Image
            src="/Terra_logo.jpeg"
            alt="Terra Logo"
            width={50}
            height={50}
          />
          <span className="text-xl font-semibold text-gray-100">
            Terra
          </span>
        </Link>

        <nav className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? 'text-gray-100 font-medium' // Make active link slightly bolder
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}