import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { TipoDocumento, Unidade } from "@/lib/types";

export function DocumentoNovoPage() {
  const navigate = useNavigate();
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    tipo_documento_id: "",
    unidade_id: "",
    numero_documento: "",
    orgao_emissor: "",
    data_emissao: "",
    data_vencimento: "",
    sem_validade: false,
    responsavel_nome: "",
    responsavel_email: "",
    observacoes: "",
  });

  useEffect(() => {
    supabase.from("tipos_documento").select("*").order("nome").then(({ data }) => {
      setTipos((data as TipoDocumento[]) ?? []);
    });
    supabase.from("unidades").select("*").order("nome").then(({ data }) => {
      setUnidades((data as Unidade[]) ?? []);
    });
  }, []);

  const tipoSelecionado = tipos.find((t) => t.id === form.tipo_documento_id);

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        titulo: form.titulo,
        tipo_documento_id: form.tipo_documento_id,
        unidade_id: form.unidade_id,
        numero_documento: form.numero_documento || null,
        orgao_emissor: form.orgao_emissor || null,
        data_emissao: form.data_emissao || null,
        data_vencimento: form.sem_validade ? null : form.data_vencimento || null,
        sem_validade: form.sem_validade,
        responsavel_nome: form.responsavel_nome || null,
        responsavel_email: form.responsavel_email || null,
        observacoes: form.observacoes || null,
        criado_por: userData.user?.id ?? null,
      };
      const { error } = await supabase.from("documentos").insert(payload);
      if (error) throw error;
      navigate({ to: "/documentos" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/documentos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Novo documento</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Título *">
            <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo *">
              <Select
                value={form.tipo_documento_id}
                onChange={(e) => set("tipo_documento_id", e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unidade *">
              <Select value={form.unidade_id} onChange={(e) => set("unidade_id", e.target.value)} required>
                <option value="">Selecione...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Número do documento">
              <Input value={form.numero_documento} onChange={(e) => set("numero_documento", e.target.value)} />
            </Field>
            {tipoSelecionado?.exige_orgao_emissor && (
              <Field label="Órgão emissor">
                <Input value={form.orgao_emissor} onChange={(e) => set("orgao_emissor", e.target.value)} />
              </Field>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.sem_validade}
              onChange={(e) => set("sem_validade", e.target.checked)}
            />
            Documento sem validade (não gera alertas)
          </label>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de emissão">
              <Input type="date" value={form.data_emissao} onChange={(e) => set("data_emissao", e.target.value)} />
            </Field>
            {!form.sem_validade && (
              <Field label="Data de vencimento">
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => set("data_vencimento", e.target.value)}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Responsável (nome)">
              <Input value={form.responsavel_nome} onChange={(e) => set("responsavel_nome", e.target.value)} />
            </Field>
            <Field label="Responsável (e-mail)">
              <Input
                type="email"
                value={form.responsavel_email}
                onChange={(e) => set("responsavel_email", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Observações">
            <Textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>

          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          <div className="flex justify-end gap-2">
            <Link to="/documentos">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar documento"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
