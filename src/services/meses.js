export function rotuloMeses(mesesReferencia) {
    if (!mesesReferencia) return '';
    const meses = mesesReferencia.split(', ').filter(Boolean);
    if (meses.length >= 4) return `(${meses.length} meses)`;
    return `(${meses.join(', ')})`;
}