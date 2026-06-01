import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Select } from "@/components/ui";
import { STATUS_META, calcularStatus, formatDate } from "@/lib/documentos-utils";
import type { Documento, DocumentoStatus } from "@/lib/types";

export function RelatoriosPage() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState<DocumentoStatus | "">("");

  useEffect(() => {
    supabase
      .from("documentos")
      .select("*, tipos_documento(nome), unidades(nome)")
      .order("data_vencimento", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setDocs((data as Documento[]) ?? []);
        setCarregando(false);
      });
  }, []);

  const filtrados = docs.filter((d) =>
    statusFiltro ? calcularStatus(d.data_vencimento, d.sem_validade) === statusFiltro : true
  );

  function linhas() {
    return filtrados.map((d) => ({
      Título: d.titulo,
      Tipo: d.tipos_documento?.nome ?? "",
      Unidade: d.unidades?.nome ?? "",
      Número: d.numero_documento ?? "",
      "Órgão emissor": d.orgao_emissor ?? "",
      Emissão: formatDate(d.data_emissao),
      Vencimento: d.sem_validade ? "Sem validade" : formatDate(d.data_vencimento),
      Status: STATUS_META[calcularStatus(d.data_vencimento, d.sem_validade)].label,
      Responsável: d.responsavel_nome ?? "",
    }));
  }

  async function exportarExcel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(linhas());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documentos");
    XLSX.writeFile(wb, `sq-docguard-documentos-${hoje()}.xlsx`);
  }

  async function exportarPDF() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("SQ DocGuard — Relatório de Documentos", 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em ${formatDate(new Date().toISOString())}`, 14, 21);
    const dados = linhas();
    autoTable(doc, {
      startY: 26,
      head: [Object.keys(dados[0] ?? { Título: "" })],
      body: dados.map((l) => Object.values(l)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] },
    });
    doc.save(`sq-docguard-documentos-${hoje()}.pdf`);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Relatórios</h1>
      <p className="mb-6 text-sm text-slate-500">Exporte a relação de documentos em PDF ou Excel.</p>

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Filtrar por status</span>
            <Select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as DocumentoStatus | "")}
            >
              <option value="">Todos</option>
              {(Object.keys(STATUS_META) as DocumentoStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex gap-2">
            <Button onClick={exportarPDF} disabled={carregando || filtrados.length === 0}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={exportarExcel} disabled={carregando || filtrados.length === 0}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {carregando ? "Carregando..." : `${filtrados.length} documento(s) no relatório.`}
        </p>
      </Card>
    </div>
  );
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}
