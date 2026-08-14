import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useParams } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/DashboardRedesigned";
import Profile from "./pages/Profile";
import QuestionBank from "./pages/QuestionBank";
import MockExams from "./pages/MockExams";
import Note360 from "./pages/Note360";
import PatternRecognition from "./pages/PatternRecognition";
import SCASimulator from "./pages/SCASimulator";
import Pricing from "./pages/Pricing";
import AdminPanel from "./pages/AdminPanel";
import AICoach from "./pages/AICoach";
import Payments from "./pages/Payments";
import ActiveMockExam from "./pages/ActiveMockExam";
import MockExamResults from "./pages/MockExamResults";
import MockExamReview from "./pages/MockExamReview";
import Onboarding from "./pages/Onboarding";
import Progress from "./pages/Progress";
import Bookmarks from "./pages/Bookmarks";
import TwoFactorSettings from "./pages/TwoFactorSettings";
import { AICoachFloating } from "./components/AICoachFloating";
import MRCGPAKTSpecialties from "./pages/MRCGPAKTSpecialties";
import MRCGPAKTPractice from "./pages/MRCGPAKTPractice";

// Redirect legacy practice URLs to the full QuestionBank
function MRCGPAKTPracticeRedirect() {
  const { specialty } = useParams<{ specialty: string }>();
  const SPECIALTIES_MAP: Record<string, string> = {
    "ethics-organisational": "Ethics & Organisational",
    "endocrinology": "Endocrinology",
    "paediatrics": "Paediatrics",
    "cardiovascular": "Cardiovascular",
    "statistics-ebm": "Statistics & EBM",
    "gastroenterology": "Gastroenterology",
    "haematology": "Haematology",
    "general-practice": "General Practice",
    "respiratory": "Respiratory",
    "pharmacology-prescribing": "Pharmacology & Prescribing",
    "ophthalmology": "Ophthalmology",
    "ent": "ENT",
    "musculoskeletal": "Musculoskeletal",
    "neurology": "Neurology",
    "dermatology": "Dermatology",
    "obstetrics-gynaecology": "Obstetrics & Gynaecology",
    "renal-urology": "Renal & Urology",
    "infectious-disease": "Infectious Disease",
    "psychiatry": "Psychiatry",
  };
  const specialtyName = specialty ? SPECIALTIES_MAP[specialty] || specialty : "";
  return <Redirect to={`/questions?specialty=${encodeURIComponent(specialtyName)}`} />;
}
import Note360List from "./pages/Note360List";
import Note360Content from "./pages/Note360Content";
import Picture360 from "./pages/Picture360";
import Picture360Specialty from "./pages/Picture360Specialty";
import SCAHistory from "./pages/SCAHistory";
import MSRA from "./pages/MSRA";
import MSRAQuestionBank from "./pages/MSRAQuestionBank";
import PLAB1QuestionBank from "./pages/PLAB1QuestionBank";
import PLAB1MockExam from "./pages/PLAB1MockExam";
import PLAB1Specialties from "./pages/PLAB1Specialties";
import PLAB1Landing from "./pages/PLAB1Landing";
import InternationalExams from "./pages/InternationalExams";
import NigeriaExams from "./pages/NigeriaExams";
import JAMBDashboard from "./pages/JAMBDashboard";
import JAMBBiology from "./pages/JAMBBiology";
import { useGracefulFetch } from "./hooks/useGracefulFetch";
import { Whiteboard } from "./components/Whiteboard";
import { useState } from "react";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/questions"} component={QuestionBank} />
      <Route path={"/mocks"} component={MockExams} />
      <Route path={"/mock-exams"} component={MockExams} />
      <Route path={"/notes"} component={Note360} />
      <Route path={"/note360"} component={Note360} />
      <Route path={"/flashcards"} component={PatternRecognition} />
      <Route path={"/sca/history"} component={SCAHistory} />
      <Route path={"/sca"} component={SCASimulator} />
      <Route path={"/msra"} component={MSRA} />
      <Route path={"/msra/questions"} component={MSRAQuestionBank} />
      <Route path={"/plab1"} component={PLAB1Landing} />
      <Route path={"/plab1/specialties"} component={PLAB1Specialties} />
      <Route path={"/plab1/questions"} component={PLAB1QuestionBank} />
      <Route path={"/plab1/mock"} component={PLAB1MockExam} />
      <Route path={"/international"} component={InternationalExams} />
      <Route path={"/international/nigeria"} component={NigeriaExams} />
      <Route path={"/international/nigeria/jamb"} component={JAMBDashboard} />
      <Route path={"/international/nigeria/jamb/biology"} component={JAMBBiology} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/coach"} component={AICoach} />
      <Route path={"/payments"} component={Payments} />
      <Route path={"/mock-exam/:id"} component={ActiveMockExam} />
      <Route path={"/mock-results/:id"} component={MockExamResults} />
      <Route path={"/mock-review/:id"} component={MockExamReview} />
      <Route path={"/progress"} component={Progress} />
      <Route path={"/bookmarks"} component={Bookmarks} />
      <Route path={"/settings/2fa"} component={TwoFactorSettings} />
      <Route path={"/picture360"} component={Picture360} />
      <Route path={"/picture360/:specialty"} component={Picture360Specialty} />
      <Route path={"/:mrcgp-akt"} component={MRCGPAKTSpecialties} />
      <Route path={"/:practice/mrcgp-akt/:specialty"} component={MRCGPAKTPracticeRedirect} />
      <Route path={"/:mrcgp-akt/note360"} component={Note360List} />
      <Route path={"/:mrcgp-akt/note360/:specialty"} component={Note360Content} />
      <Route path={"/:mrcgp-akt/flashcards"} component={PatternRecognition} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  // Intercept fetch to handle cold-start errors gracefully during study sessions
  useGracefulFetch();
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [whiteboardSnapped, setWhiteboardSnapped] = useState(false);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <div className={whiteboardSnapped ? "mr-[40vw] transition-[margin] duration-300" : "transition-[margin] duration-300"}>
            <Router />
          </div>
          <AICoachFloating />
          <Whiteboard
            isOpen={whiteboardOpen}
            onClose={() => { setWhiteboardOpen(false); setWhiteboardSnapped(false); }}
            onSnapChange={(snapped) => setWhiteboardSnapped(snapped)}
          />
          <button
            onClick={() => setWhiteboardOpen(!whiteboardOpen)}
            className="fixed top-4 right-4 z-40 w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
            title="Toggle whiteboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
