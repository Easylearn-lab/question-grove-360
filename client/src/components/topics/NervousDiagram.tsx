import { useState } from "react";
const regions = [
  { id: "cerebrum", label: "Cerebrum", cx: 200, cy: 80, r: 60, color: "#ec4899", info: "Largest part of the brain. Controls thinking, memory, speech, voluntary movement, and sensory processing." },
  { id: "cerebellum", label: "Cerebellum", cx: 280, cy: 150, r: 30, color: "#8b5cf6", info: "Located at the back of the brain. Controls balance, coordination, and fine motor skills." },
  { id: "medulla", label: "Medulla Oblongata", cx: 250, cy: 190, r: 20, color: "#06b6d4", info: "Controls involuntary functions: breathing rate, heart rate, blood pressure, swallowing, and vomiting." },
  { id: "spinal", label: "Spinal Cord", cx: 250, cy: 260, r: 15, color: "#14b8a6", info: "Relay between brain and body. Contains relay neurons for reflex arcs. Protected by vertebrae." },
];
export default function NervousDiagram() {
  const [selected, setSelected] = useState<string | null>(null);
  const [signalActive, setSignalActive] = useState(false);
  const sel = regions.find(r => r.id === selected);
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">The Nervous System</h3>
      <p className="text-sm text-gray-500 mb-2">Click brain regions to explore</p>
      <button onClick={() => { setSignalActive(true); setTimeout(() => setSignalActive(false), 2000); }} className="text-xs px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 font-medium mb-4">⚡ Animate nerve signal</button>
      <div className="flex flex-col lg:flex-row gap-6">
        <svg viewBox="0 0 400 320" className="w-full max-w-md border rounded-xl bg-purple-50/30">
          {/* Brain outline */}
          <ellipse cx="210" cy="110" rx="120" ry="90" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5" opacity="0.4" />
          {regions.map(r => (
            <g key={r.id} onClick={() => setSelected(selected === r.id ? null : r.id)} className="cursor-pointer">
              {r.id === "spinal" ? (
                <rect x={r.cx - 8} y={220} width="16" height="80" rx="8" fill={r.color} opacity={selected === r.id ? 1 : 0.7} stroke={selected === r.id ? "#000" : "none"} strokeWidth="2" className="hover:opacity-100 transition-opacity" />
              ) : (
                <circle cx={r.cx} cy={r.cy} r={r.r} fill={r.color} opacity={selected === r.id ? 1 : 0.6} stroke={selected === r.id ? "#000" : "none"} strokeWidth="2" className="hover:opacity-100 transition-opacity" />
              )}
              <text x={r.cx} y={r.id === "spinal" ? 315 : r.cy + r.r + 14} textAnchor="middle" fill="#4b5563" fontSize="10" fontWeight="500">{r.label}</text>
            </g>
          ))}
          {/* Neuron illustration */}
          <g transform="translate(30, 220)">
            <circle cx="20" cy="20" r="12" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <text x="20" y="24" textAnchor="middle" fill="#78350f" fontSize="7">Cell Body</text>
            <line x1="32" y1="20" x2="120" y2="20" stroke="#d97706" strokeWidth="3" />
            <text x="76" y="14" textAnchor="middle" fill="#92400e" fontSize="7">Axon</text>
            {[40,60,80,100].map(x => <rect key={x} x={x} y="17" width="12" height="6" rx="3" fill="#fde68a" opacity="0.6" />)}
            {signalActive && <circle r="5" fill="#22c55e"><animateMotion dur="1s" path="M32,20 L120,20" fill="freeze" /></circle>}
          </g>
        </svg>
        <div className="flex-1">
          {sel ? (
            <div className="bg-white border rounded-xl p-5 shadow-sm"><h4 className="font-bold text-lg mb-2" style={{color: sel.color}}>{sel.label}</h4><p className="text-gray-700">{sel.info}</p></div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400">Click on a brain region to learn more</div>
          )}
        </div>
      </div>
    </div>
  );
}
