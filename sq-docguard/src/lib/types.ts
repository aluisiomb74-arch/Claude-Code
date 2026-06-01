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

export interface VersaoDocumento {
  id: string;
  documento_id: string;
  numero_versao: number;
  arquivo_path: string;
  arquivo_nome: string;
  data_emissao: string | null;
  data_vencimento: string | null;
  comentario: string | null;
  enviado_em: string;
}

export type AlertaCanal = "in_app" | "email" | "teams";

export interface Alerta {
  id: string;
  documento_id: string;
  user_id: string;
  dias_antecedencia: number;
  data_alerta: string;
  canal: AlertaCanal;
  lido: boolean;
  lido_em: string | null;
  criado_em: string;
  documentos?: Pick<Documento, "titulo" | "data_vencimento" | "sem_validade"> & {
    tipos_documento?: Pick<TipoDocumento, "nome"> | null;
    unidades?: Pick<Unidade, "nome"> | null;
  };
}

export interface Profile {
  id: string;
  nome: string;
  email: string;
}
