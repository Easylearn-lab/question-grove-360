import { useState, useMemo } from "react";
export default function StatisticsTool() {
  const [dataStr, setDataStr] = useState("4, 7, 2, 9, 5, 3, 8, 6, 1, 10");
  const data = useMemo(() => dataStr.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b), [dataStr]);
  const n = data.length;
  const mean = n > 0 ? data.reduce((a, b) => a + b, 0) / n : 0;
  const median = n > 0 ? (n % 2 === 0 ? (data[n/2 - 1] + data[n/2]) / 2 : data[Math.floor(n/2)]) : 0;
  const modeMap: Record<number, number> = {};
  data.forEach(v => { modeMap[v] = (modeMap[v] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(modeMap), 0);
  const modes = Object.entries(modeMap).filter(([, f]) => f === maxFreq && f > 1).map(([v]) => Number(v));
  const variance = n > 0 ? data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n : 0;
  const stdDev = Math.sqrt(variance);
  const range = n > 0 ? data[n - 1] - data[0] : 0;
  const maxVal = Math.max(...data, 1);
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Statistics Calculator</h3>
      <p className="text-sm text-gray-500 mb-4">Enter comma-separated numbers to calculate statistics</p>
      <input type="text" value={dataStr} onChange={e => setDataStr(e.target.value)} className="w-full border rounded px-3 py-2 font-mono mb-4" placeholder="Enter numbers separated by commas" />
      {n > 0 && (
        <>
          <svg viewBox={`0 0 ${Math.max(n * 40 + 40, 200)} 160`} className="w-full max-w-lg border rounded-xl bg-gray-50 mb-4">
            {data.map((v, i) => {
              const barH = (v / maxVal) * 120;
              return (
                <g key={i}>
                  <rect x={i * 40 + 20} y={140 - barH} width="30" height={barH} fill="#32CD32" rx="3" opacity="0.8" />
                  <text x={i * 40 + 35} y={155} textAnchor="middle" fill="#4b5563" fontSize="10">{v}</text>
                </g>
              );
            })}
            <line x1="15" y1="140" x2={n * 40 + 25} y2="140" stroke="#9ca3af" strokeWidth="1" />
          </svg>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs text-gray-500">Mean</p><p className="text-lg font-bold text-blue-800">{mean.toFixed(2)}</p></div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-xs text-gray-500">Median</p><p className="text-lg font-bold text-green-800">{median.toFixed(2)}</p></div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3"><p className="text-xs text-gray-500">Mode</p><p className="text-lg font-bold text-purple-800">{modes.length > 0 ? modes.join(", ") : "None"}</p></div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-xs text-gray-500">Range</p><p className="text-lg font-bold text-amber-800">{range}</p></div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs text-gray-500">Std Deviation</p><p className="text-lg font-bold text-red-800">{stdDev.toFixed(3)}</p></div>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3"><p className="text-xs text-gray-500">Count</p><p className="text-lg font-bold text-cyan-800">{n}</p></div>
          </div>
        </>
      )}
    </div>
  );
}
