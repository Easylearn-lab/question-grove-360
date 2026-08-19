import { useState } from "react";
const animalParts = [
  { id: "nucleus", label: "Nucleus", cx: 200, cy: 150, r: 30, color: "#7c3aed", info: "Contains DNA. Controls all cell activities and cell division." },
  { id: "membrane", label: "Cell Membrane", cx: 200, cy: 150, r: 100, color: "#f59e0b", info: "Semi-permeable barrier. Controls what enters and leaves the cell." },
  { id: "mito", label: "Mitochondria", cx: 130, cy: 120, r: 15, color: "#ef4444", info: "Site of aerobic respiration. Produces ATP (energy). 'Powerhouse of the cell'." },
  { id: "ribo", label: "Ribosomes", cx: 270, cy: 130, r: 8, color: "#3b82f6", info: "Tiny organelles that synthesize proteins from amino acids." },
  { id: "er", label: "Endoplasmic Reticulum", cx: 250, cy: 180, r: 18, color: "#14b8a6", info: "Network of membranes. Rough ER has ribosomes (protein transport). Smooth ER makes lipids." },
  { id: "golgi", label: "Golgi Apparatus", cx: 150, cy: 200, r: 16, color: "#f97316", info: "Packages, modifies, and distributes proteins and lipids." },
];
export default function CellDiagram() {
  const [selected, setSelected] = useState<string | null>(null);
  const [cellType, setCellType] = useState<"animal" | "plant">("animal");
  const sel = animalParts.find(p => p.id === selected);
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Cell Structure</h3>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setCellType("animal")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${cellType === "animal" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>Animal Cell</button>
        <button onClick={() => setCellType("plant")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${cellType === "plant" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>Plant Cell</button>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <svg viewBox="0 0 400 300" className="w-full max-w-md border rounded-xl bg-green-50/30">
          {cellType === "plant" && <rect x="30" y="20" width="340" height="260" rx="8" fill="none" stroke="#16a34a" strokeWidth="4" />}
          <ellipse cx="200" cy="150" rx="150" ry="110" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" onClick={() => setSelected("membrane")} className="cursor-pointer" />
          {cellType === "plant" && <ellipse cx="200" cy="150" rx="80" ry="60" fill="#bfdbfe" opacity="0.4" stroke="#3b82f6" strokeWidth="1" />}
          {cellType === "plant" && <text x="200" y="155" textAnchor="middle" fill="#1d4ed8" fontSize="9">Vacuole</text>}
          {cellType === "plant" && [[100,100],[300,200],[120,220]].map(([cx,cy], i) => <ellipse key={i} cx={cx} cy={cy} rx="18" ry="12" fill="#86efac" stroke="#16a34a" strokeWidth="1" />)}
          {cellType === "plant" && <text x="100" y="85" textAnchor="middle" fill="#15803d" fontSize="8">Chloroplast</text>}
          {animalParts.filter(p => p.id !== "membrane").map(p => (
            <g key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)} className="cursor-pointer">
              <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.color} opacity={selected === p.id ? 1 : 0.6} stroke={selected === p.id ? "#000" : "none"} strokeWidth="2" className="hover:opacity-100 transition-opacity" />
              <text x={p.cx} y={p.cy + p.r + 12} textAnchor="middle" fill="#4b5563" fontSize="8">{p.label}</text>
            </g>
          ))}
        </svg>
        <div className="flex-1">
          {sel ? (
            <div className="bg-white border rounded-xl p-5 shadow-sm"><h4 className="font-bold text-lg mb-2" style={{color:sel.color}}>{sel.label}</h4><p className="text-gray-700">{sel.info}</p></div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400">Click on an organelle to learn more</div>
          )}
          {cellType === "plant" && <p className="text-xs text-green-700 mt-3 bg-green-50 p-3 rounded-lg">Plant cells have a rigid <strong>cell wall</strong>, <strong>chloroplasts</strong> for photosynthesis, and a large <strong>central vacuole</strong> — animal cells do not.</p>}
        </div>
      </div>
    </div>
  );
}
