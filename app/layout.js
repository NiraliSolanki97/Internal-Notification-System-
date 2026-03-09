import './globals.css'

export const metadata = {
  title: 'StudyAbroad Notify',
  description: 'Internal notification system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
