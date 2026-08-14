import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Heart,
  Scissors,
  Users,
  Baby,
  Brain,
  Stethoscope,
  Pill,
  Scale,
  Target,
  Zap,
  BarChart3,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useExamAccess } from "@/hooks/useExamAccess";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { getLoginUrl } from "@/const";

const SPECIALTIES = [
  { name: "Medicine", icon: Heart, questions: 150, description: "Cardiology, Respiratory, Renal, Endocrine, Neurology, Haematology, Rheumatology, Infectious Disease" },
  { name: "Surgery", icon: Scissors, questions: 100, description: "General Surgery, Orthopaedics, Urology, Vascular, Breast, Endocrine, Paediatric Surgery" },
  { name: "Obstetrics & Gynaecology", icon: Users, questions: 100, description: "Antenatal care, Labour, Postpartum, Gynaecological malignancy, Contraception, Fertility" },
  { name: "Paediatrics", icon: Baby, questions: 100, description: "Neonatal, Developmental, Respiratory, Cardiology, Neurology, Safeguarding, Endocrine" },
  { name: "Psychiatry", icon: Brain, questions: 50, description: "Mood disorders, Psychosis, Anxiety, Substance misuse, Eating disorders, Personality disorders" },
  { name: "GP & Public Health", icon: Stethoscope, questions: 100, description: "Primary care, Screening, Health promotion, Epidemiology, Chronic disease management" },
  { name: "Clinical Pharmacology", icon: Pill, questions: 48, description: "Drug interactions, Adverse effects, Prescribing, Pharmacokinetics, Therapeutics" },
  { name: "Ethics & Law", icon: Scale, questions: 0, description: "Consent, Capacity, Confidentiality, End-of-life, Safeguarding, Professional duties" },
];

const FEATURES = [
  { icon: BookOpen, title: "648+ SBA Questions", description: "Exam-standard single best answer questions across all 8 UKMLA specialties" },
  { icon: Clock, title: "Full Mock Exams", description: "180-question timed mocks replicating the real 3-hour PLAB 1 format" },
  { icon: Target, title: "Topic-Level Filtering", description: "Drill into specific topics within each specialty to target your weak areas" },
  { icon: Zap, title: "Spaced Repetition", description: "Intelligent question weighting that prioritises topics you struggle with" },
  { icon: BarChart3, title: "Progress Analytics", description: "Track accuracy by specialty and topic with visual dashboards" },
  { icon: GraduationCap, title: "Detailed Explanations", description: "Every question has a full explanation for each option, not just the correct answer" },
];

export default function PLAB1Landing() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { hasAccess, isLoading: accessLoading } = useExamAccess("PLAB1");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  // If user already has access, redirect to the specialties page
  if (!accessLoading && hasAccess) {
    navigate("/plab1/specialties");
    return null;
  }

  const handleSubscribe = async (planKey: string) => {
    if (!isAuthenticated) {
      localStorage.setItem("plab1_pending_purchase", planKey);
      window.location.href = getLoginUrl("/plab1");
      return;
    }
    setLoadingPlan(planKey);
    try {
      const result = await createCheckout.mutateAsync({ planKey });
      if (result.url) {
        toast.info("Redirecting to checkout...");
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-500">Back to Home</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <GraduationCap className="w-4 h-4" />
          UK Licensing Exam for International Medical Graduates
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
          Pass PLAB 1 with Confidence
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
          648+ exam-standard SBA questions, full-length 180-question mock exams, and topic-level analytics
          to help you identify and eliminate your weak areas before exam day.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base"
            onClick={() => handleSubscribe("PLAB1_6MONTH")}
            disabled={!!loadingPlan}
          >
            {loadingPlan === "PLAB1_6MONTH" ? "Loading..." : "Subscribe — £35 for 6 months"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-8 py-3 text-base"
            onClick={() => handleSubscribe("PLAB1_3MONTH")}
            disabled={!!loadingPlan}
          >
            {loadingPlan === "PLAB1_3MONTH" ? "Loading..." : "£20 for 3 months"}
          </Button>
        </div>
      </section>

      {/* Exam Format Info */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <h3 className="font-semibold text-slate-900 mb-4 text-center">PLAB 1 Exam Format</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-700">180</p>
              <p className="text-sm text-slate-600">SBA Questions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">3 hrs</p>
              <p className="text-sm text-slate-600">Duration</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">~63%</p>
              <p className="text-sm text-slate-600">Pass Mark</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">5</p>
              <p className="text-sm text-slate-600">Options (A-E)</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Everything You Need to Pass</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-green-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Specialty Breakdown */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">8 Specialties Covered</h2>
          <p className="text-slate-500 text-center mb-8">Mapped to the full UKMLA content map</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SPECIALTIES.map((s) => (
              <Card key={s.name} className="p-4 hover:border-green-200 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-4 h-4 text-green-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm">{s.name}</h3>
                    <p className="text-xs text-green-600 font-medium mb-1">
                      {s.questions > 0 ? `${s.questions} questions` : "Coming soon"}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Simple Pricing</h2>
        <p className="text-slate-500 text-center mb-8">Full access to all PLAB 1 content, mock exams, and analytics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* 3-Month Plan */}
          <Card className="p-6 text-center hover:border-green-300 transition-colors">
            <h3 className="font-semibold text-slate-900 mb-1">3-Month Access</h3>
            <p className="text-sm text-slate-500 mb-4">Great for focused exam sprints</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-slate-900">£20</span>
              <span className="text-slate-500 text-sm"> / 3 months</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">£6.67/month</p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleSubscribe("PLAB1_3MONTH")}
              disabled={!!loadingPlan}
            >
              {loadingPlan === "PLAB1_3MONTH" ? "Loading..." : "Get Started"}
            </Button>
          </Card>

          {/* 6-Month Plan (Popular) */}
          <Card className="p-6 text-center border-green-300 ring-2 ring-green-100 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Best Value
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">6-Month Access</h3>
            <p className="text-sm text-slate-500 mb-4">Ideal study timeline</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-slate-900">£35</span>
              <span className="text-slate-500 text-sm"> / 6 months</span>
            </div>
            <p className="text-xs text-green-600 font-medium mb-4">Save £12.94 vs monthly</p>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleSubscribe("PLAB1_6MONTH")}
              disabled={!!loadingPlan}
            >
              {loadingPlan === "PLAB1_6MONTH" ? "Loading..." : "Get Started"}
            </Button>
          </Card>
        </div>

        {/* What's included */}
        <div className="mt-8 max-w-md mx-auto">
          <p className="text-sm font-medium text-slate-700 mb-3 text-center">Both plans include:</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              "Full question bank (648+ questions)",
              "180-question timed mock exams",
              "Topic-level filtering and analytics",
              "Spaced repetition targeting weak areas",
              "AI Coach360 assistant",
              "Detailed per-option explanations",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-12 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to start preparing?</h2>
          <p className="text-slate-300 mb-6">Join hundreds of international medical graduates preparing for PLAB 1 with Question Grove 360.</p>
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8"
            onClick={() => handleSubscribe("PLAB1_6MONTH")}
            disabled={!!loadingPlan}
          >
            {loadingPlan === "PLAB1_6MONTH" ? "Loading..." : "Subscribe Now — £35 for 6 months"}
          </Button>
        </div>
      </section>
    </div>
  );
}
