import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-900/10 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="flex items-center">
              {/* Logo Mark - Purple/Pink Gradient */}
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-purple-900/20">
                  <span className="text-white font-bold text-xl tracking-tight">A</span>
                </div>
                {/* Decorative accent */}
                <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 border-2 border-white shadow-sm" />
              </div>
              {/* Logo Text */}
              <div className="ml-3">
                <span className="text-xl font-bold tracking-tight">
                  <span className="text-slate-900">Asset</span>
                  <span className="text-gradient-brand">MX</span>
                </span>
                <div className="text-[10px] text-slate-500 font-semibold -mt-0.5 tracking-widest uppercase">
                  Transparent Finance
                </div>
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <a
              href="#calculator"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-purple-700 transition-colors rounded-lg hover:bg-purple-50"
            >
              Calculator
            </a>
            <a
              href="#how-it-works"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-purple-700 transition-colors rounded-lg hover:bg-purple-50"
            >
              How It Works
            </a>
            <div className="relative group">
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-purple-700 transition-colors rounded-lg hover:bg-purple-50">
                Products
                <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
              </button>
              {/* Dropdown */}
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-purple-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                <div className="py-2 px-1">
                  <a href="#vehicles" className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 rounded-lg transition-all">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-700 text-xs font-bold">V</span>
                    </div>
                    Vehicle Finance
                  </a>
                  <a href="#equipment" className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 rounded-lg transition-all">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-700 text-xs font-bold">E</span>
                    </div>
                    Equipment Finance
                  </a>
                  <a href="#trucks" className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 rounded-lg transition-all">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-700 text-xs font-bold">T</span>
                    </div>
                    Truck & Trailer
                  </a>
                  <a href="#technology" className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 rounded-lg transition-all">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-700 text-xs font-bold">IT</span>
                    </div>
                    Technology Finance
                  </a>
                </div>
              </div>
            </div>
            <a
              href="#about"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-purple-700 transition-colors rounded-lg hover:bg-purple-50"
            >
              About
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-slate-600 hover:text-purple-700 hover:bg-purple-50"
            >
              Login
            </Button>
            <Button className="bg-gradient-brand hover:opacity-90 text-white shadow-lg shadow-purple-900/25 border-0">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-purple-100 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1">
              <a
                href="#calculator"
                className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Calculator
              </a>
              <a
                href="#how-it-works"
                className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                How It Works
              </a>
              <a
                href="#products"
                className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Products
              </a>
              <a
                href="#about"
                className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                About
              </a>
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-purple-100">
                <Button
                  variant="outline"
                  className="w-full justify-center border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  Login
                </Button>
                <Button className="w-full justify-center bg-gradient-brand hover:opacity-90 text-white shadow-lg shadow-purple-900/25">
                  Get Started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
