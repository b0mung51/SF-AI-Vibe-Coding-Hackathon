'use client';

import { Calendar, Clock, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn('google', { 
        callbackUrl: '/onboarding',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsSigningIn(false);
    }
  };
  
  // Redirect authenticated users to dashboard or onboarding
  useEffect(() => {
    if (status === 'authenticated') {
      // Check if user has completed onboarding
      // For now, redirect to dashboard - the dashboard will handle onboarding redirect
      router.push('/dashboard');
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return null;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">CalConnect</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How it Works
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Smart Calendar
            <span className="text-blue-600"> Scheduling</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline meeting coordination with AI-powered suggestions and visual calendar overlays. 
            Connect with Google Calendar and schedule meetings in seconds, not emails.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button 
              onClick={handleGoogleSignIn}
              disabled={isSigningIn || status === 'loading'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              {isSigningIn || status === 'loading' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
            <button className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
              Watch Demo
            </button>
          </div>

          {/* Hero Image/Preview */}
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl mx-auto">
            <div className="bg-gray-100 rounded-lg h-64 md:h-96 flex items-center justify-center">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Interactive Calendar Preview</p>
                <p className="text-sm text-gray-500 mt-2">3-day overlay with AI suggestions</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to schedule meetings efficiently and professionally.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Suggestions</h3>
              <p className="text-gray-600">
                Get smart meeting suggestions: Quick 30min, First Hour, Morning Coffee, Lunch, and Dinner slots.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Visual Overlay</h3>
              <p className="text-gray-600">
                See 3-day calendar with color-coded availability. Red for busy, yellow for yours, green for mutual free time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Sharing</h3>
              <p className="text-gray-600">
                Share your availability via username or link. Others can schedule with you instantly without back-and-forth emails.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">One-Click Booking</h3>
              <p className="text-gray-600">
                Confirm meetings with deep-links to Google/Outlook Calendar or auto-book via Cal.com integration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 4-step process.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in with Google</h3>
              <p className="text-gray-600">
                Connect your Google Calendar and grant calendar permissions for seamless integration.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Set Working Hours</h3>
              <p className="text-gray-600">
                Configure your availability, working hours, lunch breaks, and timezone preferences.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Share Your Link</h3>
              <p className="text-gray-600">
                Get a personalized scheduling link to share with colleagues, clients, and contacts.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule & Confirm</h3>
              <p className="text-gray-600">
                Use AI suggestions or manual selection to book meetings with one-click confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-6 w-6" />
                <span className="text-lg font-bold">CalConnect</span>
              </div>
              <p className="text-gray-400">
                Smart calendar scheduling for modern professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CalConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
