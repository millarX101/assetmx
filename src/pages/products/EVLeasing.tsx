import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Zap, Leaf, Calculator, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { getImageUrl } from '@/lib/supabase';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  "name": "Electric Vehicle Leasing",
  "description": "EV leasing and novated lease options for electric vehicles in Australia",
  "provider": {
    "@type": "FinancialService",
    "name": "AssetMX",
    "url": "https://assetmx.com.au"
  },
  "areaServed": "Australia",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "AUD",
    "description": "BYO finance or full novated leasing through millarX"
  }
};

export function EVLeasing() {
  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="Electric Vehicle Leasing Australia | EV Finance & Novated Lease | AssetMX"
        description="Finance your electric vehicle with flexible options. BYO finance for your existing salary package or full novated leasing through our sister company millarX. Tesla, BYD, BMW iX and more."
        keywords="EV leasing Australia, electric vehicle finance, novated lease EV, Tesla finance, BYD finance, electric car lease, salary sacrifice EV, FBT exempt electric vehicle"
        canonicalUrl="https://assetmx.com.au/ev-leasing"
        structuredData={structuredData}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient - green tint for EV */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-800" />

        {/* Hero content */}
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
                <Zap className="h-4 w-4 text-yellow-300" />
                <span className="text-sm text-emerald-100">FBT Exempt until 2027</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display mb-6">
                Electric Vehicle
                <br />
                <span className="text-emerald-300">Leasing</span>
              </h1>
              <p className="text-xl text-emerald-100 mb-4 max-w-lg">
                Go electric and save on tax. Whether you've got an existing salary package
                or want the full novated lease experience - we've got options.
              </p>
              <p className="text-sm text-emerald-200 mb-8 max-w-lg">
                BYO finance for your existing package, or full novated leasing through our sister company millarX.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/chat-apply">
                  <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 shadow-lg">
                    Get Your Quote <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#options">
                  <Button size="lg" variant="outline" className="border-white/50 text-white bg-white/10 hover:bg-white/20">
                    See Your Options
                  </Button>
                </a>
              </div>
            </div>

            {/* Hero image - EV */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={getImageUrl('hero-ev.jpg')}
                  alt="Tesla Model 3 electric vehicle"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating savings card */}
              <Card className="absolute -bottom-6 -left-6 shadow-xl border-0">
                <CardContent className="p-4">
                  <div className="text-sm text-slate-500 mb-1">Example: $65,000 EV</div>
                  <div className="text-2xl font-bold text-emerald-600">Save $15k+ in tax</div>
                  <div className="text-xs text-slate-400">via novated lease</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Two Options Section */}
      <section id="options" className="py-16 bg-ivory">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-4 text-slate-900">
            Two Ways to Finance Your EV
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Already have a salary packaging arrangement? Or want the full novated lease experience? We've got you covered either way.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* BYO Finance Option */}
            <Card className="border-purple-200 shadow-card hover:shadow-lg transition-all overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                <h3 className="text-2xl font-display mb-2">BYO Finance</h3>
                <p className="text-purple-100">For existing salary packages</p>
              </div>
              <CardContent className="pt-6">
                <p className="text-slate-600 mb-6">
                  Already have a novated lease arrangement with your employer? We can provide just the finance component - you keep your existing salary packaging provider.
                </p>
                <ul className="space-y-3 text-sm text-slate-600 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Competitive rates with our transparent $800 flat fee</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Works with any salary packaging provider</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Quick approval - we just handle the finance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>No hidden broker commissions</span>
                  </li>
                </ul>
                <Link to="/chat-apply">
                  <Button className="w-full bg-gradient-brand hover:opacity-90">
                    Get BYO Finance Quote
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Full Novated Lease Option */}
            <Card className="border-emerald-200 shadow-card hover:shadow-lg transition-all overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-display mb-2">Full Novated Lease</h3>
                    <p className="text-emerald-100">Through millarX</p>
                  </div>
                  <div className="bg-white/20 rounded-lg px-3 py-1 text-sm">
                    Sister Company
                  </div>
                </div>
              </div>
              <CardContent className="pt-6">
                <p className="text-slate-600 mb-6">
                  Want the complete package? Our sister company millarX handles everything - from salary packaging setup with your employer to ongoing management.
                </p>
                <ul className="space-y-3 text-sm text-slate-600 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Full salary packaging setup and management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Running costs included (fuel, rego, insurance, servicing)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>FBT exempt for eligible EVs (huge tax savings)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Employer setup support included</span>
                  </li>
                </ul>
                <a href="https://millarx.com.au" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Visit millarX <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* EVs We Finance */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-4 text-slate-900">
            Electric Vehicles We Finance
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            From affordable Chinese EVs to premium European electric vehicles - we finance them all.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Tesla */}
            <Card className="border-slate-200 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('ev-tesla.jpg')}
                  alt="Tesla Model 3 and Model Y"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Tesla</h3>
                <p className="text-slate-500 mb-4">
                  Model 3, Model Y, Model S, Model X - Australia's most popular EVs.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    FBT exempt models
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Fast approval
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* BYD & Chinese */}
            <Card className="border-slate-200 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('ev-byd.jpg')}
                  alt="BYD Atto 3 electric vehicle"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">BYD & Others</h3>
                <p className="text-slate-500 mb-4">
                  Atto 3, Seal, Dolphin, MG ZS EV - great value electric options.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Affordable entry point
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    All brands welcome
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* European EVs */}
            <Card className="border-slate-200 shadow-soft hover:shadow-card transition-all hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[16/10] relative">
                <img
                  src={getImageUrl('ev-european.jpg')}
                  alt="BMW iX electric SUV"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">European EVs</h3>
                <p className="text-slate-500 mb-4">
                  BMW iX, Mercedes EQS, Audi e-tron, Porsche Taycan - premium electric.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Luxury EV specialists
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Competitive rates
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FBT Exemption Explainer */}
      <section className="py-16 bg-emerald-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 mb-4">
                <Leaf className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 font-medium">Tax Savings</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display mb-4 text-slate-900">
                The EV FBT Exemption Explained
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Electric vehicles under $91,387 (2024-25) are exempt from Fringe Benefits Tax until 2027.
                This means massive tax savings compared to petrol or diesel vehicles.
              </p>
            </div>

            <Card className="border-emerald-200 shadow-card">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-slate-600">Without FBT Exemption</h3>
                    <div className="space-y-3 text-sm text-slate-500">
                      <div>
                        <strong className="text-slate-700">$65,000 petrol vehicle:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>Annual FBT: ~$13,000</li>
                          <li>You pay tax on the benefit</li>
                          <li>Reduces your tax savings significantly</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-emerald-700">With FBT Exemption (EV)</h3>
                    <div className="space-y-3 text-sm text-slate-500">
                      <div>
                        <strong className="text-slate-700">$65,000 electric vehicle:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>Annual FBT: $0</li>
                          <li>Full salary sacrifice benefit</li>
                          <li>Maximum tax savings</li>
                        </ul>
                      </div>
                      <p className="font-medium text-emerald-600 pt-2">Save $15,000+ per year in tax</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-slate-500 mt-6">
              This is general information only - speak to your accountant or tax advisor for advice specific to your situation.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gradient-light">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display text-center mb-12 text-slate-900">
            Why Finance Your EV with Us?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Transparent Pricing</h3>
              <p className="text-slate-500">
                Flat $800 fee for BYO finance. No hidden broker commissions eating into your savings.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">EV Specialists</h3>
              <p className="text-slate-500">
                We understand EV financing inside out - residual values, FBT rules, and the best structures for your situation.
              </p>
            </div>

            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Full Service via millarX</h3>
              <p className="text-slate-500">
                Need the complete novated lease package? Our sister company millarX handles everything end-to-end.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-ivory">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto bg-gradient-to-br from-emerald-600 to-teal-700 border-0 shadow-2xl shadow-emerald-900/30">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-display mb-4 text-white">
                Ready to Go Electric?
              </h2>
              <p className="text-lg text-emerald-100 mb-6">
                Get a quote for BYO finance, or chat to millarX about full novated leasing.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/chat-apply">
                  <Button size="lg" className="text-lg px-8 py-6 bg-white text-emerald-800 hover:bg-emerald-50 shadow-lg">
                    Get BYO Finance Quote
                  </Button>
                </Link>
                <a href="https://millarx.com.au" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white/50 text-white bg-white/10 hover:bg-white/20">
                    Full Novated via millarX
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-900 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-emerald-300 max-w-3xl mx-auto">
            AssetMX is a trading name of Blackrock Leasing Pty Ltd
            <br />
            ABN 15 681 267 818 | Australian Credit Licence 569484
          </p>
          <p className="text-xs text-emerald-400 mt-4">
            © {new Date().getFullYear()} Blackrock Leasing Pty Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
