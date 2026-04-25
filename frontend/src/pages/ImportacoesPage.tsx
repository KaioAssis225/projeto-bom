import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { client } from "@/api/client";
import {
  TEMPLATE_CSV_URL as MP_TEMPLATE_CSV,
  TEMPLATE_XLSX_URL as MP_TEMPLATE_XLSX,
} from "@/api/materias-primas";
import {
  TEMPLATE_CSV_URL as PA_TEMPLATE_CSV,
  TEMPLATE_XLSX_URL as PA_TEMPLATE_XLSX,
} from "@/api/produtos-acabados";
import { useImportMateriasPrimasCsv } from "@/hooks/useMateriaPrima";
import { useImportProdutosAcabadosCsv } from "@/hooks/useProdutoAcabado";
import { cn } from "@/lib/utils";
import type { ImportResult } from "@/types";

type TabKey = "materias" | "produtos";

type FieldDef = {
  name: string;
  required: boolean;
  description: string;
  example: string;
};

const MP_FIELDS: FieldDef[] = [
  { name: "code", required: true, description: "Código único do item (até 60 caracteres).", example: "MP001" },
  { name: "description", required: true, description: "Descrição da matéria-prima (até 255 caracteres).", example: "TINTA AZUL" },
  { name: "unit_of_measure_code", required: true, description: "Código da Unidade de Medida principal já cadastrada.", example: "KG" },
  { name: "material_group_code", required: true, description: "Código do Grupo de Materiais já cadastrado.", example: "GRP01" },
  { name: "supplier_code", required: false, description: "Código do Fornecedor já cadastrado.", example: "FOR01" },
  { name: "unidade_conversao_code", required: false, description: "Código da Unidade de Conversão (UoM secundária).", example: "G" },
  { name: "peso_liquido", required: false, description: "Fator de conversão para a unidade secundária. Use vírgula como separador decimal.", example: "1,250" },
  { name: "notes", required: false, description: "Observações livres.", example: "lote especial" },
];

const PA_FIELDS: FieldDef[] = [
  { name: "code", required: true, description: "Código único do produto (até 60 caracteres).", example: "PA001" },
  { name: "description", required: true, description: "Descrição do produto acabado (até 255 caracteres).", example: "COLAR LINHA PREMIUM" },
  { name: "unit_of_measure_code", required: true, description: "Código da Unidade de Medida já cadastrada.", example: "UN" },
  { name: "peso_liquido", required: false, description: "Peso líquido em decimal (vírgula como separador).", example: "0,500" },
  { name: "catalogo", required: false, description: "Catálogo (até 120 caracteres).", example: "CAT-2026" },
  { name: "linha", required: false, description: "Linha do produto (até 120 caracteres).", example: "Premium" },
  { name: "designer", required: false, description: "Nome do designer (até 120 caracteres).", example: "João Silva" },
  { name: "notes", required: false, description: "Observações livres.", example: "edição limitada" },
];

function FieldsTable({ fields }: { fields: FieldDef[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Campo</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Obrigatório</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Descrição</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Exemplo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fields.map((f) => (
            <tr key={f.name} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{f.name}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    f.required ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {f.required ? "Sim" : "Não"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700">{f.description}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{f.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ImportPanelProps = {
  title: string;
  fields: FieldDef[];
  templateXlsxPath: string;
  templateCsvPath: string;
  templateBaseFilename: string;
  onImport: (file: File) => Promise<ImportResult>;
};

function ImportPanel({
  title,
  fields,
  templateXlsxPath,
  templateCsvPath,
  templateBaseFilename,
  onImport,
}: ImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseUrl = client.defaults.baseURL ?? "";
  const xlsxUrl = `${baseUrl}${templateXlsxPath}`;
  const csvUrl = `${baseUrl}${templateCsvPath}`;

  const handleSubmit = async () => {
    if (!file) return;
    setIsImporting(true);
    setResult(null);
    try {
      const r = await onImport(file);
      setResult(r);
      if (r.imported > 0 && r.errors.length === 0) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Baixe o template, preencha em Excel/Google Sheets e envie como CSV. Em caso de qualquer erro,
              <strong> nenhum </strong>registro é salvo — corrija e reenvie.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={xlsxUrl}
              download={`${templateBaseFilename}.xlsx`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Template Excel (.xlsx)
            </a>
            <a
              href={csvUrl}
              download={`${templateBaseFilename}.csv`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Template CSV
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">Regras de formatação</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Salvar como CSV UTF-8 com separador <code>;</code> (ponto-e-vírgula).</li>
          <li>Decimais com <code>,</code> (vírgula). Ex.: <code>1,250</code>.</li>
          <li>Para campos de código (Unidade, Grupo, Fornecedor), informar o <strong>código já cadastrado</strong> no sistema.</li>
          <li>Campos opcionais podem ficar em branco.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Campos do arquivo
        </h3>
        <FieldsTable fields={fields} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Enviar arquivo</h3>
        <div
          className={cn(
            "mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition",
            file && "border-blue-400 bg-blue-50/50",
          )}
        >
          <FileSpreadsheet className="h-8 w-8 text-slate-400" />
          {file ? (
            <div>
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Selecione um arquivo .csv para importar</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setResult(null);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isImporting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {file ? "Trocar arquivo" : "Escolher arquivo"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || isImporting}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar
            </button>
          </div>
        </div>

        {result && result.imported > 0 && result.errors.length === 0 ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {result.imported} registro(s) importado(s) com sucesso.
          </div>
        ) : null}

        {result && result.errors.length > 0 ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">
              Nenhum registro foi salvo. {result.errors.length} erro(s) encontrado(s):
            </p>
            <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-red-200 bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-red-100 text-red-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Linha</th>
                    <th className="px-3 py-2 text-left font-semibold">Código</th>
                    <th className="px-3 py-2 text-left font-semibold">Campo</th>
                    <th className="px-3 py-2 text-left font-semibold">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-mono text-slate-700">{e.line}</td>
                      <td className="px-3 py-1.5 text-slate-700">{e.code ?? "—"}</td>
                      <td className="px-3 py-1.5 text-slate-700">{e.field ?? "—"}</td>
                      <td className="px-3 py-1.5 text-red-700">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ImportacoesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("materias");
  const importMp = useImportMateriasPrimasCsv();
  const importPa = useImportProdutosAcabadosCsv();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("materias")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "materias"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            Matérias-Primas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("produtos")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "produtos"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            Produtos Acabados
          </button>
        </div>
      </div>

      {activeTab === "materias" ? (
        <ImportPanel
          title="Importar Matérias-Primas"
          fields={MP_FIELDS}
          templateXlsxPath={MP_TEMPLATE_XLSX}
          templateCsvPath={MP_TEMPLATE_CSV}
          templateBaseFilename="materias-primas-template"
          onImport={(f) => importMp.mutateAsync(f)}
        />
      ) : (
        <ImportPanel
          title="Importar Produtos Acabados"
          fields={PA_FIELDS}
          templateXlsxPath={PA_TEMPLATE_XLSX}
          templateCsvPath={PA_TEMPLATE_CSV}
          templateBaseFilename="produtos-acabados-template"
          onImport={(f) => importPa.mutateAsync(f)}
        />
      )}
    </div>
  );
}
