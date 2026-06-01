#!/usr/bin/env python3
"""
Gerador do pacote inicial de uma plataforma de controle de documentação.
Lê um JSON de parâmetros, preenche os placeholders dos assets e escreve a
pasta de saída com a estrutura de arquivos pronta para o Lovable/Supabase.

Uso:
    python3 gerar_projeto.py --params /tmp/params.json --out /mnt/user-data/outputs/<slug>
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
ASSETS = SKILL_DIR / "assets"

# asset (relativo a assets/)  ->  destino (relativo à pasta de saída)
FILE_MAP = {
    "prompt-lovable.md": "prompt-lovable.md",
    "checklist-ti.md": "checklist-ti.md",
    "migrations/01_schema.sql": "supabase/migrations/01_schema.sql",
    "migrations/02_seed.sql": "supabase/migrations/02_seed.sql",
    "graph/graph.server.ts": "src/lib/email/graph.server.ts",
    "graph/processar.server.ts": "src/lib/email/processar.server.ts",
    "graph/templates.server.ts": "src/lib/email/templates.server.ts",
    "graph/api.public.hooks.alertas-diarios.ts": "src/routes/api.public.hooks.alertas-diarios.ts",
}

DEFAULTS = {
    "nome_app": "DocControl",
    "dias_alerta": [45, 30, 15, 7, 0],
    "unidade_padrao": "Matriz",
    "cc_fixo": [],
    "cor_principal": "#ea580c",
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "doccontrol"


def build_tipos_sql(tipos) -> str:
    linhas = []
    for t in tipos:
        nome = str(t["nome"]).replace("'", "''")  # escapa aspas simples para SQL
        exige = "true" if t.get("exige_orgao_emissor") else "false"
        linhas.append(f"  ('{nome}', {exige})")
    return ",\n".join(linhas)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--params", required=True, help="Caminho do JSON de parâmetros")
    ap.add_argument("--out", required=True, help="Pasta de saída")
    args = ap.parse_args()

    params = json.loads(Path(args.params).read_text(encoding="utf-8"))

    # Aplica padrões
    for k, v in DEFAULTS.items():
        params.setdefault(k, v)

    # Validação mínima
    if not params.get("dominio_email"):
        print("ERRO: 'dominio_email' é obrigatório (ex.: empresa.com.br).", file=sys.stderr)
        return 2
    params["dominio_email"] = params["dominio_email"].lstrip("@").strip().lower()

    if not params.get("tipos_documento"):
        print("ERRO: 'tipos_documento' não pode ser vazio.", file=sys.stderr)
        return 2

    slug = params.get("slug") or slugify(params["nome_app"])

    # Mapa de substituição
    subs = {
        "{{NOME_APP}}": params["nome_app"],
        "{{DOMINIO_EMAIL}}": params["dominio_email"],
        "{{DIAS_ALERTA_JSON}}": json.dumps(params["dias_alerta"]),
        "{{UNIDADE_PADRAO}}": params["unidade_padrao"],
        "{{COR_PRINCIPAL}}": params["cor_principal"],
        "{{CC_FIXO_JS}}": json.dumps(params["cc_fixo"]),
        "{{TIPOS_DOCUMENTO_SQL}}": build_tipos_sql(params["tipos_documento"]),
    }

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    gerados = []
    for asset_rel, dest_rel in FILE_MAP.items():
        src = ASSETS / asset_rel
        text = src.read_text(encoding="utf-8")
        for marker, value in subs.items():
            text = text.replace(marker, value)
        # Checagem de placeholders remanescentes
        leftover = re.findall(r"\{\{[A-Z_]+\}\}", text)
        if leftover:
            print(f"AVISO: placeholders não substituídos em {dest_rel}: {set(leftover)}", file=sys.stderr)
        dest = out_dir / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding="utf-8")
        gerados.append(dest_rel)

    # LEIA-ME de orientação
    leia_me = f"""# {params['nome_app']} — Pacote inicial gerado

Gerado pela skill doccontrol-generator. Onde cada arquivo entra:

- `prompt-lovable.md` — cole no Lovable como primeira mensagem (entrega incremental).
- `supabase/migrations/01_schema.sql` — aplicar no Supabase PRIMEIRO.
- `supabase/migrations/02_seed.sql` — aplicar DEPOIS (tipos, unidade padrão, intervalos de alerta).
- `src/lib/email/graph.server.ts` — helper de envio via Microsoft Graph.
- `src/lib/email/processar.server.ts` — processador do resumo diário de alertas.
- `src/lib/email/templates.server.ts` — templates HTML de e-mail (alertas + auth).
- `src/routes/api.public.hooks.alertas-diarios.ts` — endpoint acionado pelo cron diário.
- `checklist-ti.md` — passo a passo para o TI (Entra/Exchange) + runbook + secrets.

## Parâmetros usados
- Domínio de e-mail permitido: @{params['dominio_email']}
- Intervalos de alerta (dias): {params['dias_alerta']}
- Unidade padrão: {params['unidade_padrao']}
- Cor principal: {params['cor_principal']}
- CC fixo: {params['cc_fixo'] or 'nenhum'}

## Próximos passos
1. Supabase: aplicar as duas migrations na ordem.
2. Lovable: colar o prompt; adicionar os 4 arquivos do Graph nos caminhos acima.
3. TI: seguir o checklist (App Registration Mail.Send + caixa remetente + restrição).
4. Cadastrar os secrets e agendar o cron diário.
5. Disparar e-mail de teste antes de produção.
"""
    (out_dir / "LEIA-ME.md").write_text(leia_me, encoding="utf-8")
    gerados.insert(0, "LEIA-ME.md")

    print(f"OK — {len(gerados)} arquivos gerados em {out_dir} (slug: {slug}):")
    for g in gerados:
        print(f"  - {g}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
