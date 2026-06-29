import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";

const SPECIALTIES: Record<string, string> = {
  dermatology: "Dermatology",
  ophthalmology: "Ophthalmology",
  ecg: "ECG",
  ent: "ENT",
  "chest-x-ray": "Chest X-ray",
  paediatrics: "Paediatrics",
};

export default function Picture360Specialty() {
  const { specialty } = useParams<{ specialty: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useProtectedRoute();
  const [mode, setMode] = useState<"select" | "learn" | "test">("select");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  const specialtyName = specialty ? SPECIALTIES[specialty] : "";

  // TODO: Add query to fetch images by specialty
  const images = useMemo(() => {
    // Placeholder data - will be replaced with actual query
    return [
      {
        id: 1,
        specialty: specialtyName,
        title: "Acne Vulgaris",
        description: "Inflammatory acne with comedones and pustules",
        imageUrl: "https://via.placeholder.com/600x400?text=Acne+Vulgaris",
        diagnosis: "Acne Vulgaris",
        explanation: "Characterized by open and closed comedones, papules, and pustules on the face and upper trunk.",
      },
      {
        id: 2,
        specialty: specialtyName,
        title: "Psoriasis",
        description: "Chronic inflammatory skin condition",
        imageUrl: "https://via.placeholder.com/600x400?text=Psoriasis",
        diagnosis: "Psoriasis",
        explanation: "Red, scaly plaques with well-defined borders, often on extensor surfaces.",
      },
      {
        id: 3,
        specialty: specialtyName,
        title: "Eczema",
        description: "Atopic dermatitis",
        imageUrl: "https://via.placeholder.com/600x400?text=Eczema",
        diagnosis: "Atopic Dermatitis",
        explanation: "Pruritic, erythematous patches with lichenification and excoriation.",
      },
    ];
  }, [specialtyName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!specialtyName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Specialty not found</p>
          <Button onClick={() => navigate("/picture360")}>Back to Picture Album</Button>
        </div>
      </div>
    );
  }

  const currentImage = images[currentImageIndex];

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/picture360")}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{specialtyName}</h1>
                <p className="text-sm text-slate-600">{images.length} images</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mode Selection */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Learn Mode */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100" onClick={() => setMode("learn")}>
              <div className="text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Learn Mode</h3>
                <p className="text-slate-600 mb-6">Study images with diagnoses and explanations</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Start Learning →
                </Button>
              </div>
            </Card>

            {/* Test Mode */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-green-50 to-green-100" onClick={() => setMode("test")}>
              <div className="text-center">
                <div className="text-6xl mb-4">🧪</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Test Yourself</h3>
                <p className="text-slate-600 mb-6">Guess the diagnosis before revealing the answer</p>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Start Test →
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("select")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{specialtyName}</h1>
              <p className="text-sm text-slate-600">{mode === "learn" ? "Learn Mode" : "Test Mode"} • Image {currentImageIndex + 1} of {images.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 border-slate-200">
          {/* Image */}
          <div className="mb-8">
            <img
              src={currentImage.imageUrl}
              alt={currentImage.title}
              className="w-full h-96 object-cover rounded-lg border border-slate-200"
            />
          </div>

          {/* Content */}
          {mode === "learn" ? (
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{currentImage.diagnosis}</h2>
              <p className="text-slate-600 mb-4">{currentImage.description}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-slate-700">{currentImage.explanation}</p>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">What is this diagnosis?</h2>
              {!showAnswer ? (
                <Button
                  onClick={() => setShowAnswer(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                >
                  Reveal Answer
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-slate-500 mb-1">Diagnosis:</p>
                    <p className="text-2xl font-bold text-green-700">{currentImage.diagnosis}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-slate-500 mb-1">Explanation:</p>
                    <p className="text-slate-700">{currentImage.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
                setShowAnswer(false);
              }}
              disabled={currentImageIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="text-center text-sm text-slate-600">
              {currentImageIndex + 1} / {images.length}
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setCurrentImageIndex(Math.min(images.length - 1, currentImageIndex + 1));
                setShowAnswer(false);
              }}
              disabled={currentImageIndex === images.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Finish Button */}
          {currentImageIndex === images.length - 1 && (
            <Button
              onClick={() => navigate("/picture360")}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white"
            >
              Finish and Return to Picture Album
            </Button>
          )}
        </Card>
      </main>
    </div>
  );
}
