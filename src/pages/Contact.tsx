import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { supabase } from '@/lib/supabase';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact AssetMX",
  "description": "Get in touch with AssetMX for transparent asset finance. Email info@assetmx.com.au or use our contact form.",
  "provider": {
    "@type": "FinancialService",
    "name": "AssetMX",
    "url": "https://assetmx.com.au",
    "email": "info@assetmx.com.au"
  }
};

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Store in Supabase contact_submissions table
      // Using type assertion as table may not be in generated types yet
      const { error: submitError } = await (supabase
        .from('contact_submissions') as ReturnType<typeof supabase.from>)
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          subject: formData.subject,
          message: formData.message
        } as Record<string, unknown>);

      if (submitError) {
        // If table doesn't exist, fall back to email link
        console.warn('Contact form submission error:', submitError);
        // Open email client as fallback
        window.location.href = `mailto:info@assetmx.com.au?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\n${formData.message}`)}`;
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Contact form error:', err);
      setError('Something went wrong. Please email us directly at info@assetmx.com.au');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory">
      <SEO
        title="Contact Us | AssetMX | Asset Finance Australia"
        description="Get in touch with AssetMX for transparent asset finance. Questions about vehicle, truck or equipment finance? We're here to help."
        keywords="contact AssetMX, asset finance enquiry, finance questions, business finance help"
        canonicalUrl="https://assetmx.com.au/contact"
        structuredData={structuredData}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800" />
        <div className="relative container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl font-display mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-purple-100">
              Questions about finance? Need help with your application? We're here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-display mb-6 text-slate-900">
                Contact Information
              </h2>

              <div className="space-y-6">
                <Card className="border-purple-100">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Email</h3>
                        <a
                          href="mailto:info@assetmx.com.au"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          info@assetmx.com.au
                        </a>
                        <p className="text-sm text-slate-500 mt-1">
                          We typically respond within a few hours
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-100">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Phone</h3>
                        <p className="text-slate-600">Coming soon</p>
                        <p className="text-sm text-slate-500 mt-1">
                          We're a digital-first platform, but phone support is on the way
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-100">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Response Time</h3>
                        <p className="text-slate-600">Usually within a few hours</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Monday to Friday, 9am - 5pm AEST
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Links */}
              <div className="mt-8">
                <h3 className="font-semibold text-slate-900 mb-4">Quick Links</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <a href="/chat-apply" className="text-purple-600 hover:text-purple-700">
                      Start a finance application
                    </a>
                  </p>
                  <p>
                    <a href="/how-we-compare" className="text-purple-600 hover:text-purple-700">
                      Learn how we compare to brokers
                    </a>
                  </p>
                  <p>
                    <a href="/credit-guide" className="text-purple-600 hover:text-purple-700">
                      Read our Credit Guide
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-display mb-6 text-slate-900">
                Send Us a Message
              </h2>

              {isSubmitted ? (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Message Sent!
                    </h3>
                    <p className="text-slate-600">
                      Thanks for reaching out. We'll get back to you as soon as possible.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-purple-100">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your@email.com"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="0400 000 000"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <select
                          id="subject"
                          name="subject"
                          required
                          value={formData.subject}
                          onChange={handleChange}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Select a topic</option>
                          <option value="General enquiry">General enquiry</option>
                          <option value="Finance application help">Finance application help</option>
                          <option value="Quote question">Quote question</option>
                          <option value="Existing application">Existing application</option>
                          <option value="Partnership enquiry">Partnership enquiry</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="How can we help?"
                          rows={5}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                      </div>

                      {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-gradient-brand hover:opacity-90"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send Message'
                        )}
                      </Button>

                      <p className="text-xs text-slate-500 text-center">
                        Or email us directly at{' '}
                        <a href="mailto:info@assetmx.com.au" className="text-purple-600">
                          info@assetmx.com.au
                        </a>
                      </p>
                    </form>
                  </CardContent>
                </Card>
              )}
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
