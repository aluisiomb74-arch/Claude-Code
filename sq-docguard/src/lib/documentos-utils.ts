import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { DocumentoStatus } from "./types";

/** Espelha public.calcular_status_documento no banco — feedback imediato no cliente. */
export function calcularStatus(
  dataVencimento: string | null,
  semValidade: boolean
): DocumentoStatus {
  if (semValidade) return "sem_validade";
  if (!dataVencimento) return "sem_validade";
  const venc = parseISO(dataVencimento);
  const dias = differenceInCalendarDays(venc, new Date());
  if (dias < 0) return "vencido";
  if (dias <= 30) return "vencendo";
  return "vigente";
}

export function diasRestantes(dataVencimento: string | null): number | null {
  if (!dataVencimento) return null;
  return differenceInCalendarDays(parseISO(dataVencimento), new Date());
}

export function formatDate(data: string | null): string {
  if (!data) return "—";
  return format(parseISO(data), "dd/MM/yyyy");
}

export const STATUS_META: Record<
  DocumentoStatus,
  { label: string; classe: string }
> = {
  vigente: { label: "Vigente", classe: "bg-green-100 text-green-800 border-green-200" },
  vencendo: { label: "Vencendo", classe: "bg-amber-100 text-amber-800 border-amber-200" },
  vencido: { label: "Vencido", classe: "bg-red-100 text-red-800 border-red-200" },
  sem_validade: { label: "Sem validade", classe: "bg-slate-100 text-slate-700 border-slate-200" },
};
