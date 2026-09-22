// Sugere o mês de competência (mês do TRABALHO realizado) a partir da data de emissão da nota.
// Regra: nota emitida até o dia 15 refere-se ao mês anterior; a partir do dia 16 refere-se ao próprio mês
// (cobre os instrutores que emitem a nota no dia 30/31 do mesmo mês).
// Retorna "MM" ou null quando não dá para inferir com segurança.
export function mesCompetenciaSugerido(dataISO) {
  if (!dataISO) return null;
  const [ano, mes, dia] = String(dataISO).split('-').map(Number);
  if (!ano || !mes || !dia) return null;

  let anoFinal = ano;
  let mesFinal = mes;

  if (dia <= 15) {
    mesFinal = mes - 1;
    if (mesFinal === 0) {
      mesFinal = 12;
      anoFinal = ano - 1;
    }
  }

  if (anoFinal !== ano) return null;

  return String(mesFinal).padStart(2, '0');
}