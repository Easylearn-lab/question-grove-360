import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Bookmark, BookmarkCheck, Eye, EyeOff, Download, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// Specialty name mapping for URL to display name
const SPECIALTY_MAP: Record<string, string> = {
  "cardiovascular": "Cardiovascular",
  "respiratory": "Respiratory",
  "gastroenterology": "Gastroenterology",
  "neurology": "Neurology",
  "paediatrics": "Paediatrics",
  "dermatology": "Dermatology",
  "musculoskeletal": "Musculoskeletal",
  "endocrinology": "Endocrinology",
  "renal-&-urology": "Renal & Urology",
  "obstetrics-&-gynaecology": "Obstetrics & Gynaecology",
  "ophthalmology-&-ent": "Ophthalmology & ENT",
  "haematology": "Haematology",
  "pharmacology-&-prescribing": "Pharmacology & Prescribing",
  "ethics-&-organisational": "Ethics & Organisational",
  "general-practice": "General Practice",
  "statistics-&-ebm": "Statistics & EBM",
  "infectious-disease": "Infectious Disease",
};

interface Note {
  id: number;
  title: string;
  content: string;
  niceGuideline?: string;
  niceUrl?: string;
  examPearl?: string;
  isRead?: boolean;
  isBookmarked?: boolean;
}

export default function Note360Content() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const specialtyUrl = params.specialty || "";
  const specialtyName = SPECIALTY_MAP[specialtyUrl.toLowerCase()] || specialtyUrl;

  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [readStatus, setReadStatus] = useState<Record<number, boolean>>({});
  const [bookmarkStatus, setBookmarkStatus] = useState<Record<number, boolean>>({});

  // TODO: Replace with actual tRPC query when backend is ready
  useEffect(() => {
    setIsLoading(true);
    // Simulate loading notes for the specialty
    setTimeout(() => {
      const mockNotes: Note[] = [
        {
          id: 1,
          title: "Hypertension Management",
          content: "Diagnosis / Thresholds:\n- BP ≥140/90 mmHg (NICE NG136)\n\nFirst-line treatment:\n- Lifestyle modifications\n- ACE inhibitor or ARB\n\nSecond-line / escalation:\n- Add calcium channel blocker or thiazide\n\nKey targets:\n- <140/90 mmHg for most patients\n- <130/80 mmHg for high-risk patients\n\nReferral criteria:\n- Resistant hypertension (BP not controlled on 3+ drugs)\n- Secondary hypertension suspected\n\n⭐ AKT Exam Pearl:\nNICE recommends ACE inhibitors as first-line for hypertension in patients <55 years; calcium channel blockers or thiazides for older patients.",
          niceGuideline: "NG136",
          niceUrl: "https://www.nice.org.uk/guidance/ng136",
          examPearl: "ACE inhibitors first-line for <55 years; CCB/thiazide for older patients",
          isRead: false,
          isBookmarked: false,
        },
        {
          id: 2,
          title: "Acute Coronary Syndrome",
          content: "Diagnosis / Thresholds:\n- Chest pain + troponin elevation or ECG changes\n- STEMI: ST elevation in ≥2 contiguous leads\n- NSTEMI: Troponin elevation without ST elevation\n\nFirst-line treatment:\n- Dual antiplatelet therapy (aspirin + P2Y12 inhibitor)\n- Anticoagulation (LMWH or fondaparinux)\n- Beta-blocker, ACE inhibitor, statin\n- PCI within 120 minutes for STEMI\n\nSecond-line / escalation:\n- Inotropes for cardiogenic shock\n- Mechanical circulatory support if needed\n\nKey targets:\n- Troponin normalization\n- LVEF recovery\n\nReferral criteria:\n- All ACS patients to cardiology\n- Cardiogenic shock to ICU\n\n⭐ AKT Exam Pearl:\nNICE recommends PCI within 120 minutes of first medical contact for STEMI; dual antiplatelet therapy is essential.",
          niceGuideline: "NG185",
          niceUrl: "https://www.nice.org.uk/guidance/ng185",
          examPearl: "PCI within 120 minutes for STEMI; dual antiplatelet therapy mandatory",
          isRead: false,
          isBookmarked: false,
        },
        {
          id: 3,
          title: "Heart Failure with Reduced Ejection Fraction",
          content: "Diagnosis / Thresholds:\n- LVEF ≤40%\n- Symptoms of heart failure (dyspnea, fatigue, orthopnea)\n- BNP >35 pg/mL or NT-proBNP >125 pg/mL\n\nFirst-line treatment:\n- ACE inhibitor or ARB\n- Beta-blocker (bisoprolol, carvedilol, metoprolol)\n- MRA (spironolactone or eplerenone)\n\nSecond-line / escalation:\n- Add SGLT2 inhibitor (dapagliflozin, empagliflozin)\n- Add hydralazine + nitrate if ACE-I intolerant\n- Ivabradine if HR >70 bpm on beta-blocker\n\nKey targets:\n- LVEF improvement\n- Symptom relief\n- Reduced hospitalization\n\nReferral criteria:\n- Acute decompensation\n- Cardiogenic shock\n- Need for device therapy (CRT, ICD)\n\n⭐ AKT Exam Pearl:\nNICE recommends ACE-I/ARB + beta-blocker + MRA as foundational therapy; SGLT2 inhibitors now added for all HFrEF patients.",
          niceGuideline: "NG196",
          niceUrl: "https://www.nice.org.uk/guidance/ng196",
          examPearl: "ACE-I/ARB + beta-blocker + MRA + SGLT2i is current standard therapy",
          isRead: false,
          isBookmarked: false,
        },
      ];
      setNotes(mockNotes);
      setFilteredNotes(mockNotes);
      
      // Initialize read/bookmark status
      const readMap: Record<number, boolean> = {};
      const bookmarkMap: Record<number, boolean> = {};
      mockNotes.forEach((note) => {
        readMap[note.id] = note.isRead || false;
        bookmarkMap[note.id] = note.isBookmarked || false;
      });
      setReadStatus(readMap);
      setBookmarkStatus(bookmarkMap);
      setIsLoading(false);
    }, 500);
  }, [specialtyName]);

  // Filter notes based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    );
    setFilteredNotes(filtered);
  }, [searchQuery, notes]);

  const toggleRead = (noteId: number) => {
    setReadStatus((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
    // TODO: Call tRPC mutation to update backend
  };

  const toggleBookmark = (noteId: number) => {
    setBookmarkStatus((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
    // TODO: Call tRPC mutation to update backend
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert("PDF export coming soon!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with breadcrumb */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/mrcgp-akt/note360")}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Note360
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                📓 {specialtyName}
              </h1>
              <p className="text-lg text-slate-600">
                {filteredNotes.length} topics available
              </p>
            </div>
            <Button
              onClick={handleExportPDF}
              className="bg-[#32CD32] hover:bg-[#2ab82a] text-[#1A1A1A] font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        {/* Notes list */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-600">No topics found matching your search.</p>
            </Card>
          ) : (
            filteredNotes.map((note) => (
              <Card key={note.id} className="p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {note.title}
                    </h3>
                    {note.niceGuideline && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-600">
                          📋 NICE Guideline: {note.niceGuideline}
                        </span>
                        {note.niceUrl && (
                          <a
                            href={note.niceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRead(note.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title={readStatus[note.id] ? "Mark as unread" : "Mark as read"}
                    >
                      {readStatus[note.id] ? (
                        <Eye className="w-5 h-5 text-[#32CD32]" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleBookmark(note.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title={bookmarkStatus[note.id] ? "Remove bookmark" : "Add bookmark"}
                    >
                      {bookmarkStatus[note.id] ? (
                        <BookmarkCheck className="w-5 h-5 text-[#32CD32]" />
                      ) : (
                        <Bookmark className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-6">
                    {note.content}
                  </p>
                </div>

                {/* Exam pearl */}
                {note.examPearl && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">⭐ AKT Exam Pearl:</span> {note.examPearl}
                    </p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
