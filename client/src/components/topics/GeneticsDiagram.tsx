import { useState, useMemo } from "react";
export default function GeneticsDiagram() {
  const [parent1, setParent1] = useState("Bb");
  const [parent2, setParent2] = useState("Bb");
  const alleles1 = parent1.split("");
  const alleles2 = parent2.split("");
  const grid = useMemo(() => {
    const results: string[][] = [];
    for (const a of alleles1) {
      const row: string[] = [];
      for (const b of alleles2) {
        const combo = [a, b].sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()) || (x < y ? -1 : 1)).join("");
        row.push(combo);
      }
      results.push(row);
    }
    return results;
  }, [parent1, parent2]);
  const allCombos = grid.flat();
  const dominant = allCombos.filter(c => c[0] === c[0].toUpperCase() || c[1] === c[1]?.toUpperCase()).length;
  const homoDom = allCombos.filter(c => c === "BB").length;
  const hetero = allCombos.filter(c => c === "Bb" || c === "bB").length;
  const homoRec = allCombos.filter(c => c === "bb").length;
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Punnett Square — Genetics</h3>
      <p className="text-sm text-gray-500 mb-4">Select parent genotypes to see offspring probabilities</p>
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Parent 1</label>
          <select value={parent1} onChange={e => setParent1(e.target.value)} className="ml-2 border rounded px-2 py-1 text-sm">
            <option value="BB">BB (Homozygous Dominant)</option>
            <option value="Bb">Bb (Heterozygous)</option>
            <option value="bb">bb (Homozygous Recessive)</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Parent 2</label>
          <select value={parent2} onChange={e => setParent2(e.target.value)} className="ml-2 border rounded px-2 py-1 text-sm">
            <option value="BB">BB (Homozygous Dominant)</option>
            <option value="Bb">Bb (Heterozygous)</option>
            <option value="bb">bb (Homozygous Recessive)</option>
          </select>
        </div>
      </div>
      <div className="inline-block border rounded-xl overflow-hidden mb-6">
        <table className="border-collapse">
          <thead>
            <tr><th className="w-16 h-12 bg-gray-100"></th>{alleles2.map((a, i) => <th key={i} className="w-20 h-12 bg-purple-100 text-purple-800 font-bold text-lg border">{a}</th>)}</tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i}>
                <td className="w-16 h-16 bg-blue-100 text-blue-800 font-bold text-lg text-center border">{alleles1[i]}</td>
                {row.map((cell, j) => {
                  const isDom = cell.includes("B");
                  return <td key={j} className={`w-20 h-16 text-center font-bold text-xl border ${isDom ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{cell}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 flex-wrap">
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2"><span className="text-sm text-green-800">BB: <strong>{homoDom}/4</strong> ({homoDom*25}%)</span></div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2"><span className="text-sm text-amber-800">Bb: <strong>{hetero}/4</strong> ({hetero*25}%)</span></div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2"><span className="text-sm text-red-800">bb: <strong>{homoRec}/4</strong> ({homoRec*25}%)</span></div>
      </div>
      <p className="text-sm text-gray-600 mt-4">Phenotype ratio: <strong>{dominant} dominant : {4-dominant} recessive</strong></p>
    </div>
  );
}
