import { useState } from "react";
const organisms = [
  { id: "sun", label: "Sun (Energy Source)", level: 0, x: 200, y: 30, color: "#fbbf24", info: "All energy in ecosystems originates from the sun. Producers capture it via photosynthesis." },
  { id: "grass", label: "Grass (Producer)", level: 1, x: 100, y: 100, color: "#22c55e", info: "Producers make their own food via photosynthesis. They are the base of every food chain." },
  { id: "tree", label: "Tree (Producer)", level: 1, x: 300, y: 100, color: "#16a34a", info: "Trees are large producers. They provide food and habitat for many organisms." },
  { id: "rabbit", label: "Rabbit (Primary Consumer)", level: 2, x: 100, y: 180, color: "#a78bfa", info: "Herbivores that eat producers. Only ~10% of energy from grass transfers to the rabbit." },
  { id: "caterpillar", label: "Caterpillar (Primary Consumer)", level: 2, x: 300, y: 180, color: "#c084fc", info: "Herbivorous invertebrate. Eats leaves. Prey for many secondary consumers." },
  { id: "fox", label: "Fox (Secondary Consumer)", level: 3, x: 100, y: 260, color: "#f97316", info: "Carnivore/omnivore that eats primary consumers. Only ~10% of energy transfers up." },
  { id: "bird", label: "Bird (Secondary Consumer)", level: 3, x: 300, y: 260, color: "#fb923c", info: "Eats caterpillars and other invertebrates. Prey for tertiary consumers." },
  { id: "hawk", label: "Hawk (Tertiary Consumer)", level: 4, x: 200, y: 330, color: "#dc2626", info: "Top predator. Eats secondary consumers. Receives the least energy in the food chain." },
];
const links = [["sun","grass"],["sun","tree"],["grass","rabbit"],["tree","caterpillar"],["rabbit","fox"],["caterpillar","bird"],["fox","hawk"],["bird","hawk"]];
export default function EcologyDiagram() {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = organisms.find(o => o.id === selected);
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Food Web — Energy Flow</h3>
      <p className="text-sm text-gray-500 mb-4">Click organisms to see their role. Arrows show energy flow direction.</p>
      <div className="flex flex-col lg:flex-row gap-6">
        <svg viewBox="0 0 400 380" className="w-full max-w-md border rounded-xl bg-emerald-50/30">
          <defs><marker id="arrowG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#6b7280" /></marker></defs>
          {links.map(([from, to], i) => {
            const f = organisms.find(o => o.id === from)!;
            const t = organisms.find(o => o.id === to)!;
            return <line key={i} x1={f.x} y1={f.y + 15} x2={t.x} y2={t.y - 15} stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#arrowG)" />;
          })}
          {organisms.map(o => (
            <g key={o.id} onClick={() => setSelected(selected === o.id ? null : o.id)} className="cursor-pointer">
              <circle cx={o.x} cy={o.y} r={o.id === "sun" ? 22 : 18} fill={o.color} opacity={selected === o.id ? 1 : 0.7} stroke={selected === o.id ? "#000" : "none"} strokeWidth="2" className="hover:opacity-100 transition-opacity" />
              <text x={o.x} y={o.y + 32} textAnchor="middle" fill="#374151" fontSize="9" fontWeight="500">{o.label.split("(")[0].trim()}</text>
            </g>
          ))}
          {/* Energy loss labels */}
          <text x="50" y="145" fill="#9ca3af" fontSize="8" transform="rotate(-30, 50, 145)">~10% energy</text>
        </svg>
        <div className="flex-1">
          {sel ? (
            <div className="bg-white border rounded-xl p-5 shadow-sm"><h4 className="font-bold text-lg mb-2" style={{color:sel.color}}>{sel.label}</h4><p className="text-gray-700">{sel.info}</p></div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400">Click on an organism to learn about its role</div>
          )}
        </div>
      </div>
    </div>
  );
}

