import './globals.css';

export const metadata = {
  title: 'Oveikals POS',
  description: 'Veikala ekrānu slaidrāde',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="lv">
      <body>{children}</body>
    </html>
  );
}
