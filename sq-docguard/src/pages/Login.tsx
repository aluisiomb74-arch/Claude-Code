import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Input } from "@/components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setInfo(null);
    setCarregando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard" });
        } else {
          setInfo("Conta criada. Faça login para entrar.");
          setModo("login");
        }
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <ShieldCheck className="mb-2 h-10 w-10 text-brand" />
          <h1 className="text-2xl font-bold text-slate-800">SQ DocGuard</h1>
          <p className="text-sm text-slate-500">Controle de documentação regulatória</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === "cadastro" && (
            <Field label="Nome">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Seu nome" />
            </Field>
          )}
          <Field label="E-mail corporativo">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nome@sqquimica.com"
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </Field>

          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {info && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>}

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {modo === "login" ? "Primeiro acesso? " : "Já tem conta? "}
          <button
            type="button"
            className="font-medium text-brand hover:underline"
            onClick={() => {
              setModo(modo === "login" ? "cadastro" : "login");
              setErro(null);
              setInfo(null);
            }}
          >
            {modo === "login" ? "Criar conta" : "Fazer login"}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          Apenas e-mails @sqquimica.com. O primeiro cadastro vira administrador.
        </p>
      </Card>
    </div>
  );
}
