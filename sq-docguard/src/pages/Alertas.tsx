import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card } from "@/components/ui";
import { formatDate } from "@/lib/documentos-utils";
import type { Alerta } from "@/lib/types";

export function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"nao_lidos" | "todos">("nao_lidos");

  async function carregar() {
    let query = supabase
      .from("alertas")
      .select(
        "*, documentos(titulo, data_vencimento, sem_validade, tipos_documento(nome), unidades(nome))"
      )
      .order("data_alerta", { ascending: true });
    if (filtro === "nao_lidos") query = query.eq("lido", false);
    const { data } = await query;
    setAlertas((data as Alerta[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    setCarregando(true);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  async function marcarLido(id: string) {
    await supabase.from("alertas").update({ lido: true, lido_em: new Date().toISOString() }).eq("id", id);
    carregar();
  }

  async function marcarTodos() {
    const ids = alertas.filter((a) => !a.lido).map((a) => a.id);
    if (ids.length === 0) return;
    await supabase
      .from("alertas")
      .update({ lido: true, lido_em: new Date().toISOString() })
      .in("id", ids);
    carregar();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Bell className="h-6 w-6 text-brand" /> Alertas
          </h1>
          <p className="text-sm text-slate-500">Notificações de vencimento dos seus documentos.</p>
        </div>
        <Button variant="outline" onClick={marcarTodos}>
          <CheckCheck className="h-4 w-4" /> Marcar todos como lidos
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["nao_lidos", "todos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filtro === f ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {f === "nao_lidos" ? "Não lidos" : "Todos"}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {carregando ? (
          <p className="p-5 text-sm text-slate-500">Carregando...</p>
        ) : alertas.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Nenhum alerta {filtro === "nao_lidos" ? "não lido" : ""}.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alertas.map((a) => (
              <li
                key={a.id}
                className={`flex items-center justify-between px-5 py-3 ${a.lido ? "opacity-60" : ""}`}
              >
                <div>
                  <Link
                    to="/documentos/$id"
                    params={{ id: a.documento_id }}
                    className="font-medium text-slate-800 hover:text-brand"
                  >
                    {a.documentos?.titulo ?? "Documento"}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {a.dias_antecedencia === 0
                      ? "Vence hoje"
                      : `Faltam ${a.dias_antecedencia} dia(s)`}{" "}
                    · vencimento {formatDate(a.documentos?.data_vencimento ?? null)}
                    {a.documentos?.unidades?.nome ? ` · ${a.documentos.unidades.nome}` : ""}
                  </p>
                </div>
                {!a.lido && (
                  <Button variant="ghost" onClick={() => marcarLido(a.id)}>
                    <Check className="h-4 w-4" /> Marcar lido
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
