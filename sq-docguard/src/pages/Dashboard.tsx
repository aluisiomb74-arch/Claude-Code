import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, StatusBadge } from "@/components/ui";
import { calcularStatus, diasRestantes, formatDate } from "@/lib/documentos-utils";
import type { Documento, DocumentoStatus } from "@/lib/types";

export function DashboardPage() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);

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

  const porStatus = docs.reduce(
    (acc, d) => {
      const s = calcularStatus(d.data_vencimento, d.sem_validade);
      acc[s] += 1;
      return acc;
    },
    { vigente: 0, vencendo: 0, vencido: 0, sem_validade: 0 } as Record<DocumentoStatus, number>
  );

  const proximos = docs
    .filter((d) => {
      const dias = diasRestantes(d.data_vencimento);
      return dias !== null && dias >= 0 && dias <= 45;
    })
    .slice(0, 8);

  const kpis = [
    { label: "Total", valor: docs.length, icon: FileText, cor: "text-slate-600" },
    { label: "Vigentes", valor: porStatus.vigente, icon: CheckCircle2, cor: "text-green-600" },
    { label: "Vencendo", valor: porStatus.vencendo, icon: Clock, cor: "text-amber-600" },
    { label: "Vencidos", valor: porStatus.vencido, icon: AlertTriangle, cor: "text-red-600" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">Visão geral dos documentos e vencimentos.</p>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-4">
            <k.icon className={`h-8 w-8 ${k.cor}`} />
            <div>
              <p className="text-2xl font-bold text-slate-800">{k.valor}</p>
              <p className="text-sm text-slate-500">{k.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Próximos vencimentos (45 dias)</h2>
        {carregando ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : proximos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum vencimento próximo.{" "}
            <Link to="/documentos/novo" className="text-brand hover:underline">
              Cadastrar documento
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {proximos.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <Link to="/documentos" className="font-medium text-slate-800 hover:text-brand">
                    {d.titulo}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {d.tipos_documento?.nome} · {d.unidades?.nome} · vence {formatDate(d.data_vencimento)}
                  </p>
                </div>
                <StatusBadge status={calcularStatus(d.data_vencimento, d.sem_validade)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
