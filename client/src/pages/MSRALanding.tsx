import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, BookOpen, Brain, Users, Target, Award, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const CPS_SPECIALTIES = [
  "Cardiology", "Respiratory", "Neurology", "Gastroenterology",
  "Endocrinology", "Renal", "Rheumatology", "Dermatology",
  "Haematology", "Infectious Disease", "Ophthalmology", "ENT",
  "Psychiatry", "Paediatrics", "Obstetrics & Gynaecology", "Pharmacology",
];

const PD_TOPICS = [
  "Professional integrity and honesty",
  "Patient safety and duty of care",
  "Team working and communication",
  "Prioritisation under pressure",
  "Dealing with colleagues in difficulty",
  "NHS values and professionalism",
  "Consent and confidentiality",
  "Raising concerns and whistleblowing",
];

const FEATURES = [
  { icon: BookOpen, title: "190 CPS Questions", desc: "Single Best Answer across 16 medical specialties" },
  { icon: Users, title: "190 PD Questions", desc: "Ranking and Pick-3 formats covering 8 professional domains" },
  { icon: Clock, title: "Full Mock Exam", desc: "172 questions in 3h 15m — matches the real MSRA format exactly" },
  { icon: Target, title: "Topic Analytics", desc: "Track your accuracy by specialty and PD domain" },
  { icon: Brain, title: "AI Coach", desc: "Ask questions and get instant explanations from our AI tutor" },
  { icon: Award, title: "Review Mode", desc: "Step through every question with full explanations after each mock" },
];

export default function MSRALanding() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleSubscribe = () => {
    if (isAuthenticated) {
      navigate("/msra");
    } else {
      window.location.href = getLoginUrl("/msra");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 mb-6">Now Live</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">MSRA Preparation</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            The most comprehensive Multi-Specialty Recruitment Assessment question bank available. Prepare for both Clinical Problem Solving and Professional Dilemmas with exam-standard questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleSubscribe} size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 text-lg">
              Subscribe Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button onClick={() => navigate("/msra")} variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg">
              View Question Bank
            </Button>
          </div>
        </div>
      </section>

      {/* What is the MSRA */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">What is the MSRA?</h2>
          <div className="prose prose-lg max-w-none text-slate-600 text-center">
            <p>
              The Multi-Specialty Recruitment Assessment (MSRA) is a computer-based exam used for recruitment into GP Training, Psychiatry, Ophthalmology, Radiology, and other specialty training programmes in the UK. It consists of two papers: Clinical Problem Solving (CPS) testing clinical knowledge, and Professional Dilemmas (PD) testing professional judgement and NHS values.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 mt-10">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Clinical Problem Solving (CPS)</h3>
                <p className="text-sm text-blue-700 mb-3">97 questions — Single Best Answer format</p>
                <p className="text-sm text-slate-600">Tests clinical knowledge across all medical specialties. Questions present clinical scenarios requiring diagnosis, investigation, or management decisions.</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-2">Professional Dilemmas (PD)</h3>
                <p className="text-sm text-purple-700 mb-3">75 questions — Ranking and Pick-3 formats</p>
                <p className="text-sm text-slate-600">Tests professional judgement, ethical reasoning, and understanding of NHS values. Scenarios involve workplace dilemmas requiring prioritisation of actions.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Exam Format */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-10">Exam Format</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">172</p>
              <p className="text-sm text-gray-500">Total Questions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">3h 15m</p>
              <p className="text-sm text-gray-500">Time Limit</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">2</p>
              <p className="text-sm text-gray-500">Papers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">No</p>
              <p className="text-sm text-gray-500">Negative Marking</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">What You Get</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <f.icon className="w-8 h-8 text-green-600 mb-3" />
                  <h4 className="font-bold text-slate-900 mb-1">{f.title}</h4>
                  <p className="text-sm text-slate-600">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Specialty Breakdown */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Content Coverage</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-blue-800 mb-4">CPS — 16 Specialties</h3>
              <div className="grid grid-cols-2 gap-2">
                {CPS_SPECIALTIES.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-800 mb-4">PD — 8 Professional Domains</h3>
              <div className="space-y-2">
                {PD_TOPICS.map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple Pricing</h2>
          <p className="text-slate-600 mb-10">Full access to all MSRA content — CPS, PD, mock exams, and analytics.</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-xl mx-auto">
            <Card className="border-2 border-gray-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-500 mb-1">3 Months</p>
                <p className="text-4xl font-bold text-slate-900 mb-1">£25</p>
                <p className="text-xs text-gray-500 mb-4">£8.33/month</p>
                <Button onClick={handleSubscribe} className="w-full bg-slate-900 hover:bg-slate-800 text-white">Get Started</Button>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-500 ring-2 ring-green-200">
              <CardContent className="p-6 text-center relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white">Best Value</Badge>
                <p className="text-sm text-gray-500 mb-1 mt-2">6 Months</p>
                <p className="text-4xl font-bold text-slate-900 mb-1">£40</p>
                <p className="text-xs text-gray-500 mb-4">£6.67/month</p>
                <Button onClick={handleSubscribe} className="w-full bg-green-600 hover:bg-green-700 text-white">Get Started</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to start preparing?</h2>
        <p className="text-slate-600 mb-6">Join thousands of doctors using Question Grove 360 to prepare for their MSRA.</p>
        <Button onClick={handleSubscribe} size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold px-8">
          Start Practising Today
        </Button>
      </section>
    </div>
  );
}
