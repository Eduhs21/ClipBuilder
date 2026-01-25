import React, { useState, useEffect } from 'react'

export default function SettingsModalExtended({ open, onClose, aiContext, setAiContext, savedPrompt, setSavedPrompt, includeTimestamp, setIncludeTimestamp, geminiModel, setGeminiModel, outputFormat, setOutputFormat, imageNamePrefix, setImageNamePrefix, aiFillEnabled, setAiFillEnabled }) {
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
    } catch {}
    setSavedPrompt(localPrompt)
    setAiContext(localPrompt)
    try {
      localStorage.setItem('CLIPBUILDER_OUTPUT_FORMAT', localFormat)
    } catch {}
    setOutputFormat(localFormat)

    try {
      localStorage.setItem('CLIPBUILDER_IMAGE_NAME_PREFIX', imagePrefixTrim)
    } catch {}
    if (typeof setImageNamePrefix === 'function') setImageNamePrefix(imagePrefixTrim)

    try {
      localStorage.setItem('CLIPBUILDER_AI_FILL_ENABLED', localAiFillEnabled ? '1' : '0')
    } catch {}
    if (typeof setAiFillEnabled === 'function') setAiFillEnabled(!!localAiFillEnabled)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--modal-overlay)' }}>
      <div className="w-11/12 max-w-2xl rounded p-6" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--panel-border)', color: 'var(--text)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Configurações da IA</div>
          <button onClick={onClose} className="text-sm">Fechar</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Prompt padrão</label>
          <textarea value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} className="w-full rounded border px-2 py-1" rows={4} style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text)' }} />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Exemplos rápidos</label>
          <div className="flex items-center gap-2">
            <select value={examplePreset} onChange={(e) => setExamplePreset(e.target.value)} className="rounded border px-2 py-1" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text)' }}>
              <option value="none">— Nenhum —</option>
              <option value="short_markdown">Resumo curto (Markdown)</option>
              <option value="detailed_steps">Passos detalhados</option>
              <option value="audience_beginner">Para iniciantes</option>
            </select>
            <button type="button" onClick={() => {
              if (examplePreset === 'short_markdown') setLocalPrompt('Escreva um resumo curto em Markdown com título e 3 bullets.')
              else if (examplePreset === 'detailed_steps') setLocalPrompt('Descreva passo a passo detalhado deste frame, incluindo ações e dicas práticas.')
              else if (examplePreset === 'audience_beginner') setLocalPrompt('Explique este passo como se fosse para um iniciante, evitando jargões.')
            }} className="rounded border px-3 py-1 text-sm">Aplicar exemplo</button>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>Use exemplos rápidos para ajustar o tom do prompt.</div>
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

        <div className="mb-4">
          <label className="block text-sm mb-2">Nome dos arquivos de imagem (prefixo)</label>
          <input
            value={localImagePrefix}
            onChange={(e) => setLocalImagePrefix(e.target.value)}
            className="w-full rounded border px-2 py-1"
            placeholder="step_"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: isImagePrefixValid ? 'var(--card-border)' : '#ef4444', color: 'var(--text)' }}
          />
          {!isImagePrefixValid ? (
            <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
              Esse campo é obrigatório.
            </div>
          ) : null}
          <div className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>
            Ex.: <span className="font-mono">passo_</span> → <span className="font-mono">passo_01.png</span>, <span className="font-mono">passo_02.png</span>… (vale para o ZIP exportado)
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Formato de saída</label>
          <select value={localFormat} onChange={(e) => setLocalFormat(e.target.value)} className="rounded border px-2 py-1" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text)' }}>
            <option value="markdown">Markdown</option>
            <option value="docx">Word (DOCX)</option>
            <option value="html">HTML</option>
            <option value="plain">Texto simples</option>
          </select>
          <div className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>Escolha o formato no qual o conteúdo exportado/gerado deverá ser produzido.</div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input id="cfg-incl-ts" type="checkbox" checked={includeTimestamp} onChange={(e) => setIncludeTimestamp(e.target.checked)} />
            <label htmlFor="cfg-incl-ts" className="text-sm">Incluir timestamp nas descrições</label>
          </div>
          <div>
            <label className="text-sm mr-2">Modelo Gemini</label>
            <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="rounded border px-2 py-1" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text)' }}>
              <option value="models/gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="models/gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="models/gemini-2.5-pro">gemini-2.5-pro</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={saveAndClose}
            disabled={!isImagePrefixValid}
            className={`rounded-md px-4 py-2 transition-all ${hasUnsavedChanges ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent shadow-md' : 'opacity-70 hover:opacity-90'}`}
            style={{ backgroundColor: hasUnsavedChanges ? 'var(--accent)' : 'var(--card-bg)', color: hasUnsavedChanges ? '#fff' : 'var(--text)', border: hasUnsavedChanges ? 'none' : '1px solid var(--card-border)' }}
            aria-label={hasUnsavedChanges ? 'Salvar alterações' : 'Salvar (sem alterações)'}
            title={hasUnsavedChanges ? 'Há alterações para salvar' : 'Nenhuma alteração pendente'}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
