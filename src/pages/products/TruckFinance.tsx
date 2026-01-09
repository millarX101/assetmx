import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, TrendingDown, Clock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { getImageUrl } from '@/lib/supabase';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  "name": "Truck Finance Australia",
  "description": "Truck and van finance for rigid trucks, vans and light commercial vehicles. Transparent $800 flat fee, no hidden broker fees.",
  "provider": {
    "@type": "FinancialService",
    "name": "AssetMX",
    "url": "https://assetmx.com.au"
  },
  "areaServed": "Australia",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "AUD",
    "price": "800",
    "description": "Flat fee - no hidden commissions"
  }
};

export function TruckFinance() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="Truck Finance Australia | No Hidden Broker Fees"
        description="Truck and van finance with transparent pricing. Isuzu, Hino, Fuso, Transit, Sprinter - no broker markup, no origination fee, just $800 flat. Fast approval for business owners."
        keywords="truck finance Australia, rigid truck finance, van finance, Isuzu truck finance, Hino finance, commercial van loan, light truck finance, business vehicle finance, truck loan SME"
        canonicalUrl="https://assetmx.com.au/truck-finance"
        structuredData={structuredData}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient - on brand purple */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800" />

        {/* Hero content */}
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display mb-6">
                Truck Finance
                <br />
                <span className="text-pink-300">Without Hidden Broker Fees</span>
              </h1>
              <p className="text-lg text-purple-100 mb-4">
                Delivery drivers, tradies, removalists, couriers - get your business moving
                with transparent finance. No hidden broker commissions, just honest rates.
              </p>
              <p className="text-sm text-purple-200 mb-8 max-w-lg">
                From small rigid trucks to commercial vans - same $800 flat fee for all.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/chat-apply">
                  <Button size="lg" className="bg-white text-purple-800 hover:bg-purple-50 shadow-lg">
                    Get Your Quote <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/how-we-compare">
                  <Button size="lg" variant="outline" className="border-white/50 text-white bg-white/10 hover:bg-white/20">
                    See How We Compare
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero image - Rigid Truck */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={getImageUrl('hero-truck.jpg')}
                  alt="Isuzu rigid truck for business"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating price card */}
              <Card className="absolute -bottom-6 -left-6 shadow-xl border-0">
                <CardContent className="p-4">
                  <div className="text-sm text-slate-500 mb-1">Example: $85,000 rigid truck</div>
                  <div className="text-2xl font-bold text-gradient-brand">~$1,650/mo</div>
                  <div className="text-xs text-slate-400">5 years @ 6.45%</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What We Finance */}
      <section className="py-16 bg-ivory">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-4 text-slate-900">
            Trucks & Vans We Finance
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Light commercial to medium rigid - same transparent pricing across the board.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Small Rigid Trucks */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('rigid-trucks.jpg')}
                  alt="Small rigid truck for deliveries"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Small Rigid Trucks</h3>
                <p className="text-slate-500 mb-4">
                  Isuzu, Hino, Fuso, UD - reliable workhorses for local deliveries and trades.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Tray, tipper & pantech bodies
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Body & fitout included
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Commercial Vans */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('vans.jpg')}
                  alt="Commercial van for business"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Commercial Vans</h3>
                <p className="text-slate-500 mb-4">
                  Transit, Sprinter, HiAce, Crafter - perfect for tradies, couriers and deliveries.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    All sizes & configurations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Fitout finance included
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Light Trucks */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('light-trucks.jpg')}
                  alt="Light truck for business use"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Light Trucks</h3>
                <p className="text-slate-500 mb-4">
                  Cab chassis, tray backs, service bodies - versatile options for any business.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    New & used financing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Quick approval
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            The Difference is Clear
          </h2>
          <div className="max-w-4xl mx-auto">
            <Card className="border-purple-100 shadow-card">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-slate-600">Traditional Broker</h3>
                    <div className="space-y-3 text-sm text-slate-500">
                      <div>
                        <strong className="text-slate-700">$85,000 truck loan:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>Base rate: 7.0%</li>
                          <li>Your rate: 8.5% (hidden markup)</li>
                          <li>Hidden commission: ~$3,500</li>
                          <li>Phone calls and paperwork</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-purple-700">AssetMX</h3>
                    <div className="space-y-3 text-sm text-slate-500">
                      <div>
                        <strong className="text-slate-700">$85,000 truck loan:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>Base rate: 7.0%</li>
                          <li>Your rate: 7.0% (no markup)</li>
                          <li>Transparent fee: $800</li>
                          <li>100% online, same-day approval</li>
                        </ul>
                      </div>
                      <p className="font-medium text-purple-600 pt-2">You save ~$2,700</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why AssetMX */}
      <section className="py-16 bg-gradient-light">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            Why Business Owners Choose Us
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Transparent Savings</h3>
              <p className="text-slate-500">
                Traditional brokers hide thousands in commission in your rate.
                We charge $800 flat. Simple and transparent.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Fast Turnaround</h3>
              <p className="text-slate-500">
                We know you need to get moving. Conditional approval in 15 minutes,
                settle the same week. Get your vehicle on the road faster.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">We Get Business</h3>
              <p className="text-slate-500">
                Built for business owners who need reliable vehicles to keep their
                operations running. No complicated processes, just results.
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
                Ready to Finance Your Truck or Van?
              </h2>
              <p className="text-lg text-purple-100 mb-6">
                Get your transparent quote in 30 seconds. No credit check required.
              </p>
              <Link to="/chat-apply">
                <Button size="lg" className="text-lg px-8 py-6 bg-white text-purple-800 hover:bg-purple-50 shadow-lg">
                  Get Started Now
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
