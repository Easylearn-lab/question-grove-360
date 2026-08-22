import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";

export default function JAMBDashboard() {
  const [, navigate] = useLocation();
  const { data: subjects, isLoading } = trpc.jamb.getSubjects.useQuery();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button onClick={() => navigate("/international/nigeria")} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to Nigeria exams</button>
          <div className="flex items-center gap-3"><span className="text-4xl">🎓</span><div><h1 className="text-3xl font-bold text-slate-900">JAMB UTME</h1><p className="text-slate-600 mt-1">Choose a subject and practise with CBT-style questions, timers, answers, and explanations.</p></div></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="rounded-2xl border border-green-200 bg-green-50 p-5 mb-8"><div className="flex gap-3"><span className="text-xl">ℹ️</span><p className="text-sm leading-6 text-green-900">UTME candidates take <strong>Use of English plus three other subjects</strong> selected for their intended course. Your Question Grove 360 subscription covers all available JAMB subjects.</p></div></section>
        <div className="flex items-end justify-between gap-4 mb-6"><div><h2 className="text-xl font-bold text-slate-900">Choose a subject</h2><p className="text-sm text-slate-500 mt-1">Subjects are ordered to match the Question Grove 360 JAMB study pathway.</p></div><span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">12 subjects</span></div>

        {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-48 bg-white rounded-xl border animate-pulse" />)}</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{subjects?.map((subject) => <button key={subject.slug} type="button" disabled={!subject.active} onClick={() => subject.active && navigate(`/international/nigeria/jamb/${subject.slug}`)} className={`relative rounded-xl border p-6 text-left transition-all ${subject.active ? "bg-white border-green-200 shadow-sm hover:shadow-md hover:border-green-400 hover:-translate-y-0.5" : "bg-slate-100 border-slate-200 opacity-70 cursor-not-allowed"}`}>
          <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${subject.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>{subject.active ? "Ready" : "Coming soon"}</span>
          <span className="text-3xl block mb-3">{subject.icon}</span><h3 className="text-lg font-bold text-slate-900">{subject.name}</h3><p className="text-sm text-slate-600 mt-2 min-h-10">{subject.description}</p><div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">{subject.questionCount} questions</span><span className={subject.active ? "font-semibold text-green-700" : "text-slate-400"}>{subject.active ? "Start practising →" : "In development"}</span></div>
        </button>)}</div>}
      </main>
    </div>
  );
}
