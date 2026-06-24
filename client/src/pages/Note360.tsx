import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, BookMarked, Zap, Heart, Brain, Stethoscope, Pill, Baby, Bone, Eye, Activity } from "lucide-react";
import { Streamdown } from "streamdown";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useSubscription } from "@/hooks/useSubscription";
import { trpc } from "@/lib/trpc";

const SPECIALTIES = [
  { id: "Respiratory", name: "Respiratory", icon: Activity, color: "bg-blue-100 text-blue-600" },
  { id: "Gastroenterology", name: "Gastroenterology", icon: Stethoscope, color: "bg-green-100 text-green-600" },
  { id: "Dermatology", name: "Dermatology", icon: Eye, color: "bg-cyan-100 text-cyan-600" },
  { id: "Cardiology", name: "Cardiology", icon: Heart, color: "bg-red-100 text-red-600" },
  { id: "Neurology", name: "Neurology", icon: Brain, color: "bg-purple-100 text-purple-600" },
  { id: "Renal", name: "Renal", icon: Pill, color: "bg-amber-100 text-amber-600" },
  { id: "Paediatrics", name: "Paediatrics", icon: Baby, color: "bg-pink-100 text-pink-600" },
  { id: "Orthopaedics", name: "Orthopaedics", icon: Bone, color: "bg-orange-100 text-orange-600" },
];

export default function Note360() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  const { isPremium, isLoading: subLoading } = useSubscription();

  // Fetch notes when specialty is selected
  const { data: notes = [], isLoading: notesLoading } = trpc.note360.getBySpecialty.useQuery(
    selectedSpecialty || "",
    { enabled: !!selectedSpecialty }
  );

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const filteredNotes = notes.filter((note) =>
    (note.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Note detail view
  if (selectedNote) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-slate-900">{selectedNote.title}</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-8 border-slate-200">
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">{selectedNote.title || "Note"}</h1>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">{selectedNote.specialty}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full">{selectedNote.niceGuideline}</span>
              </div>
            </div>
            <div className="prose prose-slate max-w-none">
              <Streamdown>{selectedNote.examPearl || "No additional content available."}</Streamdown>
            </div>
            {selectedNote.niceUrl && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <a
                  href={selectedNote.niceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 font-semibold"
                >
                  View NICE Guideline →
                </a>
              </div>
            )}
          </Card>
        </main>
      </div>
    );
  }

  // Specialty notes list
  if (selectedSpecialty) {
    const specialtyInfo = SPECIALTIES.find((s) => s.id === selectedSpecialty);
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSpecialty(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">{specialtyInfo?.name || "Notes"}</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Search */}
          <div className="mb-8 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {notesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <BookMarked className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Notes Yet</h3>
              <p className="text-slate-600">Notes for this specialty are being prepared. Check back soon.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className="p-6 border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => setSelectedNote(note)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-green-700 transition-colors">{note.title || "Untitled"}</h3>
                    <BookMarked className="w-5 h-5 text-green-600 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">{note.niceGuideline}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <span className="text-xs text-slate-500">
                      {note.lastUpdated ? new Date(note.lastUpdated).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Specialty grid
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Note360</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <SubscriptionGate isPremium={isPremium} featureName="Note360 Revision Notes">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Choose a Specialty</h2>
            <p className="text-slate-600 max-w-lg mx-auto">
              Comprehensive revision notes organised by specialty. Each topic includes high-yield exam pearls for exam preparation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SPECIALTIES.map((specialty) => {
              const Icon = specialty.icon;
              return (
                <Card
                  key={specialty.id}
                  className="p-6 border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => { setSelectedSpecialty(specialty.id); setSearchQuery(""); }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${specialty.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-green-700 transition-colors">
                    {specialty.name}
                  </h3>
                  <p className="text-sm text-slate-600">Revision notes available</p>
                </Card>
              );
            })}
          </div>
        </SubscriptionGate>
      </main>
    </div>
  );
}
