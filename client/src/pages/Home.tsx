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
              <p className="text-gray-600 mb-4">MRCGP AKT • MRCGP SCA • PLAB 1 & 2 • UKMLA • MSRA • MRCP • MRCPCH • MRCS • MRCOG • and more</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-teal-600 font-bold">✓</span> 15+ UK postgraduate exams
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-teal-600 font-bold">✓</span> SCA consultation simulator with instant feedback
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-teal-600 font-bold">✓</span> AKT question bank 1,600+ questions
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-teal-600 font-bold">✓</span> PLAB 1 & 2 full preparation
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-teal-600 font-bold">✓</span> Note360 revision notes
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-teal-600 font-bold">✓</span> Pattern Recognition flashcards
                </div>
              </div>
              
              <a href={getLoginUrl()} className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 text-center block">
                Access UK Exams →
              </a>
            </div>

            {/* International Exams Card */}
            <div className="bg-white rounded-xl p-8 border-t-4 border-purple-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">International Exams</h3>
              <p className="text-gray-600 mb-4">USMLE Steps 1-3 • MCCQE Canada • AMC Australia • FMGE India • DHA UAE • HAAD • SCFHS Saudi Arabia • and more</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-purple-600 font-bold">✓</span> 17+ international licensing exams
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-purple-600 font-bold">✓</span> USMLE Steps 1, 2 CK, 3
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-purple-600 font-bold">✓</span> MCCQE1 & MCCQE2 Canada
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-purple-600 font-bold">✓</span> AMC MCQ & Clinical Australia
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-purple-600 font-bold">✓</span> Middle East licensing exams
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-purple-600 font-bold">✓</span> Spaced repetition algorithm
                </div>
              </div>
              
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
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Simple, Transparent Pricing</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Single Exam Monthly", price: "£7.99", period: "/month" },
              { name: "Single Exam 3-Month", price: "£20", period: "/3 months" },
              { name: "UK All-Access Monthly", price: "£39.99", period: "/month", featured: true },
              { name: "UK All-Access 3-Month", price: "£99.99", period: "/3 months", featured: true },
              { name: "International Monthly", price: "£39.99", period: "/month" },
              { name: "International 3-Month", price: "£99.99", period: "/3 months" },
            ].map((plan, i) => (
              <div key={i} className={`rounded-lg p-6 ${plan.featured ? 'bg-teal-600 text-white ring-2 ring-teal-600' : 'bg-white border border-gray-200'}`}>
                <h3 className="font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-1">{plan.price}</div>
                <div className={plan.featured ? 'text-teal-100' : 'text-gray-600'}>{plan.period}</div>
              </div>
            ))}
          </div>
          
          <p className="text-center text-gray-600 mt-8">Free trials assigned manually — contact us</p>
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
