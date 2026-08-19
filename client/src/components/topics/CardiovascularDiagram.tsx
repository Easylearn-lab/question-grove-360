import { useState } from "react";

const parts = [
  { id: "ra", label: "Right Atrium", x: 180, y: 120, w: 80, h: 60, color: "#6366f1", info: "Receives deoxygenated blood from the body via the superior and inferior vena cava." },
  { id: "la", label: "Left Atrium", x: 340, y: 120, w: 80, h: 60, color: "#ef4444", info: "Receives oxygenated blood from the lungs via the pulmonary veins." },
  { id: "rv", label: "Right Ventricle", x: 180, y: 210, w: 80, h: 80, color: "#818cf8", info: "Pumps deoxygenated blood to the lungs via the pulmonary artery." },
  { id: "lv", label: "Left Ventricle", x: 340, y: 210, w: 80, h: 80, color: "#dc2626", info: "Pumps oxygenated blood to the body via the aorta. Has the thickest wall." },
  { id: "aorta", label: "Aorta", x: 360, y: 50, w: 60, h: 40, color: "#b91c1c", info: "The largest artery. Carries oxygenated blood from the left ventricle to the body." },
  { id: "pa", label: "Pulmonary Artery", x: 160, y: 50, w: 60, h: 40, color: "#4338ca", info: "Carries deoxygenated blood from the right ventricle to the lungs." },
  { id: "svc", label: "Superior Vena Cava", x: 110, y: 80, w: 50, h: 40, color: "#3730a3", info: "Returns deoxygenated blood from the upper body to the right atrium." },
  { id: "ivc", label: "Inferior Vena Cava", x: 110, y: 300, w: 50, h: 40, color: "#3730a3", info: "Returns deoxygenated blood from the lower body to the right atrium." },
];

export default function CardiovascularDiagram() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPart = parts.find(p => p.id === selected);

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-4">The Human Heart</h3>
      <p className="text-sm text-gray-500 mb-4">Click on any part to learn more</p>
      <div className="flex flex-col lg:flex-row gap-6">
        <svg viewBox="0 0 500 380" className="w-full max-w-lg border rounded-xl bg-gray-50">
          {/* Heart outline */}
          <path d="M300,60 C340,20 420,20 430,80 C440,140 380,200 300,280 C220,200 160,140 170,80 C180,20 260,20 300,60Z" fill="#fecaca" stroke="#dc2626" strokeWidth="2" opacity="0.3" />
          {/* Septum */}
          <line x1="300" y1="100" x2="300" y2="300" stroke="#9ca3af" strokeWidth="3" strokeDasharray="6,4" />
          {parts.map(p => (
            <g key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)} className="cursor-pointer">
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="8" fill={p.color} opacity={selected === p.id ? 1 : 0.7} stroke={selected === p.id ? "#000" : "none"} strokeWidth="2" className="transition-all duration-200 hover:opacity-100" />
              <text x={p.x + p.w/2} y={p.y + p.h/2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="600">{p.label}</text>
            </g>
          ))}
          {/* Flow arrows */}
          <defs><marker id="arrowR" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#dc2626" /></marker><marker id="arrowB" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#4338ca" /></marker></defs>
          <path d="M380,85 L380,110" stroke="#dc2626" strokeWidth="2" markerEnd="url(#arrowR)" />
          <path d="M190,85 L190,110" stroke="#4338ca" strokeWidth="2" markerEnd="url(#arrowB)" />
          <text x="300" y="370" textAnchor="middle" fill="#6b7280" fontSize="11">Click chambers and vessels to explore</text>
        </svg>
        <div className="flex-1 min-w-[200px]">
          {selectedPart ? (
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-lg mb-2" style={{ color: selectedPart.color }}>{selectedPart.label}</h4>
              <p className="text-gray-700">{selectedPart.info}</p>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400">
              <p>Click on a heart structure to see its description</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
