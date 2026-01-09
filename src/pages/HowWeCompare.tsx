import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, X, ArrowRight, Clock, Phone, FileText, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "How We Compare - AssetMX vs Traditional Brokers",
  "description": "See how AssetMX is changing SME lending with transparent pricing, no hidden commissions, and a 100% online process.",
  "provider": {
    "@type": "FinancialService",
    "name": "AssetMX",
    "url": "https://assetmx.com.au"
  }
};

export function HowWeCompare() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="AssetMX vs Brokers | See the Real Cost Difference"
        description="Compare AssetMX to traditional finance brokers. No hidden commissions, no $990 origination fees, no rate loading. Just $800 flat fee and same-day approval."
        keywords="asset finance comparison, broker fees Australia, business car loan comparison, equipment finance rates, best asset finance, origination fee"
        canonicalUrl="https://assetmx.com.au/how-we-compare"
        structuredData={structuredData}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display mb-6">
              We're Changing the
              <br />
              <span className="text-pink-300">Goal Posts</span>
            </h1>
            <p className="text-xl text-purple-100 mb-4">
              SME lending shouldn't be this hard. Phone tag with brokers, endless paperwork,
              hidden fees buried in your rate. We built AssetMX to fix that.
            </p>
            <p className="text-lg text-purple-200">
              Simple. Quick. Transparent. Finance that respects your time.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-4 text-slate-900">
            The Old Way is Broken
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            We've all been there. You need finance for your business, but the process feels designed to waste your time.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="border-red-100 bg-red-50/50">
              <CardContent className="pt-6">
                <Phone className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">Endless Phone Calls</h3>
                <p className="text-sm text-slate-600">
                  Waiting for callbacks, chasing brokers, playing phone tag between jobs.
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50/50">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">Paperwork Hell</h3>
                <p className="text-sm text-slate-600">
                  Print this, sign that, fax it over. In 2025. Really?
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50/50">
              <CardContent className="pt-6">
                <Clock className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">Weeks of Waiting</h3>
                <p className="text-sm text-slate-600">
                  Back and forth, more documents, still waiting. Meanwhile your business is on hold.
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50/50">
              <CardContent className="pt-6">
                <X className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">Hidden Fees</h3>
                <p className="text-sm text-slate-600">
                  Thousands in commission buried in your interest rate. You never see it, but you pay it.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* The AssetMX Way */}
      <section className="py-16 bg-gradient-light">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-4 text-slate-900">
            The AssetMX Way
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            We stripped out everything that wastes your time and money. What's left is finance that actually works for business owners.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="border-purple-100 bg-white">
              <CardContent className="pt-6">
                <Zap className="h-8 w-8 text-purple-600 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">100% Online</h3>
                <p className="text-sm text-slate-600">
                  No phone calls needed. Apply from your phone between jobs. We're here if you need us, but you won't have to chase us.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-100 bg-white">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 text-purple-600 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">Smart Documents</h3>
                <p className="text-sm text-slate-600">
                  Upload once. We extract what we need automatically. No printing, no faxing, no 1995.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-100 bg-white">
              <CardContent className="pt-6">
                <Clock className="h-8 w-8 text-purple-600 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">Same-Day Approval</h3>
                <p className="text-sm text-slate-600">
                  Conditional approval in 15 minutes. Settlement same day. Get your asset and get back to work.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-100 bg-white">
              <CardContent className="pt-6">
                <CheckCircle className="h-8 w-8 text-purple-600 mb-4" />
                <h3 className="font-semibold mb-2 text-slate-900">$800 Flat Fee</h3>
                <p className="text-sm text-slate-600">
                  That's it. No hidden commission in your rate. You see exactly what you pay, and you save thousands.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Side by Side Comparison */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            The Numbers Don't Lie
          </h2>

          <div className="max-w-4xl mx-auto">
            <Card className="border-purple-100 shadow-card overflow-hidden">
              <div className="grid md:grid-cols-2">
                {/* Traditional Broker */}
                <div className="p-8 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
                  <h3 className="text-xl font-bold mb-6 text-slate-600">Traditional Broker</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Hidden commission</div>
                        <div className="text-sm text-slate-500">$3,000 - $6,000 buried in your rate</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Origination fee</div>
                        <div className="text-sm text-slate-500">$990 added to your loan</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Rate loading</div>
                        <div className="text-sm text-slate-500">Your rate is 1-2% higher than it should be</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Days to weeks</div>
                        <div className="text-sm text-slate-500">Endless back and forth</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Phone calls required</div>
                        <div className="text-sm text-slate-500">During your work hours</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Paper forms</div>
                        <div className="text-sm text-slate-500">Print, sign, scan, email</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AssetMX */}
                <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50">
                  <h3 className="text-xl font-bold mb-6 text-purple-700">AssetMX</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">$800 flat fee</div>
                        <div className="text-sm text-slate-500">Transparent, upfront, that's it</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">No origination fee</div>
                        <div className="text-sm text-slate-500">$0 extra charges</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Lender base rate</div>
                        <div className="text-sm text-slate-500">No markup, no loading</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">15 minute approval</div>
                        <div className="text-sm text-slate-500">Settlement same day</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">100% self-service</div>
                        <div className="text-sm text-slate-500">Apply on your schedule</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Digital everything</div>
                        <div className="text-sm text-slate-500">Upload, e-sign, done</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-700">Free finance calculator</div>
                        <div className="text-sm text-slate-500">See your real rate in 30 seconds</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Savings Example */}
            <div className="mt-8 bg-gradient-brand rounded-xl p-6 text-white text-center">
              <div className="text-lg mb-2">On a typical $100,000 asset loan</div>
              <div className="text-4xl font-bold mb-2">You save $4,000+</div>
              <div className="text-purple-200">versus a traditional broker</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Built This */}
      <section className="py-16 bg-gradient-light">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display text-center mb-8 text-slate-900">
              Why We Built AssetMX
            </h2>
            <div className="prose prose-lg mx-auto text-slate-600">
              <p>
                We've seen too many business owners get a raw deal. Tradies who just want to buy an excavator
                and get back to work. Delivery drivers who need a van yesterday. Small business owners who
                don't have time to sit on hold.
              </p>
              <p>
                The traditional finance model is built around brokers, not businesses. Brokers make money
                by loading your rate - the higher they push it, the more commission they earn. And you
                never see that cost because it's hidden in your interest payments.
              </p>
              <p>
                We think that's broken. So we built something different.
              </p>
              <p>
                <strong>$800 flat fee.</strong> That's our entire margin. We make the same whether you
                borrow $50,000 or $500,000. Which means we have zero incentive to push you into a bigger
                loan or a higher rate.
              </p>
              <p>
                <strong>100% online.</strong> Because your time is worth money. No phone calls, no
                paperwork, no waiting. Apply from your phone, get approved fast, settle the same day.
              </p>
              <p>
                This is what SME lending should look like in 2025. Simple, transparent, and built for
                people who have actual work to do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-ivory">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto bg-gradient-brand border-0 shadow-2xl shadow-purple-900/30">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-display mb-4 text-white">
                Ready to Try a Better Way?
              </h2>
              <p className="text-lg text-purple-100 mb-6">
                Get your transparent quote in 30 seconds. See the real rate. No credit check required.
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
