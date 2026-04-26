import CalculoPorMateriaPrima from "@/pages/CalculoPorMateriaPrima";

export default function CalculosPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Cálculo de Matéria-Prima</h1>
        <p className="mt-1 text-sm text-slate-500">
          Liste os Produtos Acabados e suas quantidades para calcular o consumo total de matéria-prima
          agrupado por grupo. Quando a matéria-prima tem unidade de conversão cadastrada, a quantidade
          aparece também na segunda unidade.
        </p>
      </div>

      <CalculoPorMateriaPrima />
    </div>
  );
}
