import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Bookmark, BookmarkCheck, Eye, EyeOff, Download, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useExamAccess } from "@/hooks/useExamAccess";
import { SubscriptionGate } from "@/components/SubscriptionGate";

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
  "renal-urology": "Renal & Urology",
  "obstetrics-gynaecology": "Obstetrics & Gynaecology",
  "ophthalmology": "Ophthalmology",
  "ent": "ENT",
  "haematology": "Haematology",
  "pharmacology-prescribing": "Pharmacology & Prescribing",
  "ethics-organisational": "Ethics & Organisational",
  "general-practice": "General Practice",
  "statistics-ebm": "Statistics & EBM",
  "infectious-disease": "Infectious Disease",
  "cardiology": "Cardiology",
  "renal": "Renal",
  "orthopaedics": "Orthopaedics",
};

export default function Note360Content() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const { hasAccess: isPremium, isLoading: subLoading } = useExamAccess("AKT");
  const specialtyUrl = params.specialty || "";
  const specialtyName = SPECIALTY_MAP[specialtyUrl.toLowerCase()] || specialtyUrl;

  const [searchQuery, setSearchQuery] = useState("");
  const [readStatus, setReadStatus] = useState<Record<number, boolean>>({});
  const [bookmarkStatus, setBookmarkStatus] = useState<Record<number, boolean>>({});

  // Fetch notes from the database using tRPC
  const { data: notes = [], isLoading } = trpc.note360.getBySpecialty.useQuery(
    specialtyName,
    { enabled: !!specialtyName }
  );

  // Fetch user progress
  const { data: progressData } = trpc.note360.getUserProgress.useQuery(
    { specialty: specialtyName },
    { enabled: !!specialtyName && !!user }
  );

  // Update progress mutation
  const updateProgressMutation = trpc.note360.updateProgress.useMutation();

  // Initialize read/bookmark status from progress data
  useEffect(() => {
    if (progressData?.progress) {
      const readMap: Record<number, boolean> = {};
      const bookmarkMap: Record<number, boolean> = {};
      progressData.progress.forEach((p: any) => {
        readMap[p.noteId] = p.isRead || false;
        bookmarkMap[p.noteId] = p.isBookmarked || false;
      });
      setReadStatus(readMap);
      setBookmarkStatus(bookmarkMap);
    }
  }, [progressData]);

  // Filter notes based on search query
  const filteredNotes = notes.filter(
    (note: any) =>
      (note.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRead = (noteId: number) => {
    const newValue = !readStatus[noteId];
    setReadStatus((prev) => ({
      ...prev,
      [noteId]: newValue,
    }));
    updateProgressMutation.mutate({ noteId, isRead: newValue });
  };

  const toggleBookmark = (noteId: number) => {
    const newValue = !bookmarkStatus[noteId];
    setBookmarkStatus((prev) => ({
      ...prev,
      [noteId]: newValue,
    }));
    updateProgressMutation.mutate({ noteId, isBookmarked: newValue });
  };

  const handleExportPDF = () => {
    alert("PDF export coming soon!");
  };

  if (isLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <SubscriptionGate isPremium={isPremium} featureName="Note360 Revision Notes">
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
            filteredNotes.map((note: any) => (
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
        </SubscriptionGate>
      </div>
    </div>
  );
}
