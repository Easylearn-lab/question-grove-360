import { useState, useMemo } from "react";
export default function SetsProbabilityTool() {
  const [setAStr, setSetAStr] = useState("1, 2, 3, 4, 5");
  const [setBStr, setSetBStr] = useState("3, 4, 5, 6, 7");
  const setA = useMemo(() => new Set(setAStr.split(",").map(s => s.trim()).filter(Boolean)), [setAStr]);
  const setB = useMemo(() => new Set(setBStr.split(",").map(s => s.trim()).filter(Boolean)), [setBStr]);
  const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
  const union = new Set(Array.from(setA).concat(Array.from(setB)));
  const diffAB = new Set(Array.from(setA).filter(x => !setB.has(x)));
  const diffBA = new Set(Array.from(setB).filter(x => !setA.has(x)));
  const aOnly = diffAB.size;
  const bOnly = diffBA.size;
  const both = intersection.size;
  const total = union.size;
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Sets and Probability — Venn Diagram</h3>
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px]"><label className="text-sm font-medium text-blue-700 block mb-1">Set A</label><input type="text" value={setAStr} onChange={e => setSetAStr(e.target.value)} className="w-full border border-blue-200 rounded px-3 py-2 text-sm" /></div>
        <div className="flex-1 min-w-[200px]"><label className="text-sm font-medium text-red-700 block mb-1">Set B</label><input type="text" value={setBStr} onChange={e => setSetBStr(e.target.value)} className="w-full border border-red-200 rounded px-3 py-2 text-sm" /></div>
      </div>
      <svg viewBox="0 0 400 250" className="w-full max-w-md border rounded-xl bg-gray-50 mb-4">
        <circle cx="160" cy="125" r="90" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" strokeWidth="2" />
        <circle cx="240" cy="125" r="90" fill="#ef4444" opacity="0.2" stroke="#ef4444" strokeWidth="2" />
        <text x="110" y="125" textAnchor="middle" fill="#1d4ed8" fontSize="12" fontWeight="600">{Array.from(diffAB).join(", ")}</text>
        <text x="200" y="125" textAnchor="middle" fill="#7c3aed" fontSize="12" fontWeight="700">{Array.from(intersection).join(", ")}</text>
        <text x="290" y="125" textAnchor="middle" fill="#dc2626" fontSize="12" fontWeight="600">{Array.from(diffBA).join(", ")}</text>
        <text x="110" y="40" textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="700">A</text>
        <text x="290" y="40" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="700">B</text>
      </svg>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs text-gray-500">A only</p><p className="font-bold text-blue-800">{aOnly}</p></div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3"><p className="text-xs text-gray-500">A ∩ B</p><p className="font-bold text-purple-800">{both}</p></div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs text-gray-500">B only</p><p className="font-bold text-red-800">{bOnly}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-xs text-gray-500">A ∪ B</p><p className="font-bold text-green-800">{total}</p></div>
      </div>
      {total > 0 && (
        <div className="mt-4 bg-gray-50 border rounded-lg p-4 text-sm text-gray-700">
          <p><strong>P(A) = {setA.size}/{total} = {(setA.size/total).toFixed(3)}</strong></p>
          <p><strong>P(B) = {setB.size}/{total} = {(setB.size/total).toFixed(3)}</strong></p>
          <p><strong>P(A ∩ B) = {both}/{total} = {(both/total).toFixed(3)}</strong></p>
          <p><strong>P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = {(setA.size/total).toFixed(3)} + {(setB.size/total).toFixed(3)} - {(both/total).toFixed(3)} = {(total/total).toFixed(3)}</strong></p>
        </div>
      )}
    </div>
  );
}
