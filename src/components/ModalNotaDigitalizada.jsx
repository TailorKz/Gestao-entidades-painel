import { X, PenLine, AlertTriangle } from 'lucide-react';

const heading = { fontFamily: "'Varela Round', sans-serif" };

export default function ModalNotaDigitalizada({ mensagem, onFechar, onPreencherManual }) {
    return (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-cream-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-5 py-4 border-b border-cream-200 flex justify-between items-center bg-amber-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 style={heading} className="font-semibold text-stone-800 text-sm">
                            Nota não lida automaticamente
                        </h3>
                    </div>
                    <button onClick={onFechar} className="text-stone-400 hover:text-stone-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5">
                    <p className="text-sm text-stone-600 leading-relaxed">
                        {mensagem || 'Esta nota parece ser uma imagem digitalizada e não possui texto legível para extração automática.'}
                    </p>

                    <button
                        onClick={onPreencherManual}
                        className="w-full mt-5 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cream-100 border border-cream-200 text-stone-700 text-sm font-semibold hover:bg-cream-200 transition-colors cursor-pointer"
                    >
                        <PenLine className="w-4 h-4" /> Preencher manualmente
                    </button>

                    <p className="text-xs text-stone-400 text-center mt-3">
                        Use o ícone de olho no card da nota para visualizá-la.
                    </p>
                </div>
            </div>
        </div>
    );
}