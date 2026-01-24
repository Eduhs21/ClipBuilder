import React from 'react'

export default function StepCard({ s, idx, updateDescription, generateWithAI, removeStep, aiStepBusyId, darkMode, videoId, aiStatus }) {
  return (
    <div className={`rounded-md border p-12 ${darkMode ? 'text-slate-100' : 'bg-slate-50'}`} style={darkMode ? { backgroundColor: '#343434', borderColor: '#555' } : undefined}>
      <div className="flex flex-col items-start gap-6">
        <img src={s.url} alt={`Passo ${idx + 1}`} className="w-full h-96 rounded object-cover" />
        <div className="min-w-0 flex-1 w-full">
          <div className="mb-4 text-3xl font-bold">Passo {idx + 1} • {s.timestamp}</div>
          <textarea
            className={`w-full resize-none rounded-md border px-6 py-5 text-xl outline-none focus:ring-2 ${darkMode ? 'focus:ring-gray-600 text-slate-100' : 'focus:ring-slate-200'}`}
            style={darkMode ? { backgroundColor: '#343434', borderColor: '#555' } : undefined}
            rows={12}
            placeholder="Descreva o passo..."
            value={s.description}
            onChange={(e) => updateDescription(s.id, e.target.value)}
          />
          <div className="mt-6 flex gap-4">
            <button
              className={`rounded-md border px-6 py-4 text-xl font-semibold`}
              onClick={() => generateWithAI(s.id)}
              type="button"
              disabled={!videoId || aiStatus !== 'ready' || aiStepBusyId === s.id}
            >
              {aiStepBusyId === s.id ? 'Gerando...' : 'Gerar com IA'}
            </button>
            <button
              className={`rounded-md border px-6 py-4 text-xl font-semibold ${darkMode ? 'text-red-300' : 'text-red-700'}`}
              onClick={() => removeStep(s.id)}
              type="button"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
