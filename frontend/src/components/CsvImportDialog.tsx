import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { client } from "@/api/client";
import { cn, extractErrorMessage } from "@/lib/utils";
import type { ImportResult } from "@/types";

type Props = {
  open: boolean;
  title: string;
  templatePath: string;
  templateFilename: string;
  onImport: (file: File) => Promise<ImportResult>;
  onClose: () => void;
};

export default function CsvImportDialog({
  open,
  title,
  templatePath,
  templateFilename,
  onImport,
  onClose,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setResult(null);
      setIsImporting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleDownloadTemplate = async () => {
    try {
      const response = await client.get<Blob>(templatePath, { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = templateFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(`Falha ao baixar template: ${extractErrorMessage(error)}`);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsImporting(true);
    setResult(null);
    try {
      const r = await onImport(file);
      setResult(r);
      if (r.imported > 0 && r.errors.length === 0) {
        // success — close after brief delay so toast is visible
        window.setTimeout(() => onClose(), 600);
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">
              Importe vários registros de uma só vez via planilha CSV.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-medium">Como funciona</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Baixe o template, preencha em Excel/Google Sheets e exporte como CSV (UTF-8, separado por <code>;</code>).</li>
              <li>Use vírgula <code>,</code> como separador decimal.</li>
              <li>Para campos como Unidade, Grupo e Fornecedor, informe o <strong>código</strong> já cadastrado.</li>
              <li>Se houver qualquer erro, <strong>nenhum</strong> registro é salvo — corrija e reenvie.</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Baixar template
          </button>

          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition",
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
              <p className="text-sm text-slate-600">Selecione um arquivo .csv</p>
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
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isImporting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {file ? "Trocar arquivo" : "Escolher arquivo"}
            </button>
          </div>

          {result && result.errors.length > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
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

          {result && result.imported > 0 && result.errors.length === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {result.imported} registro(s) importado(s) com sucesso.
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || isImporting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  );
}
