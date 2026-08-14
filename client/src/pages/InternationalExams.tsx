import { useLocation } from "wouter";

const countries = [
  {
    name: "Nigeria",
    flag: "🇳🇬",
    description: "Prepare for Nigeria's top university and secondary school entrance exams.",
    active: true,
    path: "/international/nigeria",
  },
  {
    name: "United States",
    flag: "🇺🇸",
    description: "USMLE Step 1, Step 2 CK, and Step 3 preparation.",
    active: false,
    path: "",
  },
  {
    name: "Canada",
    flag: "🇨🇦",
    description: "MCCQE1 and NAC OSCE exam preparation.",
    active: false,
    path: "",
  },
  {
    name: "Australia",
    flag: "🇦🇺",
    description: "AMC CAT and Clinical exam preparation.",
    active: false,
    path: "",
  },
  {
    name: "Middle East",
    flag: "🏥",
    description: "DHA, HAAD, MOH, and SMLE exam preparation.",
    active: false,
    path: "",
  },
  {
    name: "India",
    flag: "🇮🇳",
    description: "NEET PG and FMGE exam preparation.",
    active: false,
    path: "",
  },
];

export default function InternationalExams() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900">International Exams</h1>
          <p className="text-gray-600 mt-2">
            Choose your country to access exam-specific question banks and practice materials.
          </p>
        </div>
      </div>

      {/* Country Grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {countries.map((country) => (
            <div
              key={country.name}
              onClick={() => country.active && navigate(country.path)}
              className={`relative rounded-xl border p-6 transition-all ${
                country.active
                  ? "bg-white border-green-200 shadow-sm hover:shadow-md hover:border-green-400 cursor-pointer hover:-translate-y-1"
                  : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
              }`}
            >
              {!country.active && (
                <span className="absolute top-3 right-3 text-xs font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
              {country.active && (
                <span className="absolute top-3 right-3 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Live
                </span>
              )}
              <div className="text-4xl mb-3">{country.flag}</div>
              <h3 className={`text-lg font-bold mb-1 ${country.active ? "text-gray-900" : "text-gray-500"}`}>
                {country.name}
              </h3>
              <p className={`text-sm ${country.active ? "text-gray-600" : "text-gray-400"}`}>
                {country.description}
              </p>
              {country.active && (
                <div className="mt-4 text-sm font-medium text-green-600 flex items-center gap-1">
                  Explore exams →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
