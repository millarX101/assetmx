import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Car, Truck, Wrench, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Asset Finance in Australia (How It Actually Works)",
  "description": "Asset finance explained without the spin. Learn how asset finance really works, how pricing is formed, and why transparent fixed pricing exists for low-risk borrowers.",
  "author": {
    "@type": "Organization",
    "name": "AssetMX"
  },
  "publisher": {
    "@type": "Organization",
    "name": "AssetMX",
    "url": "https://assetmx.com.au"
  },
  "datePublished": "2026-01-09",
  "dateModified": "2026-01-09"
};

export function HowAssetFinanceWorks() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="Asset Finance Australia | How It Actually Works"
        description="Asset finance explained without the spin. Learn how asset finance really works, how pricing is formed, and why transparent fixed pricing exists for low-risk borrowers."
        keywords="asset finance Australia, how asset finance works, chattel mortgage, finance lease, business finance explained, asset finance guide"
        canonicalUrl="https://assetmx.com.au/guides/how-asset-finance-works"
        structuredData={structuredData}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="text-sm font-medium text-purple-200 mb-4">GUIDE</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display mb-6">
              Asset Finance in Australia
              <br />
              <span className="text-pink-300">(How It Actually Works)</span>
            </h1>
            <p className="text-xl text-purple-100">
              Asset finance in Australia is simple — but it's rarely explained that way.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <article className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-lg prose-slate">

            <p className="lead text-xl text-slate-600">
              Most businesses are shown a rate, not a structure. A repayment, not a total cost. And almost never the incentives sitting behind the quote.
            </p>
            <p className="text-slate-600">
              This page explains how asset finance really works, how pricing is formed, and why transparent, fixed pricing exists for low-risk borrowers.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">What asset finance really is</h2>
            <p className="text-slate-600">
              Asset finance is secured lending against a physical asset — usually a vehicle or piece of equipment. The lender funds the purchase. The business repays it over time. The asset itself is the security.
            </p>
            <p className="text-slate-600 font-medium">That's it.</p>
            <p className="text-slate-600">
              It's not a tax product. It's not a discount scheme. And it's not "free money". It's a cashflow tool designed to spread the cost of productive assets without draining working capital.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
              <Card className="border-purple-100">
                <CardContent className="pt-4 pb-4 text-center">
                  <Car className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-700">Business vehicles</div>
                </CardContent>
              </Card>
              <Card className="border-purple-100">
                <CardContent className="pt-4 pb-4 text-center">
                  <Wrench className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-700">Plant & machinery</div>
                </CardContent>
              </Card>
              <Card className="border-purple-100">
                <CardContent className="pt-4 pb-4 text-center">
                  <Truck className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-700">Construction equipment</div>
                </CardContent>
              </Card>
              <Card className="border-purple-100">
                <CardContent className="pt-4 pb-4 text-center">
                  <Building className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-700">Commercial assets</div>
                </CardContent>
              </Card>
            </div>

            <p className="text-slate-500 italic">
              Everything else layered on top is where complexity — and margin — enters the picture.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">The three structures most businesses use</h2>

            <div className="space-y-6 my-8">
              <Card className="border-purple-100">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Chattel mortgage</h3>
                  <p className="text-slate-600">
                    You own the asset from day one. The lender registers security until the loan is repaid. This is the most common structure for business vehicles and equipment.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-purple-100">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Finance lease</h3>
                  <p className="text-slate-600">
                    The lender owns the asset. You lease it for a fixed term. End-of-term options are defined in advance.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-purple-100">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Operating lease</h3>
                  <p className="text-slate-600">
                    The asset is used, not owned. These are often bundled with running costs and priced very differently.
                  </p>
                </CardContent>
              </Card>
            </div>

            <p className="text-slate-600">
              Different structures. Same pricing logic underneath.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">How asset finance pricing is actually built</h2>
            <p className="text-slate-600">
              Every asset finance rate is constructed from the same inputs:
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                Cost of funds
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                Asset depreciation risk
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                Borrower credit risk
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                Administrative complexity
              </li>
            </ul>
            <p className="text-slate-600 mt-4">
              For clean borrowers buying standard assets, these variables are predictable. That predictability is what allows transparent pricing to exist.
            </p>
            <p className="text-slate-600 font-medium">
              When pricing isn't predictable, margin fills the gap.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Why advertised rates don't tell you much</h2>
            <p className="text-slate-600">
              A headline rate shows best-case pricing, not typical outcomes.
            </p>
            <p className="text-slate-600">
              It usually excludes:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Establishment fees</li>
              <li>• Broker margin embedded in the rate</li>
              <li>• Repayment frequency effects</li>
              <li>• Term stretching</li>
              <li>• Exit costs</li>
            </ul>
            <p className="text-slate-700 font-semibold mt-4">
              A lower rate does not mean cheaper finance.<br />
              Total cost does.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Where brokers fit (factually)</h2>
            <p className="text-slate-600">
              Most asset finance in Australia flows through brokers.
            </p>
            <p className="text-slate-600">
              Brokers are paid by lenders — typically via:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Upfront commission</li>
              <li>• Ongoing trail commission</li>
              <li>• Volume-based incentives</li>
            </ul>
            <p className="text-slate-600 mt-4">
              Disclosure exists. Transparency often doesn't.
            </p>
            <p className="text-slate-600">
              This structure isn't "wrong", but it does mean pricing can vary based on incentives rather than risk alone.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Why fixed pricing exists</h2>
            <p className="text-slate-600">
              Fixed pricing exists because some deals don't need negotiation.
            </p>
            <p className="text-slate-600">
              If a business is:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Established</li>
              <li>• Credit-clean</li>
              <li>• Buying a standard asset</li>
            </ul>
            <p className="text-slate-600 mt-4">
              Then risk is already known.
            </p>
            <p className="text-slate-600">
              In those cases, negotiation adds friction — not value.
            </p>
            <p className="text-slate-600">
              Fixed pricing removes:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Margin variability</li>
              <li>• Commission distortion</li>
              <li>• Rate opacity</li>
            </ul>
            <p className="text-slate-600 mt-4">
              And replaces it with a systemised, tech-driven approach.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Who transparent asset finance is for</h2>
            <p className="text-slate-600">
              This model suits businesses that want:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Clear pricing</li>
              <li>• No sales calls</li>
              <li>• No negotiation theatre</li>
              <li>• No surprises buried in documentation</li>
            </ul>
            <p className="text-slate-600 mt-4">
              It's not designed for complex credit or edge-case scenarios — and that's intentional.
            </p>

          </div>
        </div>
      </article>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-light">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto bg-gradient-brand border-0 shadow-2xl shadow-purple-900/30">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-display mb-4 text-white">
                See Your Real Rate in 30 Seconds
              </h2>
              <p className="text-lg text-purple-100 mb-6">
                No credit check. No phone calls. Just transparent pricing.
              </p>
              <Link to="/chat-apply">
                <Button size="lg" className="text-lg px-8 py-6 bg-white text-purple-800 hover:bg-purple-50 shadow-lg">
                  Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-purple-200 mt-4">
                ABN 2+ years | GST registered | Good credit
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Related guides</h3>
            <div className="flex flex-wrap gap-4">
              <Link to="/guides/advertised-rates-misleading" className="text-purple-600 hover:text-purple-700 underline">
                Why Advertised Rates Are Misleading
              </Link>
              <Link to="/guides/broker-fees-explained" className="text-purple-600 hover:text-purple-700 underline">
                Business Car Finance Explained
              </Link>
              <Link to="/how-we-compare" className="text-purple-600 hover:text-purple-700 underline">
                How We Compare
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-purple-900 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-purple-300 max-w-3xl mx-auto">
            AssetMX is a trading name of Blackrock Leasing Pty Ltd
            <br />
            ABN 15 681 267 818 | Australian Credit Licence 569484
          </p>
          <p className="text-xs text-purple-400 mt-4">
            © {new Date().getFullYear()} Blackrock Leasing Pty Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
