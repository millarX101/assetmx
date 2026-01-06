import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to AssetMX
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display text-slate-900 mb-4">{title}</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-slate-900 prose-a:text-purple-700 prose-a:no-underline hover:prose-a:underline">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-purple-900 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-purple-300">
            AssetMX is a trading name of Blackrock Leasing Pty Ltd (trading as millarX)
            <br />
            ABN 15 681 267 818 | Australian Credit Licence 569484
          </p>
          <p className="text-xs text-purple-400 mt-2">
            © {new Date().getFullYear()} Blackrock Leasing Pty Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
