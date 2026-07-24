import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mail, Clock, BookOpen, Brain, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const MSRA_HIGHLIGHTS = [
  "Clinical Problem Solving (SBA + EMQ)",
  "Professional Dilemmas (Ranking + Pick 3)",
  "MSRA Flashcards with spaced repetition",
  "AI Coach360 study assistant",
  "Full mock MSRA exams",
  "Detailed performance analytics",
];

export default function MSRA() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const joinWaitlist = trpc.msra.joinWaitlist.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const result = await joinWaitlist.mutateAsync({ email: email.trim() });
      toast.success(result.message);
      setSubmitted(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to join waitlist. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">MSRA Question Bank</h1>
              <p className="text-sm text-slate-500">Multi-Specialty Recruitment Assessment</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Coming Soon Banner */}
        <Card className="p-8 sm:p-12 text-center mb-10 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Clock className="w-4 h-4" />
            Coming Soon
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            MSRA Preparation
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            MSRA Clinical Problem Solving and Professional Dilemmas question bank — coming soon.
            Join the waitlist to be notified when we launch.
          </p>

          {/* Email Capture Form */}
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-green-700 bg-green-100 rounded-lg px-6 py-4 max-w-md mx-auto">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">You're on the list! We'll email you when MSRA launches.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={joinWaitlist.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold whitespace-nowrap"
              >
                {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          )}
        </Card>

        {/* What's Included */}
        <Card className="p-8 sm:p-10">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            What's Coming
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {MSRA_HIGHLIGHTS.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Pricing Preview */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-3 font-medium">Planned pricing:</p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                <span className="text-lg font-bold text-slate-900">£25</span>
                <span className="text-sm text-slate-500 ml-1">/ 3 months</span>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                <span className="text-lg font-bold text-slate-900">£40</span>
                <span className="text-sm text-slate-500 ml-1">/ 6 months</span>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
