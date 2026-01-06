import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, TrendingDown, Clock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  "name": "Truck & Trailer Finance",
  "description": "Finance for prime movers, rigid trucks and trailers with transparent $800 flat fee",
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
        title="Truck Finance Australia | Prime Mover & Trailer Finance | $800 Flat Fee"
        description="Finance your prime mover, rigid truck or trailer with transparent pricing. Kenworth, Mack, Volvo, Freightliner - no broker markup, just $800 flat fee. Fast approval for transport operators."
        keywords="truck finance Australia, prime mover finance, trailer finance, Kenworth finance, Mack truck finance, rigid truck loan, transport finance, fleet truck finance, semi trailer finance"
        canonicalUrl="https://assetmx.com.au/truck-finance"
        structuredData={structuredData}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900" />

        {/* Hero content */}
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display mb-6">
                Truck & Trailer
                <br />
                <span className="text-pink-300">Finance That Delivers</span>
              </h1>
              <p className="text-xl text-slate-200 mb-8 max-w-lg">
                From single prime movers to entire fleets - get the transparent financing
                your transport business deserves. No hidden commissions, ever.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/chat-apply">
                  <Button size="lg" className="bg-white text-slate-800 hover:bg-slate-50 shadow-lg">
                    Get Your Quote <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  See How We Compare
                </Button>
              </div>
            </div>

            {/* Hero image - Kenworth/Prime Mover */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=600&fit=crop"
                  alt="Kenworth truck - Australian prime mover"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating price card */}
              <Card className="absolute -bottom-6 -left-6 shadow-xl border-0">
                <CardContent className="p-4">
                  <div className="text-sm text-slate-500 mb-1">Example: $350,000 prime mover</div>
                  <div className="text-2xl font-bold text-gradient-brand">~$6,850/mo</div>
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
            Trucks & Trailers We Finance
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Heavy haulage to light commercial - same transparent pricing across the board.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Prime Movers */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src="https://images.unsplash.com/photo-1586191582066-a28793f0c8d5?w=600&h=400&fit=crop"
                  alt="Kenworth prime mover - Australian trucking"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Prime Movers</h3>
                <p className="text-slate-500 mb-4">
                  Kenworth, Mack, Freightliner, Volvo - the power behind Australian freight.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    New & used financing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Fleet packages available
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Rigid Trucks */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&h=400&fit=crop"
                  alt="Rigid truck - Medium freight vehicle"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Rigid Trucks</h3>
                <p className="text-slate-500 mb-4">
                  Isuzu, Hino, Fuso - reliable rigid bodies for local and metro deliveries.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Body & fitout included
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Quick approval
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Trailers */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src="https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=600&h=400&fit=crop"
                  alt="Semi-trailer on highway"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Trailers</h3>
                <p className="text-slate-500 mb-4">
                  Flat tops, curtainsiders, refrigerated - complete your fleet with transparent finance.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    All trailer types
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Bundled with prime mover
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why AssetMX */}
      <section className="py-16 bg-gradient-light">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            Why Transport Operators Choose Us
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Massive Savings</h3>
              <p className="text-slate-500">
                On a $350k prime mover, traditional brokers hide $7,000+ in commission.
                We charge $800 flat. You do the maths.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Fast Turnaround</h3>
              <p className="text-slate-500">
                We know time is money in transport. Conditional approval in 15 minutes,
                settle the same week. Get your truck on the road faster.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Industry Experience</h3>
              <p className="text-slate-500">
                We understand the transport industry. Seasonal cash flow, fleet requirements,
                and what lenders are looking for.
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
                Ready to Grow Your Fleet?
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
            AssetMX is a trading name of Blackrock Leasing Pty Ltd (trading as millarX)
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
