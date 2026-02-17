import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DataQuantLab - Research Dashboard',
  description: 'Quantitative trading research dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className="dark" lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col md:flex-row overflow-hidden selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  )
}
