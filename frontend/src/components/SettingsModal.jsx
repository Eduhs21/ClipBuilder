import React, { useState } from 'react'
import { setGoogleApiKey, setApiUrl } from '../lib/api'

export default function SettingsModal({ open, onClose, aiContext, setAiContext, savedPrompt, setSavedPrompt, includeTimestamp, setIncludeTimestamp, geminiModel, setGeminiModel }) {
  const [localPrompt, setLocalPrompt] = useState(aiContext || '')

  if (!open) return null

  function saveAndClose() {
    try { localStorage.setItem('DOCUVIDEO_SAVED_PROMPT', localPrompt) } catch {}
    setSavedPrompt(localPrompt)
    setAiContext(localPrompt)
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
