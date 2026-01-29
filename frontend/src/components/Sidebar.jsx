import React, { useState } from 'react'
import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import GifStepPreview from './GifStepPreview'

export default function Sidebar({
  steps = [],
  selectedStepId,
  setSelectedStepId,
  reorderSteps,
  updateDescription,
  generateWithAI,
  removeStep,
  aiStepBusyId,
  videoId,
  aiStatus,
  darkMode,
  onEditImage
}) {
  const [draggingId, setDraggingId] = useState(null)

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
    <aside className="cb-panel flex flex-col">
      {selected ? (
        <div className="mb-6">
          <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
            {hasSelectedImage ? (
              selected.is_gif ? (
                <GifStepPreview
                  gifUrl={selected.url}
                  thumbnailUrl={selected.thumbnailUrl}
                  isSelected={true}
                  alt={`Passo ${steps.indexOf(selected) + 1}`}
                  className="w-full h-64"
                  imgClassName="w-full h-64 object-cover"
                />
              ) : (
                <img src={selected.url} alt="selected" className="w-full h-64 object-cover" />
              )
            ) : (
              <div className="w-full h-64 flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--muted-text)' }}>
                <div className="text-center space-y-2">
                  <div className="text-sm font-medium">Passo sem imagem</div>
                  <div className="text-xs">Adicione uma imagem ao capturar</div>
                </div>
              </div>
            )}
          </div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-serif font-semibold mb-1" style={{ color: 'var(--text)' }}>
                Passo {steps.indexOf(selected) + 1}
              </div>
              {selected.timestamp && (
                <div className="text-xs font-medium" style={{ color: 'var(--muted-text)' }}>
                  {selected.timestamp}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onEditImage?.(selected.id)}
                disabled={!hasSelectedImage}
                className="cb-btn text-xs"
                title={hasSelectedImage ? 'Editar imagem deste passo' : 'Adicione uma imagem primeiro'}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => generateWithAI(selected.id)}
                disabled={!canGenerate}
                className="cb-btn cb-btn-primary flex items-center gap-1.5 text-xs"
                title={canGenerate ? 'Gerar descrição com IA' : 'Aguarde a IA estar pronta'}
              >
                {aiStepBusyId === selected.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>IA</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            className="cb-textarea"
            rows={8}
            placeholder="Descreva o passo... (ou use o botão IA para gerar automaticamente)"
            value={selected.description}
            onChange={(e) => updateDescription(selected.id, e.target.value)}
          />

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => removeStep(selected.id)}
              className="cb-btn cb-btn-danger text-xs"
            >
              Remover passo
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 text-center py-8">
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nenhum passo selecionado</div>
          <div className="text-xs" style={{ color: 'var(--muted-text)' }}>Selecione um passo da lista abaixo</div>
        </div>
      )}

      <div className="flex-1 overflow-auto -mx-1 px-1">
        <div className="space-y-2">
          {steps.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nenhum passo criado</div>
              <div className="text-xs" style={{ color: 'var(--muted-text)' }}>Capture frames para começar</div>
            </div>
          ) : (
            steps.map((s, idx) => {
              const isGenerating = aiStepBusyId === s.id
              const isSelected = selectedStepId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  draggable
                  onClick={() => setSelectedStepId(s.id)}
                  onDragStart={(e) => {
                    setDraggingId(s.id)
                    try {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', s.id)
                    } catch {
                      // ignore
                    }
                  }}
                  onDragOver={(e) => {
                    if (!draggingId || draggingId === s.id) return
                    e.preventDefault()
                    try {
                      e.dataTransfer.dropEffect = 'move'
                    } catch {
                      // ignore
                    }
                  }}
                  onDrop={(e) => {
                    if (!draggingId || draggingId === s.id) return
                    e.preventDefault()
                    reorderSteps?.(draggingId, s.id)
                    setDraggingId(null)
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={`group flex items-start gap-3 rounded-lg border p-3 text-left w-full transition-all ${
                    draggingId === s.id ? 'opacity-50 border-dashed' : ''
                  } ${isSelected ? 'ring-2' : ''} ${isGenerating ? 'animate-pulse' : ''}`}
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--card-bg)',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--card-border)',
                    color: 'var(--text)',
                    ringColor: 'var(--accent)',
                  }}
                >
                  {s?.url ? (
                    s.is_gif ? (
                      <div className="h-16 w-24 rounded-md flex-shrink-0 overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                        <GifStepPreview
                          gifUrl={s.url}
                          thumbnailUrl={s.thumbnailUrl}
                          isSelected={isSelected}
                          alt={`Passo ${idx + 1}`}
                          className="h-full w-full"
                          imgClassName="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <img src={s.url} alt={`Passo ${idx + 1}`} className="h-16 w-24 rounded-md object-cover flex-shrink-0 border" style={{ borderColor: 'var(--card-border)' }} />
                    )
                  ) : (
                    <div className="h-16 w-24 rounded-md flex-shrink-0 border grid place-items-center text-xs font-medium" style={{ backgroundColor: 'var(--btn-hover-bg)', borderColor: 'var(--card-border)', color: 'var(--muted-text)' }}>
                      Texto
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold" style={{ color: isSelected ? 'var(--accent)' : 'var(--text)' }}>
                          Passo {idx + 1}
                        </div>
                        {isGenerating && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3 animate-pulse" style={{ color: 'var(--accent)' }} />
                            <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--accent)' }} />
                          </div>
                        )}
                      </div>
                      {s.timestamp && (
                        <div className="text-xs font-medium" style={{ color: 'var(--muted-text)' }}>{s.timestamp}</div>
                      )}
                    </div>
                    <div className="text-xs leading-relaxed line-clamp-2" style={{ color: s.description ? 'var(--text-secondary)' : 'var(--muted-text)' }}>
                      {s.description || 'Sem descrição'}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
