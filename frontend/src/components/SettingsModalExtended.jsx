import React, { useState, useEffect } from 'react'
import { FileText, Upload, Download } from 'lucide-react'

export default function SettingsModalExtended({ open, onClose, aiContext, setAiContext, savedPrompt, setSavedPrompt, includeTimestamp, setIncludeTimestamp, geminiModel, setGeminiModel, outputFormat, setOutputFormat, imageNamePrefix, setImageNamePrefix, aiFillEnabled, setAiFillEnabled, onExportMarkdown, onImportMarkdown, stepsCount }) {
  const [localPrompt, setLocalPrompt] = useState(aiContext || '')
  const [localFormat, setLocalFormat] = useState(outputFormat || 'markdown')
  const [localImagePrefix, setLocalImagePrefix] = useState(imageNamePrefix || 'step_')
  const [localAiFillEnabled, setLocalAiFillEnabled] = useState(!!aiFillEnabled)
  const [examplePreset, setExamplePreset] = useState('none')

  function normalizePrefix(v) {
    const raw = (v ?? '').toString().trim()
    return raw || 'step_'
  }

  useEffect(() => {
    setLocalPrompt(aiContext || '')
  }, [aiContext])

  useEffect(() => {
    setLocalFormat(outputFormat || 'markdown')
  }, [outputFormat])

  useEffect(() => {
    setLocalImagePrefix(imageNamePrefix || 'step_')
  }, [imageNamePrefix])

  useEffect(() => {
    setLocalAiFillEnabled(!!aiFillEnabled)
  }, [aiFillEnabled])

  const hasUnsavedChanges =
    (localPrompt || '') !== (aiContext || '') ||
    (localFormat || 'markdown') !== (outputFormat || 'markdown') ||
    normalizePrefix(localImagePrefix) !== normalizePrefix(imageNamePrefix) ||
    !!localAiFillEnabled !== !!aiFillEnabled

  const rawImagePrefix = (localImagePrefix || '').toString()
  const imagePrefixTrim = rawImagePrefix.trim()
  const isImagePrefixValid = imagePrefixTrim.length > 0

  if (!open) return null

  function saveAndClose() {
    if (!isImagePrefixValid) return
    try {
      localStorage.setItem('CLIPBUILDER_SAVED_PROMPT', localPrompt)
    } catch { }
    setSavedPrompt(localPrompt)
    setAiContext(localPrompt)
    try {
      localStorage.setItem('CLIPBUILDER_OUTPUT_FORMAT', localFormat)
    } catch { }
    setOutputFormat(localFormat)

    try {
      localStorage.setItem('CLIPBUILDER_IMAGE_NAME_PREFIX', imagePrefixTrim)
    } catch { }
    if (typeof setImageNamePrefix === 'function') setImageNamePrefix(imagePrefixTrim)

    try {
      localStorage.setItem('CLIPBUILDER_AI_FILL_ENABLED', localAiFillEnabled ? '1' : '0')
    } catch { }
    if (typeof setAiFillEnabled === 'function') setAiFillEnabled(!!localAiFillEnabled)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--modal-overlay)' }}>
      <div className="cb-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="cb-modal-header">
          <div className="flex items-center justify-between">
            <h2 className="cb-modal-title text-xl font-semibold text-slate-900">Configurações da IA</h2>
            <button onClick={onClose} className="cb-btn p-2" aria-label="Fechar">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="cb-modal-body">

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Prompt padrão</label>
            <textarea value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} className="cb-textarea" rows={4} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Exemplos rápidos</label>
            <div className="flex items-center gap-2">
              <select value={examplePreset} onChange={(e) => setExamplePreset(e.target.value)} className="cb-select flex-1">
                <option value="none">— Nenhum —</option>
                <option value="short_markdown">Resumo curto (Markdown)</option>
                <option value="detailed_steps">Passos detalhados</option>
                <option value="audience_beginner">Para iniciantes</option>
              </select>
              <button type="button" onClick={() => {
                if (examplePreset === 'short_markdown') setLocalPrompt('Escreva um resumo curto em Markdown com título e 3 bullets.')
                else if (examplePreset === 'detailed_steps') setLocalPrompt('Descreva passo a passo detalhado deste frame, incluindo ações e dicas práticas.')
                else if (examplePreset === 'audience_beginner') setLocalPrompt('Explique este passo como se fosse para um iniciante, evitando jargões.')
              }} className="cb-btn">Aplicar exemplo</button>
            </div>
            <div className="text-xs mt-1.5" style={{ color: 'var(--muted-text)' }}>Use exemplos rápidos para ajustar o tom do prompt.</div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Preenchimento por IA</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>Controla só a geração automática ao capturar um passo (o botão “Gerar por IA” continua disponível).</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={localAiFillEnabled}
                onChange={(e) => setLocalAiFillEnabled(e.target.checked)}
              />
              <div className={`h-6 w-11 rounded-full transition-colors ${localAiFillEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${localAiFillEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Nome dos arquivos de imagem (prefixo)</label>
            <input
              value={localImagePrefix}
              onChange={(e) => setLocalImagePrefix(e.target.value)}
              className={`cb-input ${!isImagePrefixValid ? 'border-[var(--danger)]' : ''}`}
              placeholder="step_"
            />
            {!isImagePrefixValid ? (
              <div className="text-xs mt-1.5 font-medium" style={{ color: 'var(--danger)' }}>
                Esse campo é obrigatório.
              </div>
            ) : null}
            <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--muted-text)' }}>
              Ex.: <span className="font-mono">passo_</span> → <span className="font-mono">passo_01.png</span>, <span className="font-mono">passo_02.png</span>… (vale para o ZIP exportado)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Formato de saída</label>
            <select value={localFormat} onChange={(e) => setLocalFormat(e.target.value)} className="cb-select">
              <option value="markdown">Markdown</option>
              <option value="docx">Word (DOCX)</option>
              <option value="html">HTML</option>
              <option value="pdf">PDF</option>
              <option value="plain">Texto simples</option>
            </select>
            <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--muted-text)' }}>Escolha o formato no qual o conteúdo exportado/gerado deverá ser produzido.</div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input id="cfg-incl-ts" type="checkbox" checked={includeTimestamp} onChange={(e) => setIncludeTimestamp(e.target.checked)} className="h-4 w-4 rounded border" style={{ borderColor: 'var(--card-border)', accentColor: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Incluir timestamp nas descrições</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>Modelo IA</label>
              <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="cb-select">
                <optgroup label="Google Gemini">
                  <option value="models/gemini-2.5-flash">gemini-2.5-flash</option>
                </optgroup>
                <optgroup label="Groq (Llama 4 Vision)">
                  <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout (rápido)</option>
                  <option value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick (melhor)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Seção de Backup/Restore */}
          <div className="p-4 rounded-lg border mt-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <div className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Backup / Retomada</div>
            <div className="text-xs mb-3" style={{ color: 'var(--muted-text)' }}>
              Exporte sua documentação como Markdown para continuar depois, ou importe um arquivo salvo anteriormente.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onClose()
                  onExportMarkdown?.()
                }}
                disabled={!stepsCount || stepsCount === 0}
                className="cb-btn h-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Exportar .md
              </button>
              <button
                onClick={() => {
                  onClose()
                  onImportMarkdown?.()
                }}
                className="cb-btn h-10"
              >
                <Upload className="h-4 w-4" />
                Importar .md
              </button>
            </div>
          </div>

          <div className="cb-modal-footer">
            <button
              onClick={onClose}
              className="cb-btn"
            >
              Cancelar
            </button>
            <button
              onClick={saveAndClose}
              disabled={!isImagePrefixValid}
              className={`cb-btn ${hasUnsavedChanges ? 'cb-btn-primary' : ''}`}
              aria-label={hasUnsavedChanges ? 'Salvar alterações' : 'Salvar (sem alterações)'}
              title={hasUnsavedChanges ? 'Há alterações para salvar' : 'Nenhuma alteração pendente'}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}