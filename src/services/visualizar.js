export function visualizarArquivo(arquivo) {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    window.open(url, '_blank');
}