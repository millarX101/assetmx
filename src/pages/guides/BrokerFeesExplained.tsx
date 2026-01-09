import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, X, Car } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Business Car Finance for Australian SMEs (No Broker Noise)",
  "description": "Business car finance should be straightforward. Learn how it actually works without the dealer incentives, broker layers, and vague pricing.",
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

export function BrokerFeesExplained() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="Business Car Finance Australia | No Broker Noise"
        description="Business car finance should be straightforward. Learn how it works without dealer incentives, broker layers, and vague pricing. Built for clarity."
        keywords="business car finance, car finance SME, business vehicle finance, car loan Australia, dealer finance vs direct, chattel mortgage car, fixed price car finance"
        canonicalUrl="https://assetmx.com.au/guides/broker-fees-explained"
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
              Business Car Finance
              <br />
              <span className="text-pink-300">for Australian SMEs</span>
            </h1>
            <p className="text-xl text-purple-100">
              Business car finance should be straightforward. In practice, it's often wrapped in dealer incentives, broker layers, and vague pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <article className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-lg prose-slate">

            <p className="lead text-xl text-slate-600">
              Here's how it actually works.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Business car finance vs personal loans</h2>

            <Card className="border-purple-100 my-8">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Car className="h-8 w-8 text-purple-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Business car finance:</h3>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        Is secured against the vehicle
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        Is assessed on business strength
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        Is priced on asset risk
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-slate-600">
              Personal loans are structured differently and usually cost more for business use.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Common structures</h2>
            <p className="text-slate-600">
              Most business vehicles are financed using:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• <strong>Chattel mortgages</strong></li>
              <li>• <strong>Finance leases</strong></li>
            </ul>
            <p className="text-slate-600 mt-4">
              Balloon payments reduce repayments but increase total exposure. They're a tool — not a discount.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Dealer finance: convenience has a cost</h2>
            <p className="text-slate-600">
              Dealer-arranged finance prioritises speed and simplicity.
            </p>
            <p className="text-slate-600">
              That convenience is often funded through:
            </p>

            <div className="space-y-3 my-6">
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Higher embedded margin</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Limited pricing transparency</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Reduced comparability</span>
                </div>
              </div>
            </div>

            <p className="text-slate-600">
              It's not wrong — but it is rarely the cheapest option.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Why clean borrowers often overpay</h2>
            <p className="text-slate-600">
              Traditional pricing pools borrowers together.
            </p>
            <p className="text-slate-600">
              Low-risk businesses subsidise higher-risk ones unless pricing is segmented properly.
            </p>
            <p className="text-slate-700 font-semibold mt-4">
              Transparent models separate risk instead of averaging it.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Fixed-price business car finance</h2>
            <p className="text-slate-600">
              Fixed pricing exists because:
            </p>
            <ul className="space-y-1 text-slate-600">
              <li>• Risk is known</li>
              <li>• Admin is minimal</li>
              <li>• Negotiation adds no value</li>
            </ul>
            <p className="text-slate-600 mt-4">
              It's built for businesses that want the system to do the work — not a salesperson.
            </p>

            <h2 className="text-2xl font-display text-slate-900 mt-12 mb-4">Eligibility (clear by design)</h2>
            <p className="text-slate-600">
              Transparent models typically require:
            </p>

            <div className="space-y-3 my-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Established Australian businesses</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Clean credit</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Standard vehicles</span>
                </div>
              </div>
            </div>

            <p className="text-slate-600">
              Clarity filters bad fits early — which benefits everyone.
            </p>

            <div className="mt-12 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <p className="text-slate-700 text-lg italic">
                Asset finance doesn't need to be complicated.<br />
                It just needs to be honest.
              </p>
            </div>

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
              <Link to="/guides/advertised-rates-misleading" className="text-purple-600 hover:text-purple-700 underline">
                Why Advertised Rates Are Misleading
              </Link>
              <Link to="/car-finance" className="text-purple-600 hover:text-purple-700 underline">
                Car Finance
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
