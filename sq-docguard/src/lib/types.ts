export type AppRole = "admin" | "gestor" | "visualizador";

export type DocumentoStatus = "vigente" | "vencendo" | "vencido" | "sem_validade";

export interface Unidade {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
}

export interface TipoDocumento {
  id: string;
  nome: string;
  exige_orgao_emissor: boolean;
}

export interface Documento {
  id: string;
  titulo: string;
  tipo_documento_id: string;
  unidade_id: string;
  numero_documento: string | null;
  orgao_emissor: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  sem_validade: boolean;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  observacoes: string | null;
  versao_atual: number;
  criado_em: string;
  atualizado_em: string;
  // joins opcionais
  tipos_documento?: Pick<TipoDocumento, "nome" | "exige_orgao_emissor"> | null;
  unidades?: Pick<Unidade, "nome"> | null;
}
