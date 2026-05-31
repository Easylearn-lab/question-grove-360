import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { BookOpen, Brain, Zap, BarChart3, Users, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Master Medical Exams with <span className="bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">AI-Powered Learning</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              The world's most advanced medical exam preparation platform. From MRCGP to USMLE, master every specialty with intelligent question banks, AI coaching, and real-time clinical simulations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={getLoginUrl()} className="inline-flex">
                <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  Start Learning <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <Button size="lg" variant="outline" className="border-slate-300">
                View Pricing
              </Button>
            </div>
            <div className="mt-12 flex items-center gap-8">
              <div>
                <div className="text-3xl font-bold text-slate-900">50K+</div>
                <div className="text-slate-600">Questions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">100+</div>
                <div className="text-slate-600">Exams</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">98%</div>
                <div className="text-slate-600">Pass Rate</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-blue-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Premium Features</h2>
            <p className="text-xl text-slate-300">Everything you need to excel in your medical exams</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: "Question Bank",
                description: "50,000+ carefully curated questions with detailed explanations and references"
              },
              {
                icon: Brain,
                title: "AI Coach360",
                description: "Personalized AI assistant that learns your weak areas and provides targeted guidance"
              },
              {
                icon: Zap,
                title: "SCA Simulator",
                description: "Real-time voice-based AI patient consultations with instant feedback"
              },
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description: "Track your progress with detailed performance metrics and pass probability"
              },
              {
                icon: Award,
                title: "Mock Exams",
                description: "Full-length timed exams with realistic scoring and comprehensive reviews"
              },
              {
                icon: Users,
                title: "Study Community",
                description: "Connect with peers, share insights, and learn together"
              }
            ].map((feature, idx) => (
              <Card key={idx} className="bg-slate-800 border-slate-700 p-8 hover:border-teal-500 transition-colors">
                <feature.icon className="w-12 h-12 text-teal-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-slate-300">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Exam Coverage Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Comprehensive Exam Coverage</h2>
          <p className="text-xl text-slate-600">Prepare for every major medical licensing and postgraduate exam</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">UK Exams</h3>
            <ul className="space-y-3">
              {["MRCGP AKT & SCA", "PLAB 1 & 2", "UKMLA", "MSRA", "MRCP", "MRCPCH", "MRCS", "MRCOG"].map((exam) => (
                <li key={exam} className="flex items-center gap-3 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  {exam}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-8 border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">International Exams</h3>
            <ul className="space-y-3">
              {["USMLE Steps 1-3", "MCCQE", "AMC", "FMGE", "PMDC", "DHA Dubai", "HAAD Abu Dhabi"].map((exam) => (
                <li key={exam} className="flex items-center gap-3 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  {exam}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Study?</h2>
          <p className="text-xl mb-8 text-teal-100">Join thousands of medical students and junior doctors preparing for success</p>
          <a href={getLoginUrl()} className="inline-flex">
            <Button size="lg" className="bg-white text-teal-600 hover:bg-slate-100 gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg"></div>
                <span className="font-bold text-white">Question Grove 360</span>
              </div>
              <p className="text-sm text-slate-400">The world's leading medical exam preparation platform</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Exams</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2026 Question Grove 360. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
