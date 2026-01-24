import React, { useState, useEffect } from 'react'

export default function SettingsModalExtended({ open, onClose, aiContext, setAiContext, savedPrompt, setSavedPrompt, includeTimestamp, setIncludeTimestamp, geminiModel, setGeminiModel, outputFormat, setOutputFormat }) {
  const [localPrompt, setLocalPrompt] = useState(aiContext || '')
  const [localFormat, setLocalFormat] = useState(outputFormat || 'markdown')
  const [examplePreset, setExamplePreset] = useState('none')

  useEffect(() => {
    setLocalPrompt(aiContext || '')
  }, [aiContext])

  if (!open) return null

  function saveAndClose() {
    try { localStorage.setItem('DOCUVIDEO_SAVED_PROMPT', localPrompt) } catch {}
    setSavedPrompt(localPrompt)
    setAiContext(localPrompt)
    try { localStorage.setItem('DOCUVIDEO_OUTPUT_FORMAT', localFormat) } catch {}
    setOutputFormat(localFormat)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-11/12 max-w-2xl rounded bg-white dark:bg-[#2b2b2b] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Configurações da IA</div>
          <button onClick={onClose} className="text-sm">Fechar</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Prompt padrão</label>
          <textarea value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} className="w-full rounded border px-2 py-1" rows={4} />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Formato de saída</label>
          <select value={localFormat} onChange={(e) => setLocalFormat(e.target.value)} className="rounded border px-2 py-1">
            <option value="markdown">Markdown</option>
            <option value="docx">Word (DOCX)</option>
            <option value="html">HTML</option>
            <option value="plain">Texto simples</option>
          </select>
          <div className="text-xs text-slate-500 mt-1">Escolha o formato no qual o conteúdo exportado/gerado deverá ser produzido.</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Exemplos rápidos</label>
          <div className="flex items-center gap-2">
            <select value={examplePreset} onChange={(e) => setExamplePreset(e.target.value)} className="rounded border px-2 py-1">
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
          <div className="text-xs text-slate-500 mt-1">Use exemplos rápidos para ajustar o tom do prompt.</div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input id="cfg-incl-ts" type="checkbox" checked={includeTimestamp} onChange={(e) => setIncludeTimestamp(e.target.checked)} />
            <label htmlFor="cfg-incl-ts" className="text-sm">Incluir timestamp nas descrições</label>
          </div>
          <div>
            <label className="text-sm mr-2">Modelo Gemini</label>
            <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="rounded border px-2 py-1">
              <option value="models/gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="models/gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="models/gemini-2.5-pro">gemini-2.5-pro</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button onClick={saveAndClose} className="rounded-md bg-gray-700 px-4 py-2 text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
