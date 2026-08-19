import { useState } from "react";
const organs = [
  { id: "mouth", label: "Mouth", y: 30, info: "Mechanical digestion (teeth) and chemical digestion (salivary amylase breaks starch into maltose)." },
  { id: "oesophagus", label: "Oesophagus", y: 80, info: "Muscular tube connecting mouth to stomach. Moves food by peristalsis (wave-like contractions)." },
  { id: "stomach", label: "Stomach", y: 140, info: "Produces HCl (pH 2) and pepsin. Churns food into chyme. Protein digestion begins here." },
  { id: "liver", label: "Liver", y: 140, info: "Produces bile which is stored in the gallbladder. Bile emulsifies fats into smaller droplets." },
  { id: "small", label: "Small Intestine", y: 220, info: "Main site of digestion and absorption. Villi and microvilli increase surface area enormously." },
  { id: "large", label: "Large Intestine", y: 290, info: "Absorbs water and minerals. Contains beneficial bacteria. Forms faeces." },
  { id: "rectum", label: "Rectum/Anus", y: 340, info: "Stores faeces until elimination. Sphincter muscles control release." },
];
export default function DigestiveDiagram() {
  const [selected, setSelected] = useState<string | null>(null);
  const [foodPos, setFoodPos] = useState(0);
  const sel = organs.find(o => o.id === selected);
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">The Digestive System</h3>
      <p className="text-sm text-gray-500 mb-4">Click organs to explore. Press Play to animate food movement.</p>
      <button onClick={() => { setFoodPos(0); const i = setInterval(() => setFoodPos(p => { if (p >= 6) { clearInterval(i); return 6; } return p + 1; }), 800); }} className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium mb-4">▶ Animate food journey</button>
      <div className="flex flex-col lg:flex-row gap-6">
        <svg viewBox="0 0 300 380" className="w-full max-w-sm border rounded-xl bg-amber-50/30">
          {organs.map((o, i) => {
            const isLiver = o.id === "liver";
            const cx = isLiver ? 80 : 150;
            return (
              <g key={o.id} onClick={() => setSelected(selected === o.id ? null : o.id)} className="cursor-pointer">
                <rect x={cx - 50} y={o.y} width="100" height={o.id === "small" ? 50 : 35} rx="12" fill={selected === o.id ? "#f59e0b" : "#fde68a"} stroke="#d97706" strokeWidth="1.5" className="transition-colors hover:fill-amber-300" />
                <text x={cx} y={o.y + (o.id === "small" ? 28 : 22)} textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="600">{o.label}</text>
                {i < organs.length - 1 && !isLiver && o.id !== "stomach" && <line x1="150" y1={o.y + (o.id === "small" ? 50 : 35)} x2="150" y2={organs[i+1]?.y || o.y + 50} stroke="#d97706" strokeWidth="2" strokeDasharray="4,3" />}
              </g>
            );
          })}
          {/* Food dot */}
          {foodPos <= 6 && <circle cx={organs[foodPos]?.id === "liver" ? 80 : 150} cy={organs[foodPos]?.y + 18 || 48} r="8" fill="#16a34a" className="transition-all duration-700"><animate attributeName="opacity" values="1;0.5;1" dur="0.8s" repeatCount="indefinite" /></circle>}
        </svg>
        <div className="flex-1">
          {sel ? (
            <div className="bg-white border rounded-xl p-5 shadow-sm"><h4 className="font-bold text-lg mb-2 text-amber-700">{sel.label}</h4><p className="text-gray-700">{sel.info}</p></div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400">Click on an organ to learn more</div>
          )}
        </div>
      </div>
    </div>
  );
}
