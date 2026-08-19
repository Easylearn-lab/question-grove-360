import { useState } from "react";
const maleParts = [
  { id: "testes", label: "Testes", info: "Produce sperm cells and the hormone testosterone. Located outside the body for temperature regulation." },
  { id: "epididymis", label: "Epididymis", info: "Coiled tube where sperm mature and are stored before ejaculation." },
  { id: "vas", label: "Vas Deferens", info: "Muscular tube that carries sperm from the epididymis to the urethra during ejaculation." },
  { id: "prostate", label: "Prostate Gland", info: "Produces alkaline seminal fluid that nourishes sperm and neutralises vaginal acidity." },
  { id: "urethra", label: "Urethra", info: "Shared passage for urine and semen (not simultaneously). Runs through the penis." },
];
const femaleParts = [
  { id: "ovaries", label: "Ovaries", info: "Produce eggs (ova) and hormones oestrogen and progesterone. One egg released per cycle (ovulation)." },
  { id: "fallopian", label: "Fallopian Tubes", info: "Also called oviducts. Fertilization occurs here. Cilia waft the egg toward the uterus." },
  { id: "uterus", label: "Uterus", info: "Muscular organ where the embryo implants and develops. Lining thickens each cycle." },
  { id: "cervix", label: "Cervix", info: "Narrow opening at the base of the uterus. Produces mucus that changes consistency during the cycle." },
  { id: "vagina", label: "Vagina", info: "Birth canal. Receives sperm during intercourse. Muscular and elastic." },
];
export default function ReproductionDiagram() {
  const [system, setSystem] = useState<"male" | "female">("female");
  const [selected, setSelected] = useState<string | null>(null);
  const parts = system === "male" ? maleParts : femaleParts;
  const sel = parts.find(p => p.id === selected);
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Reproductive System</h3>
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setSystem("female"); setSelected(null); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${system === "female" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600"}`}>Female</button>
        <button onClick={() => { setSystem("male"); setSelected(null); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${system === "male" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>Male</button>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full max-w-md border rounded-xl bg-pink-50/20 p-6">
          <div className="space-y-3">
            {parts.map((p, i) => (
              <button key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)} className={`w-full text-left p-3 rounded-lg border transition-all ${selected === p.id ? (system === "female" ? "bg-pink-100 border-pink-400" : "bg-blue-100 border-blue-400") : "bg-white border-gray-200 hover:border-gray-300"}`}>
                <span className="font-medium text-gray-900">{i+1}. {p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          {sel ? (
            <div className="bg-white border rounded-xl p-5 shadow-sm"><h4 className={`font-bold text-lg mb-2 ${system === "female" ? "text-pink-700" : "text-blue-700"}`}>{sel.label}</h4><p className="text-gray-700">{sel.info}</p></div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400">Click on a structure to learn more</div>
          )}
        </div>
      </div>
    </div>
  );
}
