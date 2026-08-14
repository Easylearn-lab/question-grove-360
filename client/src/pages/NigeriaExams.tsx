import { useLocation } from "wouter";

const exams = [
  {
    name: "JAMB",
    fullName: "Joint Admissions and Matriculation Board",
    description: "Nigeria's university entrance exam. Practice Biology, Chemistry, Physics and English in exam-style CBT format.",
    active: true,
    path: "/international/nigeria/jamb",
    icon: "🎓",
    subjects: 4,
  },
  {
    name: "WAEC",
    fullName: "West African Examinations Council",
    description: "Senior Secondary Certificate Examination preparation across all subjects.",
    active: false,
    path: "",
    icon: "📝",
    subjects: 9,
  },
  {
    name: "NECO",
    fullName: "National Examinations Council",
    description: "SSCE and GCE exam preparation for Nigerian secondary school students.",
    active: false,
    path: "",
    icon: "📚",
    subjects: 9,
  },
];

export default function NigeriaExams() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate("/international")}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Back to International Exams
          </button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">🇳🇬</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nigeria</h1>
              <p className="text-gray-600 mt-1">
                Prepare for Nigeria's top entrance and certification exams.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Available Exams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.name}
              onClick={() => exam.active && navigate(exam.path)}
              className={`relative rounded-xl border p-6 transition-all ${
                exam.active
                  ? "bg-white border-green-200 shadow-sm hover:shadow-md hover:border-green-400 cursor-pointer hover:-translate-y-1"
                  : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
              }`}
            >
              {!exam.active && (
                <span className="absolute top-3 right-3 text-xs font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
              {exam.active && (
                <span className="absolute top-3 right-3 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Live
                </span>
              )}
              <div className="text-3xl mb-3">{exam.icon}</div>
              <h3 className={`text-lg font-bold mb-1 ${exam.active ? "text-gray-900" : "text-gray-500"}`}>
                {exam.name}
              </h3>
              <p className={`text-xs mb-2 ${exam.active ? "text-gray-500" : "text-gray-400"}`}>
                {exam.fullName}
              </p>
              <p className={`text-sm mb-3 ${exam.active ? "text-gray-600" : "text-gray-400"}`}>
                {exam.description}
              </p>
              <div className={`text-xs ${exam.active ? "text-gray-500" : "text-gray-400"}`}>
                {exam.subjects} subjects
              </div>
              {exam.active && (
                <div className="mt-4 text-sm font-medium text-green-600 flex items-center gap-1">
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
