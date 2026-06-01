import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Download, FileUp, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Input, StatusBadge, Textarea } from "@/components/ui";
import { calcularStatus, formatDate } from "@/lib/documentos-utils";
import type { Documento, VersaoDocumento } from "@/lib/types";

export function DocumentoDetalhePage() {
  const { id } = useParams({ from: "/_auth/documentos/$id" });
  const [doc, setDoc] = useState<Documento | null>(null);
  const [versoes, setVersoes] = useState<VersaoDocumento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [comentario, setComentario] = useState("");

  const carregar = useCallback(async () => {
    const [{ data: d }, { data: v }] = await Promise.all([
      supabase
        .from("documentos")
        .select("*, tipos_documento(nome, exige_orgao_emissor), unidades(nome)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("versoes_documento")
        .select("*")
        .eq("documento_id", id)
        .order("numero_versao", { ascending: false }),
    ]);
    setDoc((d as Documento) ?? null);
    setVersoes((v as VersaoDocumento[]) ?? []);
    setCarregando(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function baixar(path: string) {
    const { data, error } = await supabase.storage
      .from("documentos")
      .createSignedUrl(path, 60);
    if (error) {
      setErro(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function enviarVersao(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || !arquivo) return;
    setErro(null);
    setEnviando(true);
    try {
      const proxima = (versoes[0]?.numero_versao ?? 0) + 1;
      const nomeLimpo = arquivo.name.replace(/[^\w.\-]/g, "_");
      const path = `${doc.unidade_id}/${doc.id}/${proxima}-${nomeLimpo}`;

      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, arquivo, { upsert: false });
      if (upErr) throw upErr;

      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("versoes_documento").insert({
        documento_id: doc.id,
        numero_versao: proxima,
        arquivo_path: path,
        arquivo_nome: arquivo.name,
        data_emissao: dataEmissao || null,
        data_vencimento: dataVencimento || null,
        comentario: comentario || null,
        enviado_por: userData.user?.id ?? null,
      });
      if (insErr) throw insErr;

      setArquivo(null);
      setDataEmissao("");
      setDataVencimento("");
      setComentario("");
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar versão.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <p className="text-sm text-slate-500">Carregando...</p>;
  if (!doc)
    return (
      <div>
        <p className="text-sm text-slate-500">Documento não encontrado.</p>
        <Link to="/documentos" className="text-brand hover:underline">
          Voltar
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/documentos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{doc.titulo}</h1>
          <p className="text-sm text-slate-500">
            {doc.tipos_documento?.nome} · {doc.unidades?.nome}
          </p>
        </div>
        <StatusBadge status={calcularStatus(doc.data_vencimento, doc.sem_validade)} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <InfoItem label="Número" valor={doc.numero_documento} />
        <InfoItem label="Órgão emissor" valor={doc.orgao_emissor} />
        <InfoItem label="Versão atual" valor={String(doc.versao_atual)} />
        <InfoItem label="Emissão" valor={formatDate(doc.data_emissao)} />
        <InfoItem
          label="Vencimento"
          valor={doc.sem_validade ? "Sem validade" : formatDate(doc.data_vencimento)}
        />
        <InfoItem label="Responsável" valor={doc.responsavel_nome} />
      </div>

      {doc.observacoes && (
        <Card className="mb-6">
          <p className="mb-1 text-xs font-medium uppercase text-slate-400">Observações</p>
          <p className="text-sm text-slate-700">{doc.observacoes}</p>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <FileUp className="h-5 w-5 text-brand" /> Enviar nova versão
        </h2>
        <form onSubmit={enviarVersao} className="space-y-4">
          <Field label="Arquivo *">
            <Input
              type="file"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de emissão">
              <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
            </Field>
            <Field label="Data de vencimento">
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Comentário">
            <Textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </Field>
          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={enviando || !arquivo}>
              {enviando ? "Enviando..." : "Enviar versão"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <History className="h-5 w-5 text-slate-500" /> Histórico de versões
        </h2>
        {versoes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma versão enviada ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {versoes.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-800">
                    v{v.numero_versao} · {v.arquivo_nome}
                  </p>
                  <p className="text-xs text-slate-500">
                    Enviado em {formatDate(v.enviado_em)}
                    {v.data_vencimento ? ` · vence ${formatDate(v.data_vencimento)}` : ""}
                    {v.comentario ? ` · ${v.comentario}` : ""}
                  </p>
                </div>
                <Button variant="outline" onClick={() => baixar(v.arquivo_path)}>
                  <Download className="h-4 w-4" /> Baixar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function InfoItem({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{valor || "—"}</p>
    </div>
  );
}
