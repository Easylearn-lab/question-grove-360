import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
import Note360List from "./pages/Note360List";
import Note360Content from "./pages/Note360Content";
import Picture360 from "./pages/Picture360";
import Picture360Specialty from "./pages/Picture360Specialty";
import SCAHistory from "./pages/SCAHistory";
import MSRA from "./pages/MSRA";

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
      <Route path={"/:practice/mrcgp-akt/:specialty"} component={MRCGPAKTPractice} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <AICoachFloating />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
