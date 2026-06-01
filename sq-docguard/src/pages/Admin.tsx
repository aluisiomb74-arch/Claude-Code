import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, Select } from "@/components/ui";
import type { AppRole, Profile, TipoDocumento, Unidade } from "@/lib/types";

type Aba = "unidades" | "tipos" | "config" | "usuarios";

export function AdminPage() {
  const { isAdmin } = useAuth();
  const [aba, setAba] = useState<Aba>("unidades");

  if (!isAdmin) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Acesso restrito a administradores.</p>
      </Card>
    );
  }

  const abas: { id: Aba; label: string }[] = [
    { id: "unidades", label: "Unidades" },
    { id: "tipos", label: "Tipos de documento" },
    { id: "config", label: "Configurações" },
    { id: "usuarios", label: "Usuários" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Administração</h1>
      <p className="mb-6 text-sm text-slate-500">Gestão de cadastros e parâmetros do sistema.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              aba === a.id ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "unidades" && <Unidades />}
      {aba === "tipos" && <Tipos />}
      {aba === "config" && <Config />}
      {aba === "usuarios" && <Usuarios />}
    </div>
  );
}

function Unidades() {
  const [itens, setItens] = useState<Unidade[]>([]);
  const [form, setForm] = useState({ nome: "", cnpj: "", cidade: "", estado: "" });
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const { data } = await supabase.from("unidades").select("*").order("nome");
    setItens((data as Unidade[]) ?? []);
  }
  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const { error } = await supabase.from("unidades").insert({
      nome: form.nome,
      cnpj: form.cnpj || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
    });
    if (error) return setErro(error.message);
    setForm({ nome: "", cnpj: "", cidade: "", estado: "" });
    carregar();
  }

  async function remover(id: string) {
    const { error } = await supabase.from("unidades").delete().eq("id", id);
    if (error) return setErro(error.message);
    carregar();
  }

  return (
    <Card>
      <form onSubmit={adicionar} className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <Input placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
        <Input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
        <Input placeholder="UF" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} />
        <Button type="submit">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>
      {erro && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <ul className="divide-y divide-slate-100">
        {itens.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-700">
              {u.nome} {u.cidade ? `· ${u.cidade}/${u.estado ?? ""}` : ""}
            </span>
            <Button variant="ghost" onClick={() => remover(u.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Tipos() {
  const [itens, setItens] = useState<TipoDocumento[]>([]);
  const [nome, setNome] = useState("");
  const [exige, setExige] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const { data } = await supabase.from("tipos_documento").select("*").order("nome");
    setItens((data as TipoDocumento[]) ?? []);
  }
  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const { error } = await supabase.from("tipos_documento").insert({ nome, exige_orgao_emissor: exige });
    if (error) return setErro(error.message);
    setNome("");
    setExige(false);
    carregar();
  }

  async function remover(id: string) {
    const { error } = await supabase.from("tipos_documento").delete().eq("id", id);
    if (error) return setErro(error.message);
    carregar();
  }

  return (
    <Card>
      <form onSubmit={adicionar} className="mb-5 flex flex-wrap items-center gap-3">
        <Input placeholder="Nome do tipo *" value={nome} onChange={(e) => setNome(e.target.value)} required className="flex-1" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={exige} onChange={(e) => setExige(e.target.checked)} />
          Exige órgão emissor
        </label>
        <Button type="submit">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>
      {erro && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <ul className="divide-y divide-slate-100">
        {itens.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-700">
              {t.nome} {t.exige_orgao_emissor && <span className="text-xs text-slate-400">(órgão emissor)</span>}
            </span>
            <Button variant="ghost" onClick={() => remover(t.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Config() {
  const [dias, setDias] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", "alertas_dias_antecedencia")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.valor) setDias((data.valor as number[]).join(", "));
      });
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErro(null);
    const arr = dias
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 0)
      .sort((a, b) => b - a);
    if (arr.length === 0) return setErro("Informe ao menos um valor (ex.: 45, 30, 15, 7, 0).");
    const { error } = await supabase
      .from("configuracoes")
      .update({ valor: arr, atualizado_em: new Date().toISOString() })
      .eq("chave", "alertas_dias_antecedencia");
    if (error) return setErro(error.message);
    setDias(arr.join(", "));
    setMsg("Configuração salva. Vale para alertas gerados a partir de agora.");
  }

  return (
    <Card>
      <form onSubmit={salvar} className="max-w-md space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Dias de antecedência dos alertas
          </span>
          <Input value={dias} onChange={(e) => setDias(e.target.value)} placeholder="45, 30, 15, 7, 0" />
          <span className="mt-1 block text-xs text-slate-400">Separados por vírgula. 0 = no dia do vencimento.</span>
        </label>
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        {msg && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}
        <Button type="submit">Salvar</Button>
      </form>
    </Card>
  );
}

function Usuarios() {
  const { session } = useAuth();
  const [perfis, setPerfis] = useState<(Profile & { role: AppRole | null })[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, nome, email").order("nome"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const mapa = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
    setPerfis(
      ((profiles as Profile[]) ?? []).map((p) => ({ ...p, role: mapa.get(p.id) ?? null }))
    );
  }
  useEffect(() => {
    carregar();
  }, []);

  async function alterarPapel(userId: string, role: AppRole) {
    setErro(null);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return setErro(error.message);
    carregar();
  }

  return (
    <Card className="p-0 overflow-hidden">
      {erro && <p className="m-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3 font-medium">Nome</th>
            <th className="px-5 py-3 font-medium">E-mail</th>
            <th className="px-5 py-3 font-medium">Papel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {perfis.map((p) => (
            <tr key={p.id}>
              <td className="px-5 py-3 font-medium text-slate-800">{p.nome}</td>
              <td className="px-5 py-3 text-slate-600">{p.email}</td>
              <td className="px-5 py-3">
                <Select
                  value={p.role ?? ""}
                  disabled={p.id === session?.user.id}
                  onChange={(e) => alterarPapel(p.id, e.target.value as AppRole)}
                >
                  <option value="visualizador">Visualizador</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Administrador</option>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
