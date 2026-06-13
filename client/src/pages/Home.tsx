import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { BookOpen, Brain, Zap, BarChart3, Users, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">Question Grove 360</span>
          </div>
          <a href={getLoginUrl()} className="inline-flex">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              Sign In
            </Button>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            One Platform. <span className="text-teal-500">Global Success.</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            The world's most advanced medical exam preparation platform.
          </p>
        </div>
      </section>

      {/* Two Exam Access Cards */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Choose Your Path</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* UK Medical Exams Card */}
            <div className="bg-white rounded-xl p-8 border-t-4 border-teal-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="text-4xl mb-4">🇬🇧</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">UK Medical Exams</h3>
              <p className="text-gray-600 mb-6">Complete preparation for 15+ UK postgraduate and licensing exams including MRCGP, PLAB, UKMLA, MRCP, and more.</p>
              
              <a href={getLoginUrl()} className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 text-center block">
                Access UK Exams →
              </a>
            </div>

            {/* International Exams Card */}
            <div className="bg-white rounded-xl p-8 border-t-4 border-purple-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">International Exams</h3>
              <p className="text-gray-600 mb-6">Complete preparation for 17+ international licensing exams including USMLE, MCCQE, AMC, and Middle East exams.</p>
              
              <a href={getLoginUrl()} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 text-center block">
                Access International Exams →
              </a>
            </div>
          </div>

          {/* Picture Album Card */}
          <div className="max-w-sm mx-auto">
            <div className="bg-white rounded-xl p-8 border-t-4 border-orange-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="text-4xl mb-4 text-center">📸</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Picture Album</h3>
              <p className="text-gray-600 mb-4 text-center">Dermatology • Ophthalmology • ECG</p>
              <p className="text-center text-gray-700 font-semibold mb-6">£9 / 3 months — Standalone product</p>
              
              <a href={getLoginUrl()} className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 text-center block">
                Browse Albums →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Grid */}
      <section className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Premium Features</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "📚", title: "Question Bank", desc: "50,000+ carefully curated questions" },
              { icon: "🧠", title: "AI Coach360", desc: "Personalized AI tutor with performance context" },
              { icon: "⚡", title: "SCA Simulator", desc: "Real-time voice-based patient roleplay" },
              { icon: "📊", title: "Mock Exams", desc: "Full-length timed exams with detailed analytics" },
              { icon: "📝", title: "Note360", desc: "Exam-focused revision notes by specialty" },
              { icon: "🎴", title: "Pattern Recognition", desc: "Spaced repetition flashcards with mastery tracking" },
            ].map((feature, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition-all">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-500 mb-10 text-sm">All plans vs £7.99/month reference rate. The longer you commit, the more you save.</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* 3-Month */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">3-Month</h3>
              <p className="text-xs text-gray-500 mb-4">Focused exam prep sprint</p>
              <div className="text-4xl font-bold text-gray-900 mb-1">£20</div>
              <div className="text-gray-600 text-sm mb-1">for 3 months</div>
              <div className="text-xs text-gray-400 mb-4">
                <span className="line-through">£23.97</span>
                <span className="ml-1 text-teal-600 font-semibold">Save £3.97</span>
              </div>
              <a href="/pricing" className="block w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors">Get Started</a>
            </div>

            {/* 6-Month - Featured */}
            <div className="relative bg-white rounded-2xl p-6 border-2 border-teal-500 shadow-xl text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-bold">Most Popular</div>
              <h3 className="text-xl font-bold text-gray-900 mb-1 mt-2">6-Month</h3>
              <p className="text-xs text-gray-500 mb-4">Ideal study timeline</p>
              <div className="text-4xl font-bold text-gray-900 mb-1">£35</div>
              <div className="text-gray-600 text-sm mb-1">for 6 months</div>
              <div className="text-xs text-gray-400 mb-4">
                <span className="line-through">£47.94</span>
                <span className="ml-1 text-teal-600 font-semibold">Save £12.94</span>
              </div>
              <a href="/pricing" className="block w-full bg-teal-600 text-white py-2.5 rounded-lg font-semibold hover:bg-teal-700 transition-colors">Get Started</a>
            </div>

            {/* Annual */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Annual</h3>
              <p className="text-xs text-gray-500 mb-4">Best value — full year</p>
              <div className="text-4xl font-bold text-gray-900 mb-1">£60</div>
              <div className="text-gray-600 text-sm mb-1">for 12 months</div>
              <div className="text-xs text-gray-400 mb-4">
                <span className="line-through">£95.88</span>
                <span className="ml-1 text-teal-600 font-semibold">Save £35.88</span>
              </div>
              <a href="/pricing" className="block w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors">Get Started</a>
            </div>
          </div>
          
          <p className="text-center text-gray-500 mt-6 text-sm">3-day access coupons available from admin on request</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center gap-6 mb-6 flex-wrap">
            <a href="#" className="hover:text-white">About</a>
            <a href="#" className="hover:text-white">Contact</a>
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms</a>
          </div>
          <p>Made with ❤️ for medical professionals worldwide</p>
        </div>
      </footer>
    </div>
  );
}
