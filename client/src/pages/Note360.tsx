import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, BookMarked, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

const NOTES = [
  {
    id: 1,
    title: "Acute Coronary Syndrome",
    specialty: "Cardiology",
    exam: "MRCGP AKT",
    highYieldCount: 12,
    content: `# Acute Coronary Syndrome

## Definition
ACS is a spectrum of acute myocardial ischemia ranging from unstable angina to STEMI.

## Classification
- **STEMI**: ST elevation MI (>1mm in contiguous leads)
- **NSTEMI**: Non-ST elevation MI (troponin elevation without ST elevation)
- **Unstable Angina**: Chest pain without troponin elevation

## Risk Factors
- Age, male sex
- Smoking
- Hypertension
- Diabetes
- Hyperlipidemia
- Family history
- Obesity
- Sedentary lifestyle

## Clinical Presentation
- Central chest pain (crushing, pressure)
- Radiation to arm, jaw, back
- Associated dyspnea, nausea, diaphoresis
- May be silent in elderly/diabetics

## Investigations
- **ECG**: ST changes, T wave inversion
- **Troponin**: High sensitivity troponin at 0 and 3 hours
- **CXR**: Pulmonary edema, cardiomegaly
- **Echocardiography**: Wall motion abnormalities

## Management
- Aspirin 300mg
- P2Y12 inhibitor (clopidogrel, ticagrelor, prasugrel)
- Beta-blockers
- ACE inhibitors
- Statins
- PCI vs thrombolysis depending on presentation`,
    lastUpdated: "2026-05-20",
  },
  {
    id: 2,
    title: "Chronic Kidney Disease",
    specialty: "Renal",
    exam: "MRCP Part 1",
    highYieldCount: 8,
    content: `# Chronic Kidney Disease

## Stages
- **Stage 1**: eGFR ≥90 (normal kidney function)
- **Stage 2**: eGFR 60-89 (mild reduction)
- **Stage 3a**: eGFR 45-59 (mild-moderate reduction)
- **Stage 3b**: eGFR 30-44 (moderate-severe reduction)
- **Stage 4**: eGFR 15-29 (severe reduction)
- **Stage 5**: eGFR <15 (kidney failure)

## Common Causes
- Diabetes (30-50%)
- Hypertension (20-30%)
- Glomerulonephritis
- Pyelonephritis
- Polycystic kidney disease
- Medications (NSAIDs, ACE-I, ARBs)`,
    lastUpdated: "2026-05-18",
  },
];

export default function Note360() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [selectedNote, setSelectedNote] = useState<typeof NOTES[0] | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const filteredNotes = NOTES.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = specialty === "All Specialties" || note.specialty === specialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Note360</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {selectedNote ? (
          // Note View
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedNote(null)}
              className="mb-6 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Notes
            </Button>
            <Card className="p-8 border-slate-200">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-slate-900 mb-3">{selectedNote.title}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="px-3 py-1 bg-slate-100 rounded-full">{selectedNote.specialty}</span>
                  <span className="px-3 py-1 bg-slate-100 rounded-full">{selectedNote.exam}</span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    {selectedNote.highYieldCount} high-yield points
                  </span>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <Streamdown>{selectedNote.content}</Streamdown>
              </div>
            </Card>
          </div>
        ) : (
          // Notes List
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6 border-slate-200 sticky top-24">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Filters</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Search</label>
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Specialty</label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Specialties">All Specialties</SelectItem>
                        <SelectItem value="Cardiology">Cardiology</SelectItem>
                        <SelectItem value="Renal">Renal</SelectItem>
                        <SelectItem value="Respiratory">Respiratory</SelectItem>
                        <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </div>

            {/* Notes Grid */}
            <div className="lg:col-span-3">
              <div className="grid md:grid-cols-2 gap-6">
                {filteredNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="p-6 border-slate-200 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex-1">{note.title}</h3>
                        <BookMarked className="w-5 h-5 text-teal-600 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                          {note.specialty}
                        </span>
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                          {note.exam}
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          <Zap className="w-4 h-4" />
                          <span>{note.highYieldCount} high-yield</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Updated {new Date(note.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
