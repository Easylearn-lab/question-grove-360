import { useState, useMemo } from "react";
export default function TrigonometryTool() {
  const [angle, setAngle] = useState(30);
  const [hyp, setHyp] = useState(10);
  const rad = (angle * Math.PI) / 180;
  const opp = hyp * Math.sin(rad);
  const adj = hyp * Math.cos(rad);
  const tanVal = Math.tan(rad);
  // SVG triangle coords
  const scale = 2;
  const ax = 40, ay = 250;
  const bx = ax + adj * scale * 10 / hyp, by = ay;
  const cx = ax, cy = ay - opp * scale * 10 / hyp;
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Trigonometry — SOH CAH TOA</h3>
      <p className="text-sm text-gray-500 mb-4">Adjust the angle and hypotenuse to see trig ratios</p>
      <div className="flex gap-4 mb-4 flex-wrap">
        <div><label className="text-sm font-medium block mb-1">Angle (°)</label><input type="range" min="5" max="85" value={angle} onChange={e => setAngle(Number(e.target.value))} className="w-40" /><span className="ml-2 font-bold">{angle}°</span></div>
        <div><label className="text-sm font-medium block mb-1">Hypotenuse</label><input type="number" value={hyp} onChange={e => setHyp(Number(e.target.value))} className="w-20 border rounded px-2 py-1" min="1" /></div>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <svg viewBox="0 0 300 280" className="w-full max-w-xs border rounded-xl bg-blue-50/30">
          <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#3b82f6" strokeWidth="3" />
          <line x1={ax} y1={ay} x2={cx} y2={cy} stroke="#ef4444" strokeWidth="3" />
          <line x1={bx} y1={by} x2={cx} y2={cy} stroke="#16a34a" strokeWidth="3" />
          <rect x={ax} y={ay - 15} width="15" height="15" fill="none" stroke="#6b7280" strokeWidth="1" />
          <text x={(ax + bx) / 2} y={ay + 20} textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="600">Adjacent = {adj.toFixed(2)}</text>
          <text x={ax - 5} y={(ay + cy) / 2} textAnchor="end" fill="#ef4444" fontSize="11" fontWeight="600">Opp = {opp.toFixed(2)}</text>
          <text x={(bx + cx) / 2 + 15} y={(by + cy) / 2} fill="#16a34a" fontSize="11" fontWeight="600">Hyp = {hyp}</text>
          <text x={ax + 25} y={ay - 5} fill="#7c3aed" fontSize="10">{angle}°</text>
        </svg>
        <div className="flex-1 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm"><strong>sin({angle}°)</strong> = Opp/Hyp = {opp.toFixed(3)}/{hyp} = <strong>{Math.sin(rad).toFixed(4)}</strong></p></div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-sm"><strong>cos({angle}°)</strong> = Adj/Hyp = {adj.toFixed(3)}/{hyp} = <strong>{Math.cos(rad).toFixed(4)}</strong></p></div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-sm"><strong>tan({angle}°)</strong> = Opp/Adj = {opp.toFixed(3)}/{adj.toFixed(3)} = <strong>{tanVal.toFixed(4)}</strong></p></div>
          <p className="text-xs text-gray-500 mt-2">Remember: <strong>S</strong>OH <strong>C</strong>AH <strong>T</strong>OA</p>
        </div>
      </div>
    </div>
  );
}
