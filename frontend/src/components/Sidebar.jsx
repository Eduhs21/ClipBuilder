import React from 'react'

export default function Sidebar({ steps = [], selectedStepId, setSelectedStepId, updateDescription, generateWithAI, removeStep, aiStepBusyId, videoId, aiStatus, darkMode }) {
  const selected = steps.find((s) => s.id === selectedStepId) || steps[0] || null

  return (
    <aside className={`rounded-lg border p-4 flex flex-col`} style={{ backgroundColor: darkMode ? '#2b2b2b' : undefined, borderColor: darkMode ? '#444' : undefined }}>
      {selected ? (
        <div className="mb-4">
          <img src={selected.url} alt="selected" className="w-full h-64 rounded object-cover mb-4" />
          <div className="mb-2 text-2xl font-semibold">Passo {steps.indexOf(selected) + 1} • {selected.timestamp}</div>
          <textarea
            className="w-full resize-none rounded-md border px-5 py-4 text-lg outline-none focus:ring-2"
            rows={8}
            placeholder="Descreva o passo..."
            value={selected.description}
            onChange={(e) => updateDescription(selected.id, e.target.value)}
            style={darkMode ? { backgroundColor: '#343434', borderColor: '#555', color: '#e6e6e6' } : undefined}
          />
        </div>
      ) : (
        <div className="mb-4 text-sm text-slate-400">Nenhum passo selecionado</div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-3">
          {steps.map((s, idx) => (
            <button key={s.id} onClick={() => setSelectedStepId(s.id)} className={`flex items-start gap-3 rounded-md border p-3 text-left w-full ${darkMode ? 'text-slate-100' : 'bg-white'}`} style={darkMode ? { backgroundColor: '#343434', borderColor: '#555' } : undefined}>
              <img src={s.url} alt={`Passo ${idx + 1}`} className="h-20 w-28 rounded object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Passo {idx + 1}</div>
                  <div className="text-xs text-slate-400">{s.timestamp}</div>
                </div>
                <div className="mt-2 text-xs text-slate-400 truncate">{s.description || '—'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
