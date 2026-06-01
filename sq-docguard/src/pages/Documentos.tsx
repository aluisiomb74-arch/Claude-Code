import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Input, StatusBadge } from "@/components/ui";
import { calcularStatus, formatDate } from "@/lib/documentos-utils";
import type { Documento } from "@/lib/types";

export function DocumentosPage() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    supabase
      .from("documentos")
      .select("*, tipos_documento(nome), unidades(nome)")
      .order("criado_em", { ascending: false })
      .then(({ data }) => {
        setDocs((data as Documento[]) ?? []);
        setCarregando(false);
      });
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.titulo.toLowerCase().includes(q) ||
        d.numero_documento?.toLowerCase().includes(q) ||
        d.tipos_documento?.nome.toLowerCase().includes(q)
    );
  }, [docs, busca]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documentos</h1>
          <p className="text-sm text-slate-500">{docs.length} documento(s) cadastrado(s).</p>
        </div>
        <Link to="/documentos/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo documento
          </Button>
        </Link>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título, número ou tipo..."
          className="pl-9"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {carregando ? (
          <p className="p-5 text-sm text-slate-500">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Nenhum documento encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Título</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Unidade</th>
                <th className="px-5 py-3 font-medium">Vencimento</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{d.titulo}</td>
                  <td className="px-5 py-3 text-slate-600">{d.tipos_documento?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{d.unidades?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDate(d.data_vencimento)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={calcularStatus(d.data_vencimento, d.sem_validade)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
