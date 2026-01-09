import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Asset Finance Rates Explained (Without the Marketing)",
  "description": "If you've been shown a rate without being shown a total cost, you haven't been shown the full picture. Learn why asset finance rates are often misleading.",
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

export function AdvertisedRatesMisleading() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="Asset Finance Rates Explained | Why Ads Are Misleading"
        description="If you've been shown a rate without a total cost, you haven't seen the full picture. Learn why asset finance rates are often misleading and how to compare properly."
        keywords="asset finance rates, finance rates explained, advertised rates misleading, compare asset finance, total cost finance, broker fees hidden"
        canonicalUrl="https://assetmx.com.au/guides/advertised-rates-misleading"
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
              Asset Finance Rates Explained
              <br />
              <span className="text-pink-300">(Without the Marketing)</span>
            </h1>
            <p className="text-xl text-purple-100">
              If you've been shown a rate without being shown a total cost, you haven't been shown the full picture.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <article className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-lg prose-slate">

            <p className="lead text-xl text-slate-600">
              This page explains why asset finance rates are often misleading — and how to compare finance properly.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">"From X%" is not a price</h2>
            <p className="text-slate-600">
              Advertised rates are conditional. They assume:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Ideal borrowers</li>
              <li>• Short terms</li>
              <li>• Clean assets</li>
              <li>• Minimal fees</li>
            </ul>
            <p className="text-slate-600 font-medium mt-4">
              Most borrowers qualify for finance — not for the advertised rate.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Rate vs cost vs repayment</h2>
            <p className="text-slate-600">
              Three different things:
            </p>

            <div className="grid md:grid-cols-3 gap-4 my-8">
              <Card className="border-purple-100">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Rate</h3>
                  <p className="text-sm text-slate-600">
                    The interest percentage
                  </p>
                </CardContent>
              </Card>
              <Card className="border-purple-100">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Cost</h3>
                  <p className="text-sm text-slate-600">
                    Interest plus all fees
                  </p>
                </CardContent>
              </Card>
              <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Total Cost</h3>
                  <p className="text-sm text-slate-600">
                    What it actually costs
                  </p>
                </CardContent>
              </Card>
            </div>

            <p className="text-slate-700 font-semibold">
              Only one tells you what the finance actually costs.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Fees that change outcomes materially</h2>
            <p className="text-slate-600">
              Fees often sit outside the headline rate:
            </p>

            <div className="space-y-3 my-6">
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Establishment fees</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Documentation fees</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Broker margin baked into pricing</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Early exit costs</span>
                </div>
              </div>
            </div>

            <p className="text-slate-600">
              They don't look large individually. Over a full term, they add up.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">How broker remuneration affects pricing</h2>
            <p className="text-slate-600">
              Broker commissions are recovered through pricing.
            </p>
            <p className="text-slate-600">
              That means:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Higher commission = higher margin required</li>
              <li>• Margin is rarely itemised</li>
              <li>• Two identical borrowers can receive different outcomes</li>
            </ul>
            <p className="text-slate-600 mt-4">
              Disclosure doesn't always mean clarity.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Why comparison is harder than it should be</h2>

            <Card className="border-amber-200 bg-amber-50 my-8">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-700">
                      Finance becomes hard to compare when:
                    </p>
                    <ul className="mt-2 space-y-1 text-slate-600">
                      <li>• Rates are negotiable</li>
                      <li>• Fees are fragmented</li>
                      <li>• Incentives are invisible</li>
                    </ul>
                    <p className="text-slate-700 font-medium mt-3">
                      This complexity isn't accidental — it's structural.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">What transparent pricing changes</h2>
            <p className="text-slate-600">
              Fixed pricing removes:
            </p>

            <div className="space-y-3 my-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Negotiation bias</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Commission-driven variability</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Rate ambiguity</span>
                </div>
              </div>
            </div>

            <p className="text-slate-600">
              For eligible borrowers, it produces cleaner, more predictable outcomes.
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
              <Link to="/guides/how-asset-finance-works" className="text-purple-600 hover:text-purple-700 underline">
                How Asset Finance Works
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
