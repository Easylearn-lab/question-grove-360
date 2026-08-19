import { useState, useEffect } from "react";

const parts = [
  { id: "trachea", label: "Trachea", info: "The windpipe. Reinforced with C-shaped cartilage rings to keep it open. Lined with cilia and mucus to trap particles." },
  { id: "bronchi", label: "Bronchi", info: "Two main airways branching from the trachea, one leading to each lung. Also supported by cartilage." },
  { id: "bronchioles", label: "Bronchioles", info: "Smaller airways within the lungs. No cartilage — smooth muscle controls their diameter." },
  { id: "alveoli", label: "Alveoli", info: "Tiny air sacs (300 million per lung). One cell thick, surrounded by capillaries. Site of gas exchange by diffusion." },
  { id: "diaphragm", label: "Diaphragm", info: "A dome-shaped muscle below the lungs. Contracts (flattens) during inhalation, relaxes (domes up) during exhalation." },
  { id: "ribs", label: "Rib Cage", info: "Protects the lungs. Intercostal muscles between ribs contract to lift ribs up and out during inhalation." },
];

export default function RespiratoryDiagram() {
  const [selected, setSelected] = useState<string | null>(null);
  const [breathing, setBreathing] = useState(true);
  const [phase, setPhase] = useState<"inhale" | "exhale">("inhale");
  const selectedPart = parts.find(p => p.id === selected);

  useEffect(() => {
    if (!breathing) return;
    const interval = setInterval(() => setPhase(p => p === "inhale" ? "exhale" : "inhale"), 2000);
    return () => clearInterval(interval);
  }, [breathing]);

  const lungScale = phase === "inhale" ? 1.05 : 0.95;

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">The Respiratory System</h3>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-gray-500">Animated breathing cycle</p>
        <button onClick={() => setBreathing(!breathing)} className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">{breathing ? "Pause" : "Play"} animation</button>
        <span className="text-sm font-medium text-blue-600">{phase === "inhale" ? "↑ Inhaling" : "↓ Exhaling"}</span>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <svg viewBox="0 0 400 350" className="w-full max-w-md border rounded-xl bg-blue-50/30">
          {/* Rib cage */}
          <ellipse cx="200" cy="180" rx="140" ry="130" fill="none" stroke="#d1d5db" strokeWidth="2" strokeDasharray="8,4" onClick={() => setSelected("ribs")} className="cursor-pointer hover:stroke-gray-500" />
          {/* Trachea */}
          <rect x="190" y="20" width="20" height="80" rx="5" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" onClick={() => setSelected("trachea")} className="cursor-pointer hover:opacity-80" />
          {[30,45,60,75].map(y => <rect key={y} x="187" y={y} width="26" height="4" rx="2" fill="#60a5fa" />)}
          {/* Bronchi */}
          <path d="M200,100 L150,130" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" onClick={() => setSelected("bronchi")} className="cursor-pointer hover:opacity-80" />
          <path d="M200,100 L250,130" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" onClick={() => setSelected("bronchi")} className="cursor-pointer hover:opacity-80" />
          {/* Lungs */}
          <g style={{ transform: `scale(${lungScale})`, transformOrigin: "200px 200px", transition: "transform 1.5s ease-in-out" }}>
            <ellipse cx="140" cy="200" rx="70" ry="90" fill="#fca5a5" opacity="0.5" stroke="#ef4444" strokeWidth="1.5" />
            <ellipse cx="260" cy="200" rx="70" ry="90" fill="#fca5a5" opacity="0.5" stroke="#ef4444" strokeWidth="1.5" />
            {/* Bronchioles */}
            {[120,140,160].map(y => <line key={`l${y}`} x1="150" y1="130" x2={110+Math.random()*30} y2={y+40} stroke="#93c5fd" strokeWidth="2" onClick={() => setSelected("bronchioles")} className="cursor-pointer" />)}
            {[120,140,160].map(y => <line key={`r${y}`} x1="250" y1="130" x2={260+Math.random()*30} y2={y+40} stroke="#93c5fd" strokeWidth="2" onClick={() => setSelected("bronchioles")} className="cursor-pointer" />)}
            {/* Alveoli clusters */}
            {[[100,230],[120,260],[140,240],[260,230],[280,260],[300,240]].map(([cx,cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="12" fill="#fde68a" stroke="#f59e0b" strokeWidth="1" opacity="0.7" onClick={() => setSelected("alveoli")} className="cursor-pointer hover:opacity-100" />
            ))}
          </g>
          {/* Diaphragm */}
          <path d={phase === "inhale" ? "M60,310 Q200,290 340,310" : "M60,300 Q200,260 340,300"} stroke="#16a34a" strokeWidth="4" fill="none" style={{ transition: "d 1.5s ease-in-out" }} onClick={() => setSelected("diaphragm")} className="cursor-pointer" />
          {/* Labels */}
          <text x="200" y="15" textAnchor="middle" fill="#6b7280" fontSize="10">Trachea</text>
          <text x="200" y="340" textAnchor="middle" fill="#16a34a" fontSize="10" fontWeight="600">Diaphragm</text>
        </svg>
        <div className="flex-1">
          {selectedPart ? (
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-lg mb-2 text-blue-700">{selectedPart.label}</h4>
              <p className="text-gray-700">{selectedPart.info}</p>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400">Click on any structure to learn more</div>
          )}
        </div>
      </div>
    </div>
  );
}
