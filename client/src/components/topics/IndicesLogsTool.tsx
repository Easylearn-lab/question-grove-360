import { useState } from "react";
export default function IndicesLogsTool() {
  const [base, setBase] = useState(2);
  const [exp, setExp] = useState(8);
  const result = Math.pow(base, exp);
  const logResult = Math.log(result) / Math.log(base);
  const [surdInput, setSurdInput] = useState(72);
  const simplify = (n: number) => {
    let outside = 1, inside = n;
    for (let i = Math.floor(Math.sqrt(n)); i >= 2; i--) {
      if (n % (i * i) === 0) { outside = i; inside = n / (i * i); break; }
    }
    return { outside, inside };
  };
  const surd = simplify(surdInput);
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Indices, Logarithms and Surds</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <h4 className="font-bold text-purple-800 mb-3">Index Calculator</h4>
          <div className="flex items-center gap-2 mb-3">
            <input type="number" value={base} onChange={e => setBase(Number(e.target.value))} className="w-16 border rounded px-2 py-1 text-center" />
            <span className="text-lg">^</span>
            <input type="number" value={exp} onChange={e => setExp(Number(e.target.value))} className="w-16 border rounded px-2 py-1 text-center" />
            <span className="text-lg">=</span>
            <span className="text-xl font-bold text-purple-800">{result}</span>
          </div>
          <p className="text-sm text-gray-600">{base}<sup>{exp}</sup> = {result}</p>
          <p className="text-sm text-gray-600">Therefore: log<sub>{base}</sub>({result}) = {logResult}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h4 className="font-bold text-amber-800 mb-3">Surd Simplifier</h4>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">√</span>
            <input type="number" value={surdInput} onChange={e => setSurdInput(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-center" min="1" />
          </div>
          <p className="text-lg font-bold text-amber-800">
            √{surdInput} = {surd.outside > 1 ? `${surd.outside}√${surd.inside}` : `√${surd.inside}`}
          </p>
          {surd.outside > 1 && (
            <p className="text-sm text-gray-600 mt-2">
              √{surdInput} = √({surd.outside}² × {surd.inside}) = {surd.outside}√{surd.inside}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
