import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { BookOpen, Brain, Zap, BarChart3, Users, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

function SessionExpiredBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_expired") === "1") {
      setShow(true);
      // Clean up the URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("session_expired");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-gray-900 text-center py-3 px-4 font-medium shadow-md">
      You were signed out after 24 hours of inactivity. Please sign in again to continue.
      <button onClick={() => setShow(false)} className="ml-4 text-gray-800 hover:text-gray-900 font-bold">✕</button>
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Question Grove 360 — Medical Exam Prep Platform";
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SessionExpiredBanner />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">Question Grove 360</span>
          </div>
          <a href={getLoginUrl()} className="inline-flex">
            <Button className="bg-green-600 hover:bg-green-700 text-gray-900">
              Sign In
            </Button>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            One Platform. <span className="text-green-500">Global Success.</span>
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
            <div className="bg-white rounded-xl p-8 border-t-4 border-green-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="text-4xl mb-4">🇬🇧</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">UK Medical Exams</h3>
              <p className="text-gray-600 mb-6">Complete preparation for 15+ UK postgraduate and licensing exams including MRCGP, PLAB, UKMLA, MRCP, and more.</p>
              
              <a href={getLoginUrl()} className="w-full bg-green-600 text-gray-900 py-3 rounded-lg font-semibold hover:bg-green-700 text-center block">
                Access UK Exams →
              </a>
            </div>

            {/* International Exams Card */}
            <div className="bg-white rounded-xl p-8 border-t-4 border-purple-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">International Exams</h3>
              <p className="text-gray-600 mb-6">Complete preparation for 17+ international licensing exams including USMLE, MCCQE, AMC, and Middle East exams.</p>
              
              <a href="/international" className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 text-center block">
                Access International Exams →
              </a>
            </div>
          </div>

          {/* Picture360 Card */}
          <div className="max-w-sm mx-auto">
            <div className="bg-white rounded-xl p-8 border-t-4 border-emerald-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="text-4xl mb-4 text-center">📸</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Picture360</h3>
              <p className="text-gray-600 mb-4 text-center">Dermatology • Ophthalmology • ECG • ENT • Chest X-ray • Paediatrics</p>
              <p className="text-center mb-4"><span className="text-2xl font-bold text-emerald-600">£9</span> <span className="text-gray-500 text-sm">for 3 months</span></p>
              
              <a href="/picture360" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold text-center block transition-colors">
                Buy Now →
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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-500 mb-10 text-sm">Two plans, full access. All prices vs £7.99/month reference rate.</p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* 3-Month */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">3-Month</h3>
              <p className="text-xs text-gray-500 mb-4">Great for focused exam sprints</p>
              <div className="text-4xl font-bold text-gray-900 mb-1">£20</div>
              <div className="text-gray-600 text-sm mb-1">for 3 months</div>
              <div className="text-xs text-gray-400 mb-4">
                <span className="line-through">£23.97</span>
                <span className="ml-1 text-green-600 font-semibold">Save £3.97</span>
              </div>
              <div className="text-xs text-gray-500 mb-4">That's just £6.67/month</div>
              <a href="/pricing" className="block w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors">Get Started</a>
            </div>

            {/* 6-Month - Featured */}
            <div className="relative bg-white rounded-2xl p-6 border-2 border-green-500 shadow-xl text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">Best Value</div>
              <h3 className="text-xl font-bold text-gray-900 mb-1 mt-2">6-Month</h3>
              <p className="text-xs text-gray-500 mb-4">Ideal study timeline</p>
              <div className="text-4xl font-bold text-gray-900 mb-1">£35</div>
              <div className="text-gray-600 text-sm mb-1">for 6 months</div>
              <div className="text-xs text-gray-400 mb-4">
                <span className="line-through">£47.94</span>
                <span className="ml-1 text-green-600 font-semibold">Save £12.94</span>
              </div>
              <div className="text-xs text-gray-500 mb-4">That's just £5.83/month</div>
              <a href="/pricing" className="block w-full bg-green-600 text-gray-900 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors">Get Started</a>
            </div>
          </div>
          
          <p className="text-center text-gray-500 mt-6 text-sm">Payments processed securely by Stripe. Cancel anytime.</p>
        </div>
      </section>

      {/* Advertising Banner Section */}
      <section className="bg-gray-950 border-t border-gray-800 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="relative flex flex-col items-center justify-center rounded-xl border border-gray-700/50 bg-gray-900/60 p-8 min-h-[160px] group hover:border-green-500/30 transition-colors"
              >
                <div className="absolute top-3 right-3 text-[10px] uppercase tracking-wider text-gray-600 font-medium">
                  Ad Space {slot}
                </div>
                <svg
                  className="w-8 h-8 text-gray-600 mb-3 group-hover:text-green-500/60 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
                <p className="text-gray-400 text-sm font-medium mb-2">Advertise with us</p>
                <a
                  href="mailto:advertise@questiongrove360.com"
                  className="text-xs text-green-500 hover:text-green-400 font-medium transition-colors"
                >
                  Contact us →
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs mt-4">
            Reach thousands of medical professionals preparing for UK exams.{" "}
            <a href="mailto:advertise@questiongrove360.com" className="text-green-500/70 hover:text-green-400">
              Learn more about advertising
            </a>
          </p>
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
