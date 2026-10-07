import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'Identity Onboarding Lab — Sri Lankan Investment Onboarding',
  description: 'Automated Sri Lankan remote identity verification and onboarding platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          Identity Onboarding Lab • Sri Lankan Investment Onboarding Platform • Local Demonstration Mode
        </footer>
      </body>
    </html>
  );
}
