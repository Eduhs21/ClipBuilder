import { useState } from 'react'
import { X, Download, Copy, Check } from 'lucide-react'

export default function EnhancedDocPreview({ open, onClose, markdown, title }) {
    const [copied, setCopied] = useState(false)

    if (!open) return null

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(markdown || '')
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (e) {
            console.error('Failed to copy:', e)
        }
    }

    function downloadMarkdown() {
        const safeTitle = (title || 'documento')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 50)
        const blob = new Blob([markdown || ''], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${safeTitle}_profissional.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--modal-overlay)' }}>
            <div className="cb-modal w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="cb-modal-header flex items-center justify-between">
                    <h2 className="cb-modal-title text-xl font-semibold">📄 Documento Profissional</h2>
                    <button onClick={onClose} className="cb-btn p-2" aria-label="Fechar">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="cb-modal-body flex-1 overflow-hidden flex flex-col">
                    <div className="flex gap-2 mb-3">
                        <button onClick={copyToClipboard} className="cb-btn h-9 text-sm">
                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button onClick={downloadMarkdown} className="cb-btn cb-btn-primary h-9 text-sm">
                            <Download className="h-4 w-4" />
                            Baixar Markdown
                        </button>
                    </div>

                    <div
                        className="flex-1 overflow-auto rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap"
                        style={{
                            backgroundColor: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                            color: 'var(--text)'
                        }}
                    >
                        {markdown || 'Nenhum conteúdo gerado.'}
                    </div>
                </div>

                <div className="cb-modal-footer">
                    <button onClick={onClose} className="cb-btn">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
