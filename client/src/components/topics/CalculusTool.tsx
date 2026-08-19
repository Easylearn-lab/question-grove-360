import { useState, useMemo } from "react";
export default function CalculusTool() {
  const [coeff, setCoeff] = useState(1);
  const [power, setPower] = useState(3);
  const [xVal, setXVal] = useState(2);
  const dCoeff = coeff * power;
  const dPower = power - 1;
  const gradient = dCoeff * Math.pow(xVal, dPower);
  const yVal = coeff * Math.pow(xVal, power);
  // Generate curve points
  const points = useMemo(() => {
    const pts: [number, number][] = [];
    for (let x = -3; x <= 3; x += 0.1) {
      pts.push([x, coeff * Math.pow(x, power)]);
    }
    return pts;
  }, [coeff, power]);
  const svgW = 300, svgH = 250, cx = svgW / 2, cy = svgH / 2, scale = 20;
  const toSvg = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];
  const pathD = points.map(([x, y], i) => {
    const [sx, sy] = toSvg(x, Math.max(-5, Math.min(5, y)));
    return `${i === 0 ? "M" : "L"}${sx},${sy}`;
  }).join(" ");
  const [px, py] = toSvg(xVal, Math.max(-5, Math.min(5, yVal)));
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Calculus — Differentiation</h3>
      <p className="text-sm text-gray-500 mb-4">See how the gradient changes along a curve</p>
      <div className="flex gap-4 mb-4 flex-wrap">
        <div><label className="text-sm block mb-1">Coefficient</label><input type="number" value={coeff} onChange={e => setCoeff(Number(e.target.value))} className="w-16 border rounded px-2 py-1" /></div>
        <div><label className="text-sm block mb-1">Power</label><input type="number" value={power} onChange={e => setPower(Number(e.target.value))} className="w-16 border rounded px-2 py-1" min="1" max="5" /></div>
        <div><label className="text-sm block mb-1">x value</label><input type="range" min="-3" max="3" step="0.1" value={xVal} onChange={e => setXVal(Number(e.target.value))} className="w-40" /><span className="ml-2 font-mono">{xVal.toFixed(1)}</span></div>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm border rounded-xl bg-gray-50">
          <line x1="0" y1={cy} x2={svgW} y2={cy} stroke="#d1d5db" strokeWidth="1" />
          <line x1={cx} y1="0" x2={cx} y2={svgH} stroke="#d1d5db" strokeWidth="1" />
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" />
          <circle cx={px} cy={py} r="5" fill="#ef4444" />
          {/* Tangent line */}
          <line x1={px - 40} y1={py + gradient * 40 / scale * scale} x2={px + 40} y2={py - gradient * 40 / scale * scale} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x={px + 10} y={py - 10} fill="#ef4444" fontSize="10">gradient = {gradient.toFixed(2)}</text>
        </svg>
        <div className="flex-1 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm"><strong>Function:</strong> y = {coeff}x<sup>{power}</sup></p>
            <p className="text-sm"><strong>Derivative:</strong> dy/dx = {dCoeff}x<sup>{dPower}</sup></p>
            <p className="text-sm mt-2"><strong>At x = {xVal.toFixed(1)}:</strong></p>
            <p className="text-sm">y = {yVal.toFixed(3)}</p>
            <p className="text-sm">Gradient = {gradient.toFixed(3)}</p>
          </div>
          <p className="text-xs text-gray-500">The red dot shows the point on the curve. The dashed line is the tangent (gradient) at that point.</p>
        </div>
      </div>
    </div>
  );
}
