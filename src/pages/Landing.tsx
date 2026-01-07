import { QuoteCalculator } from '@/components/calculator/QuoteCalculator';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, TrendingDown, Zap, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { getImageUrl } from '@/lib/supabase';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FinancialService",
  "name": "AssetMX",
  "description": "Transparent asset finance for Australian businesses. $800 flat fee, no hidden broker commissions. Vehicle, truck, equipment and EV finance.",
  "url": "https://assetmx.com.au",
  "logo": "https://assetmx.com.au/logo.svg",
  "areaServed": "Australia",
  "priceRange": "$800 flat fee",
  "sameAs": [],
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "AU"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "127"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Asset Finance Products",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "FinancialProduct",
          "name": "Vehicle Finance",
          "description": "Finance for utes, vans, cars and commercial vehicles"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "FinancialProduct",
          "name": "Truck & Van Finance",
          "description": "Finance for rigid trucks and commercial vans"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "FinancialProduct",
          "name": "Equipment Finance",
          "description": "Finance for excavators, loaders and construction equipment"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "FinancialProduct",
          "name": "Electric Vehicle Finance",
          "description": "Finance and novated lease options for electric vehicles including Tesla, BYD and European EVs"
        }
      }
    ]
  }
};

export function Landing() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="AssetMX | Asset Finance Australia | $800 Flat Fee | No Hidden Broker Fees"
        description="Transparent asset finance for Australian businesses. No hidden broker commissions - just $800 flat fee. Vehicle, truck, equipment and EV finance. 15-minute approval, 100% online."
        keywords="asset finance Australia, business finance, equipment finance, vehicle finance, truck finance, EV finance, electric vehicle finance, novated lease, no broker fees, transparent finance, chattel mortgage, commercial loan, ABN finance"
        canonicalUrl="https://assetmx.com.au"
        structuredData={structuredData}
      />
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section id="calculator" className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-display mb-6">
            $800 flat.
            <br />
            <span className="text-gradient-brand">That's it.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-4 font-sans">
            No hidden commissions. No rate loading.
            <br className="hidden md:block" />
            Just honest asset finance for established businesses.
          </p>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-sans">
            Traditional brokers hide $3,000-$6,000 in commission by marking up your interest rate.
            We don't. See your real rate in 30 seconds.
          </p>
        </div>

        {/* Calculator - Above the Fold */}
        <div className="mb-20">
          <QuoteCalculator />
        </div>

        {/* Social Proof */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="border-purple-100 shadow-soft hover:shadow-card transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-mono font-bold text-gradient-brand mb-2">$4,500</div>
              <div className="text-sm text-slate-500">Average saving vs brokers</div>
            </CardContent>
          </Card>
          <Card className="border-purple-100 shadow-soft hover:shadow-card transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-mono font-bold text-gradient-brand mb-2">15min</div>
              <div className="text-sm text-slate-500">To conditional approval</div>
            </CardContent>
          </Card>
          <Card className="border-purple-100 shadow-soft hover:shadow-card transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-mono font-bold text-gradient-brand mb-2">100%</div>
              <div className="text-sm text-slate-500">Self-service online</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What We Finance */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-4 text-slate-900">
            What We Finance
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Same $800 flat fee across all asset types. No hidden commissions, no matter what you're financing.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Vehicles */}
            <Link to="/vehicle-finance" className="group">
              <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img
                    src={getImageUrl('hero-ranger.jpg')}
                    alt="Ute and vehicle finance"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Vehicles</h3>
                      <p className="text-sm text-slate-500">Utes, vans, cars & 4WDs</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Trucks & Vans */}
            <Link to="/truck-finance" className="group">
              <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img
                    src={getImageUrl('hero-truck.jpg')}
                    alt="Truck and van finance"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Trucks & Vans</h3>
                      <p className="text-sm text-slate-500">Rigid trucks & commercial vans</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Equipment */}
            <Link to="/equipment-finance" className="group">
              <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img
                    src={getImageUrl('hero-excavator.jpg')}
                    alt="Equipment and machinery finance"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Equipment</h3>
                      <p className="text-sm text-slate-500">Excavators, loaders & machinery</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Electric Vehicles */}
            <Link to="/ev-leasing" className="group">
              <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img
                    src={getImageUrl('hero-ev.jpg')}
                    alt="Electric vehicle finance"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Electric Vehicles</h3>
                      <p className="text-sm text-slate-500">Tesla, BYD & European EVs</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gradient-light py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-gradient-brand text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-purple-900/20">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Quick Chat</h3>
              <p className="text-slate-500">
                Answer a few simple questions - just like texting a mate. We'll check your ABN instantly and
                give you a real quote in under 2 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-brand text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-purple-900/20">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Review & Confirm</h3>
              <p className="text-slate-500">
                We'll show you a summary of everything. Check it looks right, make any changes, then upload
                your ID and financials. That's it - no paperwork.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-brand text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-purple-900/20">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Get Approved</h3>
              <p className="text-slate-500">
                Conditional approval in 15 minutes. E-sign your contracts and we'll settle same day.
                You're done - with $4,000+ saved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Comparison */}
      <section className="py-16 bg-ivory">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            The Difference is Clear
          </h2>
          <div className="max-w-4xl mx-auto">
            <Card className="mb-8 border-purple-100 shadow-card">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-slate-600">
                      Traditional Broker Model
                    </h3>
                    <div className="space-y-3 text-sm text-slate-500">
                      <div>
                        <strong className="text-slate-700">$100,000 equipment loan:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>• Base rate: 7.0%</li>
                          <li>• Shown rate: 8.5% (rate loading)</li>
                          <li>• Hidden commission: $1,500+</li>
                          <li>• Phone calls and delays</li>
                        </ul>
                      </div>
                      <p className="text-sm pt-2 text-slate-400">
                        Commission built into your interest rate
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-purple-700">
                      AssetMX Model
                    </h3>
                    <div className="space-y-3 text-sm text-slate-500">
                      <div>
                        <strong className="text-slate-700">$100,000 equipment loan:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>• Base rate: 7.0%</li>
                          <li>• Shown rate: 7.0% (no markup)</li>
                          <li>• Transparent fee: $800</li>
                          <li>• Fast online process</li>
                        </ul>
                      </div>
                      <p className="text-sm pt-2 font-medium text-purple-600">
                        You see exactly what you pay
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
              <h4 className="font-bold text-lg mb-3 text-slate-900">Why we can offer transparent pricing:</h4>
              <p className="text-slate-600">
                Our digital-first platform means lower operating costs, which we pass on to you.
                No expensive offices, no sales teams, no hidden fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="about" className="bg-gradient-light py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            Why Choose AssetMX
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center mb-3">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-900">Transparent Pricing</h3>
                <p className="text-sm text-slate-500">
                  Lender base rate + $800 flat fee. No markup. No hidden costs. Ever.
                </p>
              </CardContent>
            </Card>
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center mb-3">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-900">Smart Document Processing</h3>
                <p className="text-sm text-slate-500">
                  Upload your documents once. We extract and verify the details automatically, then confirm with you.
                </p>
              </CardContent>
            </Card>
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center mb-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-900">For Established Businesses</h3>
                <p className="text-sm text-slate-500">
                  Designed for businesses with 2+ years trading history and good credit.
                </p>
              </CardContent>
            </Card>
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center mb-3">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-900">No Sales Pressure</h3>
                <p className="text-sm text-slate-500">
                  100% self-service. No phone calls. No upselling. Apply on your terms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-ivory">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto bg-gradient-brand border-0 shadow-2xl shadow-purple-900/30">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-display mb-4 text-white">
                Ready to Save $4,000+?
              </h2>
              <p className="text-lg text-purple-100 mb-6">
                Get your transparent quote above, then apply online in 10 minutes.
              </p>
              <Link to="/chat-apply">
                <Button size="lg" className="text-lg px-8 py-6 bg-white text-purple-800 hover:bg-purple-50 shadow-lg">
                  Start Your Application
                </Button>
              </Link>
              <p className="text-sm text-purple-200 mt-4">
                No credit check until you submit. No obligation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-purple-900 py-12">
        <div className="container mx-auto px-4">
          {/* Main Footer Content */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            {/* Footer Logo */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <span className="text-lg font-bold text-white">
                  Asset<span className="text-pink-400">MX</span>
                </span>
                <div className="text-[10px] text-purple-300 font-medium tracking-wider uppercase">
                  Transparent Finance
                </div>
              </div>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-purple-200">
              <a href="/privacy" className="hover:text-pink-400 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-pink-400 transition-colors">Terms of Service</a>
              <a href="/credit-guide" className="hover:text-pink-400 transition-colors">Credit Guide</a>
              <a href="/contact" className="hover:text-pink-400 transition-colors">Contact</a>
            </div>
          </div>

          {/* Regulatory Information */}
          <div className="border-t border-purple-800 pt-6 text-center">
            <p className="text-xs text-purple-300 max-w-3xl mx-auto mb-4">
              AssetMX is a trading name of Blackrock Leasing Pty Ltd
              <br className="hidden sm:block" />
              ABN 15 681 267 818 | Australian Credit Licence 569484
            </p>
            <p className="text-xs text-purple-400 max-w-3xl mx-auto mb-4">
              Credit is provided by various lenders. Approval subject to lender criteria.
              Not all applications will be approved. Terms, conditions, fees and charges apply.
              Please read our <a href="/credit-guide" className="underline hover:text-pink-400">Credit Guide</a> before
              applying.
            </p>
            <p className="text-xs text-purple-400">
              © {new Date().getFullYear()} Blackrock Leasing Pty Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
