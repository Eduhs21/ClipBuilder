import { useState, useEffect } from 'react'
import { X, Download, Copy, Check, FileText } from 'lucide-react'
import { marked } from 'marked'
import { downloadMarkdownAsDocx } from '../lib/api'

export default function EnhancedDocPreview({ open, onClose, markdown, onMarkdownChange, title }) {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('markdown') // 'markdown' | 'word'
  const [docxLoading, setDocxLoading] = useState(false)
  const [localMarkdown, setLocalMarkdown] = useState(markdown || '')

  useEffect(() => {
    setLocalMarkdown(markdown || '')
  }, [markdown, open])

  if (!open) return null

  const currentMarkdown = typeof onMarkdownChange === 'function' ? localMarkdown : (markdown || '')
  const isEditable = typeof onMarkdownChange === 'function'

  function handleMarkdownChange(value) {
    setLocalMarkdown(value)
    if (typeof onMarkdownChange === 'function') onMarkdownChange(value)
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(currentMarkdown || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  function downloadMarkdownFile() {
    const safeTitle = (title || 'documento')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50)
    const blob = new Blob([currentMarkdown || ''], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeTitle}_profissional.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleDownloadDocx() {
    if (!currentMarkdown?.trim()) return
    setDocxLoading(true)
    try {
      const safeTitle = (title || 'documento_profissional')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 50)
      await downloadMarkdownAsDocx(currentMarkdown, `${safeTitle}.docx`)
    } catch (e) {
      console.error('Erro ao baixar Word:', e)
    } finally {
      setDocxLoading(false)
    }
  }

  const hasContent = Boolean(currentMarkdown?.trim())
  const wordHtml = hasContent ? marked.parse(currentMarkdown) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--modal-overlay)' }}>
      <div className="cb-modal w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="cb-modal-header flex items-center justify-between">
          <h2 className="cb-modal-title text-xl font-semibold">Documento Profissional</h2>
          <button onClick={onClose} className="cb-btn p-2" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="cb-modal-body flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-medium" style={{ color: 'var(--muted-text)' }}>Ver como:</span>
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
              <button
                type="button"
                onClick={() => setViewMode('markdown')}
                className={`px-3 py-1.5 text-sm transition-all duration-200 ${viewMode === 'markdown' ? 'cb-btn-primary' : 'cb-btn'}`}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setViewMode('word')}
                className={`px-3 py-1.5 text-sm transition-all duration-200 flex items-center gap-1.5 ${viewMode === 'word' ? 'cb-btn-primary' : 'cb-btn'}`}
              >
                <FileText className="h-3.5 w-3.5" />
                Layout Word
              </button>
            </div>
            <div className="flex-1" />
            <button onClick={copyToClipboard} className="cb-btn h-9 text-sm">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button onClick={downloadMarkdownFile} className="cb-btn h-9 text-sm">
              <Download className="h-4 w-4" />
              Baixar Markdown
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={!hasContent || docxLoading}
              className="cb-btn cb-btn-primary h-9 text-sm"
            >
              <Download className="h-4 w-4" />
              {docxLoading ? 'A gerar…' : 'Baixar Word (.docx)'}
            </button>
          </div>

          <div
            className="flex-1 overflow-auto rounded-lg border min-h-[200px]"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
            }}
          >
            {viewMode === 'markdown' ? (
              isEditable ? (
                <textarea
                  value={currentMarkdown}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  placeholder="Nenhum conteúdo gerado."
                  className="w-full h-full min-h-[280px] p-4 font-mono text-sm whitespace-pre-wrap resize-y rounded-lg border-0 focus:ring-2 focus:ring-offset-0 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                  }}
                  spellCheck="false"
                />
              ) : (
                <div
                  className="p-4 font-mono text-sm whitespace-pre-wrap"
                  style={{ color: 'var(--text)' }}
                >
                  {currentMarkdown || 'Nenhum conteúdo gerado.'}
                </div>
              )
            ) : (
              <div
                className="enhanced-doc-word-layout p-6 overflow-auto"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  minHeight: '280px',
                }}
              >
                {hasContent ? (
                  <div
                    className="max-w-[21cm] mx-auto font-serif text-[15px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: wordHtml }}
                  />
                ) : (
                  <p style={{ color: 'var(--muted-text)' }}>Nenhum conteúdo gerado.</p>
                )}
              </div>
            )}
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
