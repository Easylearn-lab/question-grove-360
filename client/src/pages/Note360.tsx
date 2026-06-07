import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, BookMarked, Zap, Heart, Brain, Stethoscope, Pill, Baby, Bone, Eye, Activity } from "lucide-react";
import { Streamdown } from "streamdown";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useSubscription } from "@/hooks/useSubscription";

const SPECIALTIES = [
  { id: "cardiology", name: "Cardiology", icon: Heart, color: "bg-red-100 text-red-600", noteCount: 24 },
  { id: "neurology", name: "Neurology", icon: Brain, color: "bg-purple-100 text-purple-600", noteCount: 18 },
  { id: "respiratory", name: "Respiratory", icon: Activity, color: "bg-blue-100 text-blue-600", noteCount: 15 },
  { id: "renal", name: "Renal", icon: Pill, color: "bg-amber-100 text-amber-600", noteCount: 12 },
  { id: "gastroenterology", name: "Gastroenterology", icon: Stethoscope, color: "bg-green-100 text-green-600", noteCount: 20 },
  { id: "paediatrics", name: "Paediatrics", icon: Baby, color: "bg-pink-100 text-pink-600", noteCount: 16 },
  { id: "orthopaedics", name: "Orthopaedics", icon: Bone, color: "bg-orange-100 text-orange-600", noteCount: 10 },
  { id: "ophthalmology", name: "Ophthalmology", icon: Eye, color: "bg-cyan-100 text-cyan-600", noteCount: 8 },
];

const NOTES_DATA: Record<string, Array<{
  id: number;
  title: string;
  specialty: string;
  exam: string;
  highYieldCount: number;
  content: string;
  lastUpdated: string;
}>> = {
  cardiology: [
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
- Age, male sex, Smoking, Hypertension, Diabetes, Hyperlipidemia, Family history

## Clinical Presentation
- Central chest pain (crushing, pressure)
- Radiation to arm, jaw, back
- Associated dyspnea, nausea, diaphoresis
- May be silent in elderly/diabetics

## Investigations
- **ECG**: ST changes, T wave inversion
- **Troponin**: High sensitivity troponin at 0 and 3 hours
- **CXR**: Pulmonary edema, cardiomegaly

## Management
- Aspirin 300mg + P2Y12 inhibitor
- Beta-blockers, ACE inhibitors, Statins
- PCI vs thrombolysis depending on presentation`,
      lastUpdated: "2026-05-20",
    },
    {
      id: 2,
      title: "Heart Failure",
      specialty: "Cardiology",
      exam: "MRCP Part 1",
      highYieldCount: 10,
      content: `# Heart Failure

## Definition
Inability of the heart to pump sufficient blood to meet metabolic demands.

## Types
- **HFrEF**: Ejection fraction ≤40%
- **HFmrEF**: Ejection fraction 41-49%
- **HFpEF**: Ejection fraction ≥50%

## Symptoms (Framingham Criteria)
**Major**: PND, neck vein distension, rales, cardiomegaly, acute pulmonary oedema, S3 gallop, hepatojugular reflux
**Minor**: Ankle oedema, night cough, dyspnea on exertion, hepatomegaly, pleural effusion, tachycardia >120

## Management
- ACE inhibitor/ARB + Beta-blocker + MRA
- Diuretics for fluid overload
- Consider SGLT2 inhibitor, sacubitril/valsartan
- Device therapy: CRT, ICD if indicated`,
      lastUpdated: "2026-05-22",
    },
  ],
  neurology: [
    {
      id: 3,
      title: "Stroke Management",
      specialty: "Neurology",
      exam: "MRCGP AKT",
      highYieldCount: 14,
      content: `# Stroke Management

## Types
- **Ischaemic** (85%): Thrombotic, embolic, lacunar
- **Haemorrhagic** (15%): Intracerebral, subarachnoid

## FAST Assessment
- **F**ace drooping
- **A**rm weakness
- **S**peech difficulty
- **T**ime to call emergency services

## Acute Management (Ischaemic)
- Thrombolysis (alteplase) within 4.5 hours
- Thrombectomy within 6 hours (up to 24h in selected patients)
- Aspirin 300mg within 24 hours

## Secondary Prevention
- Antiplatelet therapy (clopidogrel 75mg)
- Statin therapy
- Blood pressure control
- Anticoagulation if AF (after 2 weeks)`,
      lastUpdated: "2026-05-25",
    },
  ],
  renal: [
    {
      id: 4,
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
- Glomerulonephritis, Pyelonephritis
- Polycystic kidney disease

## Complications
- Anaemia (EPO deficiency)
- Bone disease (secondary hyperparathyroidism)
- Cardiovascular disease
- Hyperkalaemia, Metabolic acidosis

## Management
- ACE inhibitor/ARB for proteinuria
- Blood pressure <130/80
- SGLT2 inhibitors (dapagliflozin)
- Phosphate binders, Vitamin D
- Dialysis or transplant for Stage 5`,
      lastUpdated: "2026-05-18",
    },
  ],
};

export default function Note360() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<typeof NOTES_DATA["cardiology"][0] | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  const { isPremium, isLoading: subLoading } = useSubscription();

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const currentNotes = selectedSpecialty ? (NOTES_DATA[selectedSpecialty] || []) : [];
  const filteredNotes = currentNotes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
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
              <h1 className="text-3xl font-bold text-slate-900 mb-3">{selectedNote.title}</h1>
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full">{selectedNote.specialty}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full">{selectedNote.exam}</span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <Zap className="w-4 h-4" />
                  {selectedNote.highYieldCount} high-yield points
                </span>
              </div>
            </div>
            <div className="prose prose-slate max-w-none">
              <Streamdown>{selectedNote.content}</Streamdown>
            </div>
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

          {filteredNotes.length === 0 ? (
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
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{note.title}</h3>
                    <BookMarked className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">{note.exam}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-yellow-600">
                      <Zap className="w-4 h-4" />
                      <span>{note.highYieldCount} high-yield</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(note.lastUpdated).toLocaleDateString()}
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
            Comprehensive revision notes organised by specialty. Each topic includes high-yield points for exam preparation.
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
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">
                  {specialty.name}
                </h3>
                <p className="text-sm text-slate-600">{specialty.noteCount} notes</p>
              </Card>
            );
          })}
        </div>
        </SubscriptionGate>
      </main>
    </div>
  );
}
