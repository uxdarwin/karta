import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Darwin & Andrea | Karta', description: 'Una invitación para celebrar nuestro amor.', icons: { icon: '/monogram.svg' } };
export default function Layout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="es"><body>{children}</body></html>;}
