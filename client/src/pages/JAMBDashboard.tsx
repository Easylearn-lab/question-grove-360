import { useLocation } from "wouter";

const subjects = [
  {
    name: "Biology",
    description: "Cell biology, genetics, ecology, evolution, and human physiology.",
    active: true,
    path: "/international/nigeria/jamb/biology",
    icon: "🧬",
    questionCount: 0,
  },
  {
    name: "English Language",
    description: "Comprehension, lexis and structure, oral English, and essay writing.",
    active: false,
    path: "",
    icon: "📖",
    questionCount: 0,
  },
  {
    name: "Chemistry",
    description: "Organic, inorganic, and physical chemistry for JAMB UTME.",
    active: false,
    path: "",
    icon: "⚗️",
    questionCount: 0,
  },
  {
    name: "Physics",
    description: "Mechanics, waves, electricity, magnetism, and modern physics.",
    active: false,
    path: "",
    icon: "⚡",
    questionCount: 0,
  },
];

export default function JAMBDashboard() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate("/international/nigeria")}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Back to Nigeria Exams
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎓</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">JAMB UTME</h1>
              <p className="text-gray-600 mt-1">
                Joint Admissions and Matriculation Board — University Entrance Exam
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-sm text-green-800 font-medium">About JAMB UTME</p>
            <p className="text-sm text-green-700 mt-1">
              The Unified Tertiary Matriculation Examination (UTME) is a computer-based test (CBT) 
              with 180 questions across 4 subjects, completed in 2 hours. Each subject has 40-50 questions. 
              Practice here in the same CBT format used on exam day.
            </p>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Choose a Subject</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {subjects.map((subject) => (
            <div
              key={subject.name}
              onClick={() => subject.active && navigate(subject.path)}
              className={`relative rounded-xl border p-6 transition-all ${
                subject.active
                  ? "bg-white border-green-200 shadow-sm hover:shadow-md hover:border-green-400 cursor-pointer hover:-translate-y-1"
                  : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
              }`}
            >
              {!subject.active && (
                <span className="absolute top-3 right-3 text-xs font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
              {subject.active && (
                <span className="absolute top-3 right-3 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
              <div className="text-3xl mb-3">{subject.icon}</div>
              <h3 className={`text-lg font-bold mb-1 ${subject.active ? "text-gray-900" : "text-gray-500"}`}>
                {subject.name}
              </h3>
              <p className={`text-sm mb-3 ${subject.active ? "text-gray-600" : "text-gray-400"}`}>
                {subject.description}
              </p>
              {subject.active && (
                <div className="mt-2 text-sm font-medium text-green-600 flex items-center gap-1">
                  Start practising →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

