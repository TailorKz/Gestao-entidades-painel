import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const COR_PRIMARIA = [13, 88, 64];
const COR_CINZA_SUAVE = [243, 244, 246];

const formatarMoeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusTexto = (status) =>
  status && status !== 'AGUARDANDO_DOCUMENTOS' ? 'Verificada' : 'Não verificada';

const rotuloParcela = (parcela) => {
  const categoria = parcela?.categoria === 'ESPORTE' ? 'Esporte' : 'Cultura';
  const ano = parcela?.anoVigencia ? ` (${parcela.anoVigencia})` : '';
  return `${categoria} — Parcela 0${parcela?.numero || ''}${ano}`;
};

function cabecalho(doc, titulo, parcela, nomeUsuario) {
  const largura = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, largura, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(titulo, 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(rotuloParcela(parcela), 14, 17);

  const emissao = new Date().toLocaleDateString('pt-BR');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text(`Emitido por: ${nomeUsuario || 'Gestor'}`, largura - 14, 10, { align: 'right' });
  doc.text(`Emissão: ${emissao}`, largura - 14, 15, { align: 'right' });
}

function resumoRodape(doc, finalY, linhas) {
  if (!finalY) return;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  linhas.forEach((linha, i) => {
    if (i === 0) {
      doc.setDrawColor(...COR_PRIMARIA);
      doc.setLineWidth(0.6);
      doc.line(14, finalY + 6, doc.internal.pageSize.getWidth() - 14, finalY + 6);
    }
    doc.text(linha, 14, finalY + 14 + i * 5);
  });
}

export function exportarPdfProjecao({ parcela, estimativas, nomeUsuario }) {
  const totalEstimado = estimativas.reduce((soma, e) => soma + Number(e.valor || 0), 0);
  const saldoProjetado = Number(parcela?.valorInicial || 0) - totalEstimado;

  const doc = new jsPDF();
  cabecalho(doc, 'Projeção de Gastos', parcela, nomeUsuario);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Descrição', 'Valor (R$)', 'Observações']],
    body: estimativas.map((e, i) => [
      String(i + 1),
      e.descricao || '—',
      `R$ ${formatarMoeda(e.valor)}`,
      e.observacao ? e.observacao : '—',
    ]),
    foot: [
      [
        { content: `Total (${estimativas.length}):`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `R$ ${formatarMoeda(totalEstimado)}`, styles: { halign: 'right', fontStyle: 'bold' } },
        '',
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: COR_CINZA_SUAVE, textColor: [30, 30, 30], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3, textColor: [45, 45, 45] },
    columnStyles: { 2: { halign: 'right' }, 0: { cellWidth: 12 } },
  });

  resumoRodape(doc, doc.lastAutoTable.finalY ?? 80, [
    `Valor da parcela: R$ ${formatarMoeda(parcela?.valorInicial)}        Saldo projetado: R$ ${formatarMoeda(saldoProjetado)}`,
  ]);

  doc.save(`Projecao-de-Gastos-Parcela-0${parcela?.numero || ''}.pdf`);
}

export function exportarPdfPrestacoes({ parcela, despesas, nomeUsuario }) {
  const totalGasto = despesas.reduce((soma, d) => soma + Number(d.valor || 0), 0);
  const saldo = Number(parcela?.saldoAtual || 0);

  const doc = new jsPDF({ orientation: 'landscape' });
  cabecalho(doc, 'Prestação em Tempo Real', parcela, nomeUsuario);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Empresa', 'Competência', 'Valor (R$)', 'Status', 'Observações']],
    body: despesas.map((d, i) => [
      String(i + 1),
      d.nomeEmpresa || d.emitente || '—',
      d.dataCompetencia || '—',
      `R$ ${formatarMoeda(d.valor)}`,
      statusTexto(d.status),
      d.observacao ? d.observacao : '—',
    ]),
    foot: [
      [
        { content: `Total (${despesas.length}):`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `R$ ${formatarMoeda(totalGasto)}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: '', colSpan: 2 },
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: COR_CINZA_SUAVE, textColor: [30, 30, 30], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3, textColor: [45, 45, 45] },
    columnStyles: { 3: { halign: 'right' }, 0: { cellWidth: 12 } },
  });

  resumoRodape(doc, doc.lastAutoTable.finalY ?? 80, [
    `Valor da parcela: R$ ${formatarMoeda(parcela?.valorInicial)}        Total gasto: R$ ${formatarMoeda(totalGasto)}        Saldo disponível: R$ ${formatarMoeda(saldo)}`,
  ]);

  doc.save(`Prestacao-Tempo-Real-Parcela-0${parcela?.numero || ''}.pdf`);
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function hexParaRgb(hex) {
  const limpo = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) return COR_PRIMARIA;
  const n = parseInt(limpo, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function exportarPdfPrestacaoBancos({ conta, ano, relatorio, nomeUsuario }) {
  const doc = new jsPDF();
  const largura = doc.internal.pageSize.getWidth();

  const entradas = Number(relatorio?.totalEntradas || 0);
  const saidas = Number(relatorio?.totalSaidas || 0);
  const saldo = Number(relatorio?.totalSaldo || 0);
  const lancamentos = Number(relatorio?.totalLancamentos || 0);
  const grupos = relatorio?.grupos || [];

  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, largura, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Prestação Bancária — Resumo Anual', 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${conta?.banco || 'Conta'} | ${conta?.finalidade || '—'} — Ano ${ano}`, 14, 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido por: ${nomeUsuario || 'Gestor'}`, largura - 14, 10, { align: 'right' });
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, largura - 14, 15, { align: 'right' });

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Totais do ano', 14, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Entradas: R$ ${formatarMoeda(entradas)}      Saídas: R$ ${formatarMoeda(saidas)}      Saldo: R$ ${formatarMoeda(saldo)}      Lançamentos: ${lancamentos}`,
    14,
    40
  );

  let y = 48;

  // Barras horizontais: saídas por grupo
  const comValor = grupos.filter((g) => Number(g.saidas || 0) > 0);
  if (comValor.length > 0) {
    const max = Math.max(...comValor.map((g) => Number(g.saidas)));
    const inicioX = 14;
    const fimX = largura - 62;
    const disponivel = fimX - inicioX;
    const alturaBarra = 10;
    const gap = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text('Saídas por grupo', 14, y);
    y += 6;

    comValor.forEach((g) => {
      const valor = Number(g.saidas);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(g.grupo?.nome || 'Não classificado', inicioX, y + alturaBarra / 2 + 3, { maxWidth: 90 });
      const w = Math.max(2, (valor / max) * disponivel);
      doc.setFillColor(...hexParaRgb(g.grupo?.cor));
      doc.rect(fimX - w, y, w, alturaBarra, 'F');
      doc.setTextColor(20, 20, 20);
      doc.text(`R$ ${formatarMoeda(valor)}`, fimX + 4, y + alturaBarra / 2 + 3);
      y += gap;
    });

    y += 6;
  }

  // Tabela: resumo por grupo
  autoTable(doc, {
    startY: y,
    head: [['Grupo', 'Entradas (R$)', 'Saídas (R$)', 'Saldo (R$)', 'Lançamentos']],
    body: grupos.map((g) => [
      g.grupo?.nome || 'Não classificado',
      formatarMoeda(g.entradas),
      formatarMoeda(g.saidas),
      formatarMoeda(g.saldo),
      String(g.quantidade ?? 0),
    ]),
    foot: [
      [
        { content: `Total (${lancamentos}):`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `R$ ${formatarMoeda(saldo)}`, styles: { halign: 'right', fontStyle: 'bold' } },
        '',
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: COR_CINZA_SUAVE, textColor: [30, 30, 30], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3, textColor: [45, 45, 45] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  // Tabela: por mês
  const mensal = Array.from({ length: 12 }, (_, i) => {
    const mesNum = i + 1;
    let e = 0;
    let s = 0;
    for (const g of grupos) {
      const m = g.porMes?.find((p) => p.mes === mesNum);
      if (m) {
        e += Number(m.entradas || 0);
        s += Number(m.saidas || 0);
      }
    }
    return { rotulo: `${MESES_CURTOS[i]}/${ano}`, entradas: e, saidas: s };
  });

  autoTable(doc, {
    startY: (doc.lastAutoTable && doc.lastAutoTable.finalY) + 8,
    head: [['Mês', 'Entradas (R$)', 'Saídas (R$)', 'Saldo do mês (R$)']],
    body: mensal.map((m) => [
      m.rotulo,
      formatarMoeda(m.entradas),
      formatarMoeda(m.saidas),
      formatarMoeda(m.entradas - m.saidas),
    ]),
    theme: 'striped',
    headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3, textColor: [45, 45, 45] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  doc.save(`Prestacao-Bancaria-${conta?.banco || 'Conta'}-${ano}.pdf`);
}