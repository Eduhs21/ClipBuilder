import React from 'react'

export default function Sidebar({ steps = [], selectedStepId, setSelectedStepId, updateDescription, generateWithAI, removeStep, aiStepBusyId, videoId, aiStatus, darkMode, onEditImage }) {
  const selected = steps.find((s) => s.id === selectedStepId) || steps[0] || null
  const canGenerate =
    !!selected &&
    !!videoId &&
    aiStatus === 'ready' &&
    aiStepBusyId !== selected?.id &&
    typeof selected?.seconds === 'number' &&
    !!selected?.timestamp

  const hasSelectedImage = !!selected?.url

  return (
    <aside className={`rounded-lg border p-4 flex flex-col cb-panel`} style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)', color: 'var(--text)' }}>
      {selected ? (
        <div className="mb-4">
          {hasSelectedImage ? (
            <img src={selected.url} alt="selected" className="w-full h-64 rounded object-cover mb-4" />
          ) : (
            <div className="w-full h-64 rounded mb-4 flex items-center justify-center border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--muted-text)' }}>
              Passo sem imagem
            </div>
          )}
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-2xl font-semibold">Passo {steps.indexOf(selected) + 1} • {selected.timestamp}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEditImage?.(selected.id)}
                disabled={!hasSelectedImage}
                className="cb-btn"
              >
                Editar imagem
              </button>
              <button
                type="button"
                onClick={() => generateWithAI(selected.id)}
                disabled={!canGenerate}
                className="cb-btn cb-btn-primary"
              >
                {aiStepBusyId === selected.id ? 'Gerando...' : 'Gerar por IA'}
              </button>
            </div>
          </div>
          <textarea
            className="w-full resize-none rounded-md border px-5 py-4 text-lg outline-none focus:ring-2"
            rows={8}
            placeholder="Descreva o passo..."
            value={selected.description}
            onChange={(e) => updateDescription(selected.id, e.target.value)}
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
          />

          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={() => removeStep(selected.id)}
              className="cb-btn cb-btn-danger"
            >
              Remover passo
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-sm text-slate-400">Nenhum passo selecionado</div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-3">
          {steps.map((s, idx) => (
            <button key={s.id} onClick={() => setSelectedStepId(s.id)} className={`flex items-start gap-3 rounded-md border p-3 text-left w-full transition-colors`} style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text)' }}>
              {s?.url ? (
                <img src={s.url} alt={`Passo ${idx + 1}`} className="h-20 w-28 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="h-20 w-28 rounded flex-shrink-0 border grid place-items-center text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.10)', borderColor: 'var(--card-border)', color: 'var(--muted-text)' }}>
                  Texto
                </div>
              )}
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
