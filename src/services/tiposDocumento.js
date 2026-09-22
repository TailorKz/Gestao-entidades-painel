export const TIPOS_DOCUMENTO_GERR = [
  { valor: 'NOTA_FISCAL_ELETRONICA', rotulo: 'NF-e', rotuloCompleto: 'Nota Fiscal Eletrônica' },
  { valor: 'NOTA_SERVICO_ELETRONICA', rotulo: 'NFS-e', rotuloCompleto: 'Nota Fiscal Serviço Eletrônica' },
  { valor: 'FOLHA_PAGAMENTO', rotulo: 'Folha PG', rotuloCompleto: 'Folha de Pagamento' },
  { valor: 'GUIA_FGTS', rotulo: 'FGTS', rotuloCompleto: 'Guia de Recolhimento FGTS' },
  { valor: 'GUIA_INSS', rotulo: 'INSS', rotuloCompleto: 'Guia de Recolhimento INSS' },
];

export function rotuloTipoDocumento(valor) {
  return TIPOS_DOCUMENTO_GERR.find(t => t.valor === valor)?.rotulo || '—';
}

export function rotuloTipoDocumentoCompleto(valor) {
  return TIPOS_DOCUMENTO_GERR.find(t => t.valor === valor)?.rotuloCompleto || 'Não definido';
}