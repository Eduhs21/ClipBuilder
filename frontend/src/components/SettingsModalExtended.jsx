import React, { useState, useEffect } from 'react'
import { FileText, Upload, Download, Wand2 } from 'lucide-react'

export default function SettingsModalExtended({ open, onClose, aiContext, setAiContext, savedPrompt, setSavedPrompt, includeTimestamp, setIncludeTimestamp, geminiModel, setGeminiModel, imageNamePrefix, setImageNamePrefix, aiFillEnabled, setAiFillEnabled, onExportMarkdown, onImportMarkdown, onEnhanceDocument, stepsCount, enhanceLoading }) {
  const [localPrompt, setLocalPrompt] = useState(aiContext || '')
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
    setLocalImagePrefix(imageNamePrefix || 'step_')
  }, [imageNamePrefix])

  useEffect(() => {
    setLocalAiFillEnabled(!!aiFillEnabled)
  }, [aiFillEnabled])

  const hasUnsavedChanges =
    (localPrompt || '') !== (aiContext || '') ||
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
            <div>
              <h2 className="cb-modal-title text-xl font-semibold" style={{ color: 'var(--text)' }}>Configurações</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-text)' }}>Como a IA deve escrever, formatar a exportação e fazer backup.</p>
            </div>
            <button onClick={onClose} className="cb-btn p-2" aria-label="Fechar">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="cb-modal-body">

          {/* Seção: Texto e IA */}
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Texto e IA</h3>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Prompt padrão</label>
              <textarea value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} className="cb-textarea" rows={4} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Exemplos de prompt</label>
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
                }} className="cb-btn">Usar este exemplo</button>
              </div>
              <div className="text-xs mt-1.5" style={{ color: 'var(--muted-text)' }}>Escolha um estilo para a IA.</div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Preenchimento por IA</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>Controla só a geração automática ao capturar um passo (o botão “Gerar por IA” continua disponível).</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localAiFillEnabled}
                  onChange={(e) => setLocalAiFillEnabled(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full transition-colors" style={{ backgroundColor: localAiFillEnabled ? 'var(--success)' : 'var(--card-border)' }}></div>
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm" style={{ transform: localAiFillEnabled ? 'translateX(1.25rem)' : 'translateX(0)' }}></div>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>Modelo IA</label>
              <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="cb-select flex-1">
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

          {/* Seção: Exportação */}
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Exportação</h3>
          <div className="space-y-4 mb-6">
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