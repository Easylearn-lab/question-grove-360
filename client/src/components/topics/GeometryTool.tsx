import { useState } from "react";
export default function GeometryTool() {
  const [shape, setShape] = useState<"triangle" | "circle" | "rectangle">("triangle");
  const [dim1, setDim1] = useState(5);
  const [dim2, setDim2] = useState(8);
  const [dim3, setDim3] = useState(6);
  const calc = () => {
    if (shape === "triangle") return { area: (dim1 * dim2) / 2, perimeter: dim1 + dim2 + dim3, label1: "Base", label2: "Height", label3: "Side c" };
    if (shape === "circle") return { area: Math.PI * dim1 * dim1, perimeter: 2 * Math.PI * dim1, label1: "Radius", label2: "", label3: "" };
    return { area: dim1 * dim2, perimeter: 2 * (dim1 + dim2), label1: "Length", label2: "Width", label3: "" };
  };
  const r = calc();
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Geometry Calculator</h3>
      <div className="flex gap-2 mb-4">
        {(["triangle", "circle", "rectangle"] as const).map(s => (
          <button key={s} onClick={() => setShape(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${shape === s ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>
        ))}
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <svg viewBox="0 0 200 200" className="w-48 h-48 border rounded-xl bg-gray-50">
          {shape === "triangle" && <polygon points="100,20 20,180 180,180" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2" />}
          {shape === "circle" && <circle cx="100" cy="100" r="70" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="2" />}
          {shape === "rectangle" && <rect x="30" y="50" width="140" height="100" fill="#fde68a" stroke="#d97706" strokeWidth="2" rx="4" />}
        </svg>
        <div className="flex-1">
          <div className="space-y-3 mb-4">
            {r.label1 && <div className="flex items-center gap-2"><label className="text-sm w-20">{r.label1}:</label><input type="number" value={dim1} onChange={e => setDim1(Number(e.target.value))} className="w-20 border rounded px-2 py-1" min="0.1" step="0.1" /></div>}
            {r.label2 && <div className="flex items-center gap-2"><label className="text-sm w-20">{r.label2}:</label><input type="number" value={dim2} onChange={e => setDim2(Number(e.target.value))} className="w-20 border rounded px-2 py-1" min="0.1" step="0.1" /></div>}
            {r.label3 && <div className="flex items-center gap-2"><label className="text-sm w-20">{r.label3}:</label><input type="number" value={dim3} onChange={e => setDim3(Number(e.target.value))} className="w-20 border rounded px-2 py-1" min="0.1" step="0.1" /></div>}
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-700"><strong>Area:</strong> {r.area.toFixed(2)} sq units</p>
            <p className="text-sm text-gray-700"><strong>Perimeter:</strong> {r.perimeter.toFixed(2)} units</p>
          </div>
        </div>
      </div>
    </div>
  );
}
