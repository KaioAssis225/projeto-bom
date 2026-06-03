import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Search, Package, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/api/client";
import { requisicoesApi, type ItemRequisicao, type RequisicaoItemPayload } from "@/api/requisicoes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  _key: string;
  item: ItemRequisicao;
  quantidade: string;
  unidade_key: "UOM1" | "UOM2";
  notes: string;
}

function makeKey() {
  return Math.random().toString(36).slice(2);
}

// ─── Item search dropdown ─────────────────────────────────────────────────────

function ItemPicker({
  items,
  onPick,
  placeholder,
}: {
  items: ItemRequisicao[];
  onPick: (item: ItemRequisicao) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = search.trim()
    ? items.filter((i) =>
        `${i.code} ${i.description}`.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 text-sm outline-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onPick(item); setSearch(""); setOpen(false); }}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.code}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── UOM Toggle ──────────────────────────────────────────────────────────────

function UomToggle({
  value,
  onChange,
  uom1,
  uom2,
}: {
  value: "UOM1" | "UOM2";
  onChange: (v: "UOM1" | "UOM2") => void;
  uom1: string;
  uom2: string | null;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange("UOM1")}
        className={cn(
          "px-3 py-2 transition",
          value === "UOM1" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
        )}
      >
        {uom1}
      </button>
      {uom2 && (
        <button
          type="button"
          onClick={() => onChange("UOM2")}
          className={cn(
            "border-l border-slate-300 px-3 py-2 transition",
            value === "UOM2" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {uom2}
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Mode = "direto" | "pa";

export default function RequisicaoNovaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [groupId, setGroupId] = useState("");
  const [mode, setMode] = useState<Mode>("direto");
  const [paId, setPaId] = useState("");
  const [paSearch, setPaSearch] = useState("");
  const [paOpen, setPaOpen] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");

  const gruposQuery = useQuery({ queryKey: ["req-grupos"], queryFn: requisicoesApi.grupos });

  const mpQuery = useQuery({
    queryKey: ["req-mp", groupId],
    queryFn: () => requisicoesApi.materiasPorGrupo(groupId),
    enabled: !!groupId && mode === "direto",
  });

  const paListQuery = useQuery({
    queryKey: ["req-pa-list"],
    queryFn: requisicoesApi.produtosAcabados,
    enabled: mode === "pa",
  });

  const bomQuery = useQuery({
    queryKey: ["req-bom", paId, groupId],
    queryFn: () => requisicoesApi.itensBomPorGrupo(paId, groupId),
    enabled: !!paId && !!groupId && mode === "pa",
  });

  // Reset lines when group or mode changes
  useEffect(() => { setLines([]); setPaId(""); setPaSearch(""); }, [groupId, mode]);
  useEffect(() => { setLines([]); }, [paId]);

  const addItem = (item: ItemRequisicao) => {
    if (lines.some((l) => l.item.id === item.id)) {
      toast.info("Item já adicionado");
      return;
    }
    setLines((prev) => [...prev, { _key: makeKey(), item, quantidade: "", unidade_key: "UOM1", notes: "" }]);
  };

  const addAllFromBom = () => {
    const items = bomQuery.data ?? [];
    const existing = new Set(lines.map((l) => l.item.id));
    const newLines = items
      .filter((i) => !existing.has(i.id))
      .map((i) => ({ _key: makeKey(), item: i, quantidade: "", unidade_key: "UOM1" as const, notes: "" }));
    setLines((prev) => [...prev, ...newLines]);
  };

  const updateLine = (key: string, patch: Partial<LineItem>) => {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
  };

  const createMutation = useMutation({
    mutationFn: requisicoesApi.create,
    onSuccess: () => {
      toast.success("Requisição enviada com sucesso!");
      qc.invalidateQueries({ queryKey: ["requisicoes"] });
      navigate("/requisicoes");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const handleSubmit = () => {
    if (!groupId) { toast.error("Selecione um grupo"); return; }
    if (lines.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    const invalid = lines.filter((l) => !l.quantidade || Number(l.quantidade) <= 0);
    if (invalid.length > 0) { toast.error("Informe a quantidade de todos os itens"); return; }

    const itens: RequisicaoItemPayload[] = lines.map((l) => ({
      item_id: l.item.id,
      quantidade: Number(l.quantidade),
      unidade_key: l.unidade_key,
      notes: l.notes || undefined,
    }));

    createMutation.mutate({ group_id: groupId, itens, notes: notes || undefined });
  };

  const selectedGroup = gruposQuery.data?.find((g) => g.id === groupId);
  const paList = paListQuery.data ?? [];
  const filteredPa = paSearch.trim()
    ? paList.filter((p) => `${p.code} ${p.description}`.toLowerCase().includes(paSearch.toLowerCase()))
    : paList;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nova Requisição</h1>
            <p className="text-sm text-slate-500">Solicite materiais do estoque</p>
          </div>
        </div>
      </div>

      {/* Grupo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <label className="text-sm font-semibold text-slate-700">Grupo de material</label>
        {gruposQuery.isLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
        ) : (
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Selecione um grupo...</option>
            {gruposQuery.data?.map((g) => (
              <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Modo */}
      {groupId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("direto")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition",
                mode === "direto"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300",
              )}
            >
              <Search className="h-4 w-4" />
              Item Direto
            </button>
            <button
              type="button"
              onClick={() => setMode("pa")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition",
                mode === "pa"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300",
              )}
            >
              <Package className="h-4 w-4" />
              Via Produto Acabado
            </button>
          </div>

          {/* Item direto */}
          {mode === "direto" && (
            <div>
              <p className="mb-2 text-xs text-slate-500">Busque e adicione itens de <strong>{selectedGroup?.name}</strong></p>
              {mpQuery.isLoading ? (
                <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
              ) : (
                <ItemPicker
                  items={mpQuery.data ?? []}
                  onPick={addItem}
                  placeholder={`Buscar em ${selectedGroup?.name}...`}
                />
              )}
            </div>
          )}

          {/* Via PA */}
          {mode === "pa" && (
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs text-slate-500">Selecione o produto acabado para ver os materiais de <strong>{selectedGroup?.name}</strong> dentro do BOM dele</p>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={paId ? (paList.find((p) => p.id === paId)?.code ?? "") : paSearch}
                      onChange={(e) => { setPaSearch(e.target.value); setPaId(""); setPaOpen(true); }}
                      onFocus={() => setPaOpen(true)}
                      placeholder="Buscar produto acabado..."
                      className="flex-1 text-sm outline-none"
                    />
                  </div>
                  {paOpen && filteredPa.length > 0 && !paId && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPaOpen(false)} />
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {filteredPa.map((pa) => (
                          <button
                            key={pa.id}
                            type="button"
                            onClick={() => { setPaId(pa.id); setPaSearch(pa.code); setPaOpen(false); }}
                            className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-slate-50"
                          >
                            <p className="text-sm font-medium text-slate-900">{pa.code}</p>
                            <p className="text-xs text-slate-500">{pa.description}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {paId && (
                <div>
                  {bomQuery.isLoading ? (
                    <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
                  ) : bomQuery.data?.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhum item de {selectedGroup?.name} encontrado neste PA.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">{bomQuery.data?.length} item(s) encontrado(s)</p>
                        <button
                          type="button"
                          onClick={addAllFromBom}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          + Adicionar todos
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {bomQuery.data?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-4 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{item.code}</p>
                              <p className="text-xs text-slate-500">{item.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              disabled={lines.some((l) => l.item.id === item.id)}
                              className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                            >
                              {lines.some((l) => l.item.id === item.id) ? "Adicionado" : "+ Adicionar"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Itens adicionados */}
      {lines.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Itens da requisição</h2>
            <span className="text-xs text-slate-500">{lines.length} item(s)</span>
          </div>
          <div className="divide-y divide-slate-100">
            {lines.map((line) => (
              <div key={line._key} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{line.item.code}</p>
                  <p className="text-xs text-slate-500 truncate">{line.item.description}</p>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Qtd"
                  value={line.quantidade}
                  onChange={(e) => updateLine(line._key, { quantidade: e.target.value })}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <UomToggle
                  value={line.unidade_key}
                  onChange={(v) => updateLine(line._key, { unidade_key: v })}
                  uom1={line.item.uom1_code}
                  uom2={line.item.uom2_code}
                />
                <button
                  type="button"
                  onClick={() => removeLine(line._key)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações + Submit */}
      {lines.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contexto ou urgência da requisição..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar Requisição
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
