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
  "name": "Equipment Finance",
  "description": "Finance for excavators, loaders and construction equipment with transparent $800 flat fee",
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

export function EquipmentFinance() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="Equipment Finance Australia | Excavator & Loader Finance | $800 Flat Fee"
        description="Finance your excavator, loader or construction equipment with transparent pricing. CAT, Komatsu, Hitachi, Kubota - no broker markup, just $800 flat fee. Fast approval for tradies and contractors."
        keywords="equipment finance Australia, excavator finance, loader finance, construction equipment loan, CAT finance, Komatsu finance, earthmoving finance, skid steer finance, machinery loan"
        canonicalUrl="https://assetmx.com.au/equipment-finance"
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
                Equipment Finance
                <br />
                <span className="text-pink-300">Designed for Business Owners</span>
              </h1>
              <p className="text-lg text-purple-100 mb-4">
                Plumbers, builders, landscapers, electricians - stop paying inflated hire costs.
                Own your equipment and benefit from tax deductions and depreciation.
              </p>
              <p className="text-sm text-purple-200 mb-8 max-w-lg">
                We don't provide financial advice - always check with your accountant or advisor
                about the best option for your situation.
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

            {/* Hero image - Excavator */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={getImageUrl('hero-excavator.jpg')}
                  alt="CAT excavator on construction site"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating price card */}
              <Card className="absolute -bottom-6 -left-6 shadow-xl border-0">
                <CardContent className="p-4">
                  <div className="text-sm text-slate-500 mb-1">Example: $120,000 excavator</div>
                  <div className="text-2xl font-bold text-gradient-brand">~$2,340/mo</div>
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
            Equipment We Finance
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            From mini excavators to road-registered gear - same transparent pricing for all mobile equipment.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Excavators */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('excavators.jpg')}
                  alt="Excavator digging on construction site"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Excavators</h3>
                <p className="text-slate-500 mb-4">
                  CAT, Komatsu, Hitachi, Kubota - from mini excavators to 30+ tonne machines.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    All sizes & brands
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Attachments included
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Loaders & Skid Steers */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('loaders.jpg')}
                  alt="Wheel loader moving materials"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Loaders & Skid Steers</h3>
                <p className="text-slate-500 mb-4">
                  Wheel loaders, skid steers, compact track loaders - versatile workhorses for any site.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    New & used machines
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Quick approval
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Earthmoving & Graders */}
            <Card className="border-purple-100 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('earthmoving.jpg')}
                  alt="Bulldozer on earthmoving site"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Earthmoving</h3>
                <p className="text-slate-500 mb-4">
                  Dozers, graders, rollers, scrapers - the heavy machinery that shapes Australia.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Major projects welcome
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Fleet financing
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Equipment Types */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-display text-center mb-8 text-slate-900">
            We Also Finance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center">
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Cranes</div>
              <div className="text-sm text-slate-500">All types</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Forklifts</div>
              <div className="text-sm text-slate-500">Electric & diesel</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Generators</div>
              <div className="text-sm text-slate-500">All sizes</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Compressors</div>
              <div className="text-sm text-slate-500">Industrial</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Concrete Gear</div>
              <div className="text-sm text-slate-500">Pumps & mixers</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Scaffolding</div>
              <div className="text-sm text-slate-500">Systems & access</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Welding Gear</div>
              <div className="text-sm text-slate-500">Industrial</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-light">
              <div className="font-semibold text-slate-900">Trailers</div>
              <div className="text-sm text-slate-500">Plant & equipment</div>
            </div>
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
                        <strong className="text-slate-700">$120,000 excavator:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>Base rate: 7.0%</li>
                          <li>Your rate: 8.5% (hidden markup)</li>
                          <li>Hidden commission: ~$5,000</li>
                          <li>Phone calls and paperwork</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-purple-700">AssetMX</h3>
                    <div className="space-y-3 text-sm text-slate-500">
                      <div>
                        <strong className="text-slate-700">$120,000 excavator:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>Base rate: 7.0%</li>
                          <li>Your rate: 7.0% (no markup)</li>
                          <li>Transparent fee: $800</li>
                          <li>100% online, same-day approval</li>
                        </ul>
                      </div>
                      <p className="font-medium text-purple-600 pt-2">You save ~$4,200</p>
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
            Why Tradies & Contractors Choose Us
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Transparent Savings</h3>
              <p className="text-slate-500">
                Equipment finance brokers typically hide $2,000-$5,000 in your rate.
                We charge a flat $800 fee. Simple.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Get Back to Work</h3>
              <p className="text-slate-500">
                No endless paperwork. No waiting for broker callbacks.
                Apply online in 10 minutes, get approved fast.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">We Get Construction</h3>
              <p className="text-slate-500">
                Built by people who understand equipment values, depreciation,
                and what lenders want to see from construction businesses.
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
                Ready to Finance Your Equipment?
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
