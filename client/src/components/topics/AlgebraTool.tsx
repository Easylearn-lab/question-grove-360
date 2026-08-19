import { useState } from "react";
export default function AlgebraTool() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-3);
  const [c, setC] = useState(2);
  const disc = b * b - 4 * a * c;
  const hasReal = disc >= 0;
  const x1 = hasReal ? (-b + Math.sqrt(disc)) / (2 * a) : NaN;
  const x2 = hasReal ? (-b - Math.sqrt(disc)) / (2 * a) : NaN;
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Quadratic Equation Solver</h3>
      <p className="text-sm text-gray-500 mb-4">Solve ax² + bx + c = 0 using the quadratic formula</p>
      <div className="flex gap-4 mb-6 flex-wrap">
        {[["a", a, setA], ["b", b, setB], ["c", c, setC]].map(([label, val, setter]: any) => (
          <div key={label} className="flex items-center gap-2">
            <label className="font-bold text-lg">{label} =</label>
            <input type="number" value={val} onChange={e => setter(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-center" />
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-4">
        <p className="text-lg font-mono mb-2">{a}x² + ({b})x + ({c}) = 0</p>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Step 1:</strong> Discriminant = b² - 4ac = ({b})² - 4({a})({c}) = {disc}</p>
          <p><strong>Step 2:</strong> {disc > 0 ? "Discriminant > 0 → Two real roots" : disc === 0 ? "Discriminant = 0 → One repeated root" : "Discriminant < 0 → No real roots"}</p>
          {hasReal && (
            <>
              <p><strong>Step 3:</strong> x = (-b ± √discriminant) / 2a</p>
              <p className="text-lg font-bold text-blue-800">x₁ = {x1.toFixed(3)}{x1 !== x2 && `, x₂ = ${x2.toFixed(3)}`}</p>
            </>
          )}
          {!hasReal && <p className="text-red-600 font-medium">No real solutions (complex roots only)</p>}
        </div>
      </div>
    </div>
  );
}
