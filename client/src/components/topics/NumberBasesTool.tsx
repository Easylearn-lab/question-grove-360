import { useState } from "react";
export default function NumberBasesTool() {
  const [input, setInput] = useState("42");
  const [fromBase, setFromBase] = useState(10);
  const [toBase, setToBase] = useState(2);
  const decimal = parseInt(input, fromBase);
  const isValid = !isNaN(decimal);
  const result = isValid ? decimal.toString(toBase).toUpperCase() : "Invalid";
  const bases = [2, 8, 10, 16];
  const baseNames: Record<number, string> = { 2: "Binary", 8: "Octal", 10: "Decimal", 16: "Hexadecimal" };
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Number Base Converter</h3>
      <p className="text-sm text-gray-500 mb-4">Convert between binary, octal, decimal, and hexadecimal</p>
      <div className="flex gap-4 items-end mb-6 flex-wrap">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Number</label>
          <input type="text" value={input} onChange={e => setInput(e.target.value.toUpperCase())} className="border rounded px-3 py-2 w-40 font-mono text-lg" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">From Base</label>
          <select value={fromBase} onChange={e => setFromBase(Number(e.target.value))} className="border rounded px-3 py-2">
            {bases.map(b => <option key={b} value={b}>{baseNames[b]} ({b})</option>)}
          </select>
        </div>
        <span className="text-2xl pb-1">→</span>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">To Base</label>
          <select value={toBase} onChange={e => setToBase(Number(e.target.value))} className="border rounded px-3 py-2">
            {bases.map(b => <option key={b} value={b}>{baseNames[b]} ({b})</option>)}
          </select>
        </div>
      </div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <p className="text-sm text-gray-600 mb-2">{input}<sub>{fromBase}</sub> = {isValid ? decimal : "?"}<sub>10</sub> = {result}<sub>{toBase}</sub></p>
        <p className="text-2xl font-bold font-mono text-indigo-800">{result}<sub className="text-sm">{toBase}</sub></p>
        {isValid && fromBase === 10 && toBase === 2 && (
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-1">Step-by-step (divide by 2, read remainders upward):</p>
            {(() => {
              let n = decimal; const steps: string[] = [];
              while (n > 0) { steps.push(`${n} ÷ 2 = ${Math.floor(n/2)} remainder ${n % 2}`); n = Math.floor(n/2); }
              return steps.map((s, i) => <p key={i}>{s}</p>);
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
