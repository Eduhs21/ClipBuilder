import { useEffect, useMemo, useRef, useState } from 'react'
import { api, getApiUrl } from './lib/api'
import Header from './components/Header'
import VideoArea from './components/VideoArea'
import StepCard from './components/StepCard'
import Sidebar from './components/Sidebar'
import SettingsModal from './components/SettingsModalExtended'
import ImageEditorModal from './components/ImageEditorModal'

const LS = {
  geminiModel: 'CLIPBUILDER_GEMINI_MODEL',
  dark: 'CLIPBUILDER_DARK',
  savedPrompt: 'CLIPBUILDER_SAVED_PROMPT',
  aiFillEnabled: 'CLIPBUILDER_AI_FILL_ENABLED',
  outputFormat: 'CLIPBUILDER_OUTPUT_FORMAT',
  imageNamePrefix: 'CLIPBUILDER_IMAGE_NAME_PREFIX',
  includeTimestamp: 'CLIPBUILDER_INCLUDE_TIMESTAMP'
}

function lsGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function lsRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let idx = 0
  let value = bytes
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx++
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke later; immediate revoke can cancel downloads in some browsers.
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {}
  }, 1500)
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const youtubePollRef = useRef(null)

  const [videoUrl, setVideoUrl] = useState(null)
  const [videoId, setVideoId] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeImporting, setYoutubeImporting] = useState(false)
  const [geminiModel, setGeminiModel] = useState(() => {
    const stored = lsGet(LS.geminiModel)
    const allowed = new Set(['models/gemini-2.0-flash', 'models/gemini-2.5-flash', 'models/gemini-2.5-pro'])
    if (stored && allowed.has(stored)) return stored
    return 'models/gemini-2.5-flash'
  })
  const [aiStatus, setAiStatus] = useState('idle') // idle|uploading|processing|ready|error
  const [aiError, setAiError] = useState('')
  const [aiStepBusyId, setAiStepBusyId] = useState(null)
  const [steps, setSteps] = useState([]) 
  const [busy, setBusy] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [imageEditorOpen, setImageEditorOpen] = useState(false)
  const [editingStepId, setEditingStepId] = useState(null)
  const [error, setError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [aiContext, setAiContext] = useState('')
  const [includeTimestamp, setIncludeTimestamp] = useState(() => {
    const raw = lsGet(LS.includeTimestamp)
    if (raw === null || raw === undefined || raw === '') return false
    return raw === '1' || raw === 'true'
  })
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return lsGet(LS.dark) === '1'
    } catch {
      return false
    }
  })
  const [savedPrompt, setSavedPrompt] = useState(() => {
    try {
      return lsGet(LS.savedPrompt) || ''
    } catch {
      return ''
    }
  })
  const [aiFillEnabled, setAiFillEnabled] = useState(() => {
    try {
      const v = lsGet(LS.aiFillEnabled)
      // Primeiro acesso: deixar desativado por padrão
      if (v === null || v === undefined || v === '') return false
      return v === '1' || v === 'true'
    } catch {
      return false
    }
  })
  const [outputFormat, setOutputFormat] = useState(() => {
    try { return lsGet(LS.outputFormat) || 'markdown' } catch { return 'markdown' }
  })
  const [imageNamePrefix, setImageNamePrefix] = useState(() => {
    try { return lsGet(LS.imageNamePrefix) || 'step_' } catch { return 'step_' }
  })

  const totalImageBytes = useMemo(() => {
    return steps.reduce((sum, s) => sum + (s.blob?.size ?? 0), 0)
  }, [steps])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && settingsOpen) {
        e.preventDefault()
        setSettingsOpen(false)
        return
      }

      // Don't bind global shortcuts while modals are open
      if (settingsOpen || imageEditorOpen) return

      // Avoid shortcuts while typing
      const el = document.activeElement
      const tag = el?.tagName?.toLowerCase()
      const isTyping = tag === 'textarea' || tag === 'input' || el?.isContentEditable
      if (isTyping) return

      const k = (e.key || '').toLowerCase()
      if (k === 's') {
        e.preventDefault()
        captureFrame()
        return
      }

      if (e.key === 'Delete') {
        if (!selectedStepId) return
        e.preventDefault()
        removeStep(selectedStepId)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, videoUrl, selectedStepId, settingsOpen, imageEditorOpen])

  useEffect(() => {
    if (geminiModel) lsSet(LS.geminiModel, geminiModel)
  }, [geminiModel])

  useEffect(() => {
    lsSet(LS.includeTimestamp, includeTimestamp ? '1' : '0')
  }, [includeTimestamp])

  useEffect(() => {
    if (darkMode) lsSet(LS.dark, '1')
    else lsRemove(LS.dark)
    // Toggle html.dark class for global Tailwind support if configured
    try {
      if (darkMode) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch {}
  }, [darkMode])

  function onPickVideo(file) {
    setError('')
    setAiError('')

    if (!file) return
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!['mp4', 'mkv'].includes(ext)) {
      setError('Formato inválido. Use .mp4 ou .mkv')
      return
    }

    if (videoUrl && String(videoUrl).startsWith('blob:')) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    setSteps([])
    setVideoId(null)
    setAiStatus('uploading')
    uploadToGemini(file)
  }

  async function importYoutube() {
    setError('')
    setAiError('')

    const url = (youtubeUrl || '').toString().trim()
    if (!url) {
      setError('Cole uma URL do YouTube para importar.')
      return
    }

    setYoutubeImporting(true)
    setAiStatus('processing')
    try {
      const res = await api.post('/videos/youtube', { url })
      const id = res?.data?.video_id
      if (!id) throw new Error('missing video_id')

      if (videoUrl && String(videoUrl).startsWith('blob:')) {
        try { URL.revokeObjectURL(videoUrl) } catch {}
      }

      setSteps([])
      setSelectedStepId(null)
      setVideoId(id)

      const base = (getApiUrl() || '').replace(/\/$/, '')

      // Poll until backend finishes downloading.
      if (youtubePollRef.current) {
        clearInterval(youtubePollRef.current)
        youtubePollRef.current = null
      }

      youtubePollRef.current = setInterval(async () => {
        try {
          const st = await api.get(`/videos/${id}/status`)
          const status = st?.data?.status
          if (status === 'ready') {
            clearInterval(youtubePollRef.current)
            youtubePollRef.current = null
            setVideoUrl(`${base}/videos/${id}/file`)
            setAiStatus('ready')
            setYoutubeImporting(false)
          } else if (status === 'error') {
            clearInterval(youtubePollRef.current)
            youtubePollRef.current = null
            setAiStatus('error')
            setYoutubeImporting(false)
            const err = st?.data?.error
            setAiError(err ? `Falha ao importar do YouTube: ${err}` : 'Falha ao importar do YouTube.')
          }
        } catch {
          // keep polling
        }
      }, 1200)
    } catch (e) {
      setAiStatus('error')
      const status = e?.response?.status
      const detail = e?.response?.data?.detail
      setAiError(detail ? `Falha ao importar do YouTube: ${detail}` : status ? `Falha ao importar do YouTube (HTTP ${status}).` : 'Falha ao importar do YouTube. Verifique o backend.')
      setYoutubeImporting(false)
    }
  }

  useEffect(() => {
    return () => {
      if (youtubePollRef.current) {
        clearInterval(youtubePollRef.current)
        youtubePollRef.current = null
      }
    }
  }, [])



  async function uploadToGemini(file) {
    try {
      const uploadRes = await api.post('/videos/raw', file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Filename': file.name
        }
      })

      const id = uploadRes?.data?.video_id
      if (!id) throw new Error('missing video_id')
      setVideoId(id)

      setAiStatus('processing')
      // /videos returns when Gemini file is ACTIVE, so we can mark ready immediately.
      setAiStatus('ready')
    } catch (e) {
      setAiStatus('error')
      const status = e?.response?.status
      const detail = e?.response?.data?.detail
      if (status === 413) {
        setAiError(detail || 'Vídeo muito grande para processar.')
      } else {
        setAiError(detail ? `Falha ao processar com IA: ${detail}` : 'Falha ao processar com IA. Verifique o backend.')
      }
    }
  }

  async function captureFrame() {
    setError('')

    if (capturing) return
    setCapturing(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) {
        setError('Vídeo não disponível para captura.')
        return
      }

      if (!videoUrl) {
        setError('Faça upload de um vídeo primeiro.')
        return
      }

      if (!video.videoWidth || !video.videoHeight) {
        setError('Vídeo ainda não está pronto para captura.')
        return
      }

      try {
        video.pause()
      } catch {
        // ignore
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('Não foi possível capturar o frame (canvas).')
        return
      }

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      } catch {
        setError('Falha ao desenhar o vídeo no canvas. (Possível problema de CORS)')
        return
      }

      let blob = null
      try {
        blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      } catch {
        setError('Falha ao exportar o frame. (Possível problema de CORS)')
        return
      }
      if (!blob) {
        setError('Falha ao gerar imagem do frame. (Possível problema de CORS)')
        return
      }

      const seconds = Math.max(0, Number(video.currentTime) || 0)
      const timestamp = formatTimestamp(seconds)

      let description = ''
      if (aiFillEnabled && videoId && aiStatus === 'ready') {
        try {
          const params = { model: geminiModel, t: seconds, include_timestamp: includeTimestamp }
          if (aiContext) params.prompt = aiContext
          const res = await api.get(`/videos/${videoId}/smart-text`, { params })
          description = (res?.data?.text ?? '').toString()
        } catch (e) {
          const status = e?.response?.status
          const detail = e?.response?.data?.detail
          if (status === 429) {
            setAiError(detail || 'Limite/quota do Gemini excedida (429).')
          } else {
            setAiError(detail ? `Falha ao descrever com IA: ${detail}` : 'Falha ao descrever com IA. Verifique o backend.')
          }
        }
      }

      const url = URL.createObjectURL(blob)
      setSteps((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          blob,
          url,
          description,
          timestamp,
          seconds,
          has_image: true,
        },
      ])
    } finally {
      setCapturing(false)
    }
  }

  function createTextStep() {
    setError('')
    setAiError('')
    const id = crypto.randomUUID()
    setSteps((prev) => [
      ...prev,
      {
        id,
        description: '',
        timestamp: '',
        seconds: null,
        blob: null,
        url: '',
        has_image: false,
      },
    ])
    setSelectedStepId(id)
  }

  function updateDescription(id, description) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, description } : s)))
  }

  function updateStepImage(id, blob) {
    if (!blob) return
    setSteps((prev) => {
      return prev.map((s) => {
        if (s.id !== id) return s
        try {
          if (s.url) URL.revokeObjectURL(s.url)
        } catch {}
        const url = URL.createObjectURL(blob)
        return { ...s, blob, url, has_image: true }
      })
    })
  }

  function removeStep(id) {
    setSteps((prev) => {
      const step = prev.find((s) => s.id === id)
      if (step?.url) URL.revokeObjectURL(step.url)
      return prev.filter((s) => s.id !== id)
    })
  }
  async function generateWithAI(id) {
    setAiError('')

    if (!videoId || aiStatus !== 'ready') {
      setAiError('IA não está pronta. Faça upload do vídeo e aguarde “IA pronta”.')
      return
    }

    const step = steps.find((s) => s.id === id)
    if (!step?.timestamp) {
      setAiError('Não foi possível determinar o timestamp deste frame.')
      return
    }

    setAiStepBusyId(id)
    try {
      const params = { model: geminiModel, t: step.seconds ?? 0, include_timestamp: includeTimestamp }
      if (aiContext) params.prompt = aiContext
      const res = await api.get(`/videos/${videoId}/smart-text`, { params })
      const text = (res?.data?.text ?? '').toString()
      updateDescription(id, text)
    } catch (e) {
      const status = e?.response?.status
      const detail = e?.response?.data?.detail
      if (status === 429) {
        setAiError(detail || 'Limite/quota do Gemini excedida (429).')
      } else {
        setAiError(detail ? `Falha ao descrever com IA: ${detail}` : 'Falha ao descrever com IA. Verifique o backend.')
      }
    } finally {
      setAiStepBusyId(null)
    }
  }

    async function exportDoc() {
      setError('')
      if (steps.length === 0) {
        setError('Capture pelo menos um frame antes de exportar.')
        return
      }

      const rawPrefix = (imageNamePrefix || '').toString().trim()
      if (!rawPrefix) {
        setError('Preencha o prefixo do nome dos arquivos de imagem nas Configurações antes de exportar.')
        return
      }

      const parseFilenameFromContentDisposition = (value) => {
        const cd = (value || '').toString()
        // RFC 5987 / RFC 6266
        const mStar = cd.match(/filename\*=UTF-8''([^;\n]+)/i)
        if (mStar && mStar[1]) {
          try {
            return decodeURIComponent(mStar[1].trim().replace(/^"|"$/g, ''))
          } catch {
            return mStar[1].trim().replace(/^"|"$/g, '')
          }
        }
        const m = cd.match(/filename=([^;\n]+)/i)
        if (m && m[1]) return m[1].trim().replace(/^"|"$/g, '')
        return ''
      }

      const sanitizePrefix = (raw) => {
        let v = (raw || '').toString().trim()
        if (!v) return 'step_'
        // If user typed an extension, drop it to avoid "foo.png01.png"
        v = v.replace(/\.png$/i, '')
        // Remove path separators and keep it filename-friendly
        v = v.replace(/[\\/]/g, '_')
        v = v.replace(/\s+/g, '_')
        v = v.replace(/[^a-zA-Z0-9._-]/g, '_')
        v = v.slice(0, 60)
        return v || 'step_'
      }

      const prefix = sanitizePrefix(rawPrefix)

      setBusy(true)
      try {
        const form = new FormData()
        form.append(
          'steps',
          JSON.stringify(
            steps.map((s) => ({
              description: s.description ?? '',
              has_image: !!(s?.has_image && s?.blob),
            }))
          )
        )
        form.append('image_name_prefix', prefix)
        form.append('output_format', outputFormat || 'markdown')

        // Only send images for steps that actually have them.
        steps.forEach((s, idx) => {
          if (!s?.blob || !s?.has_image) return
          const file = new File([s.blob], `${prefix}${String(idx + 1).padStart(2, '0')}.png`, { type: 'image/png' })
          form.append('images', file)
        })

        const res = await api.post('/export', form, {
          responseType: 'blob'
        })

        const cd = res?.headers?.['content-disposition']
        const serverName = parseFilenameFromContentDisposition(cd)
        const fallbackName = (outputFormat === 'html' ? 'tutorial.html' : outputFormat === 'docx' ? 'tutorial.docx' : outputFormat === 'pdf' ? 'tutorial.pdf' : outputFormat === 'plain' ? 'tutorial.txt' : 'clipbuilder_export.zip')
        downloadBlob(res.data, serverName || fallbackName)
      } catch (e) {
        const status = e?.response?.status
        let detail = e?.response?.data?.detail

        // When responseType is 'blob', error bodies come as Blob (even for JSON).
        if (!detail && e?.response?.data instanceof Blob) {
          try {
            const text = await e.response.data.text()
            try {
              const parsed = JSON.parse(text)
              detail = parsed?.detail || text
            } catch {
              detail = text
            }
          } catch {}
        }
        if (status === 413) {
          setError('Payload muito grande para exportar. Tente menos passos ou frames menores.')
        } else if (status) {
          setError(detail ? `Falha ao exportar: ${detail}` : `Falha ao exportar (HTTP ${status}).`)
        } else {
          setError('Falha ao exportar. Verifique se o backend está rodando.')
        }
      } finally {
        setBusy(false)
      }
    }

    function reorderSteps(fromId, toId) {
      if (!fromId || !toId || fromId === toId) return
      setSteps((prev) => {
        const fromIndex = prev.findIndex((s) => s.id === fromId)
        const toIndex = prev.findIndex((s) => s.id === toId)
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
          return prev
        }
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return next
      })
    }

    // Handlers to pass to Sidebar
    function handleSelectStep(id) {
      setSelectedStepId(id)
    }

    function handleEditImage(id) {
      const step = steps.find((s) => s.id === id)
      if (!step?.url || !step?.blob || !step?.has_image) return
      setEditingStepId(id)
      setImageEditorOpen(true)
    }

    const editingStep = steps.find((s) => s.id === editingStepId) || null

    return (
      <div className={`min-h-screen ${darkMode ? 'text-slate-100' : 'bg-slate-50 text-slate-900'}`} style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <Header darkMode={darkMode} setDarkMode={setDarkMode} stepsCount={steps.length} exportDoc={exportDoc} busy={busy} />

        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[1fr_360px]">
          <section className={`rounded-lg border p-6 cb-panel`} style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}>
            <div className="flex flex-col items-center gap-6">
              <VideoArea
                videoUrl={videoUrl}
                videoRef={videoRef}
                canvasRef={canvasRef}
                onPickVideo={onPickVideo}
                youtubeUrl={youtubeUrl}
                setYoutubeUrl={setYoutubeUrl}
                onImportYoutube={importYoutube}
                youtubeImporting={youtubeImporting}
                capturing={capturing}
                aiStatus={aiStatus}
                darkMode={darkMode}
              />

              <div className="w-full max-w-[960px]">
                {steps.length === 0 ? (
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Capture frames para montar o tutorial.</div>
                ) : (
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Selecione um passo à direita para editar</div>
                )}
              </div>
              <div className="w-full max-w-[960px] mt-6">
                <div className="flex flex-col gap-3">
                  <button
                    onClick={captureFrame}
                    disabled={!videoUrl || capturing}
                    className="w-full rounded-md border px-6 py-4 text-lg font-semibold"
                  >
                    {capturing ? 'Capturando...' : 'Capturar Novo Passo'}
                  </button>
                  <button
                    onClick={createTextStep}
                    className="w-full rounded-md border px-6 py-4 text-lg font-semibold"
                  >
                    Novo passo (somente texto)
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-full rounded-md border px-6 py-4 text-lg font-semibold"
                  >
                    ⚙️ Configurações
                  </button>
                  <button
                    onClick={exportDoc}
                    disabled={busy || steps.length === 0}
                    className="w-full rounded-md border px-6 py-4 text-lg font-semibold"
                  >
                    {busy ? 'Exportando...' : 'Exportar'}
                  </button>

                  {(error || aiError) ? (
                    <div className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)', color: 'var(--text)' }}>
                      {error ? (
                        <div className="mb-2" style={{ color: '#ef4444' }}>{error}</div>
                      ) : null}
                      {aiError ? (
                        <div style={{ color: '#f59e0b' }}>{aiError}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <Sidebar
            steps={steps}
            selectedStepId={selectedStepId}
            setSelectedStepId={handleSelectStep}
            reorderSteps={reorderSteps}
            updateDescription={updateDescription}
            generateWithAI={generateWithAI}
            removeStep={removeStep}
            aiStepBusyId={aiStepBusyId}
            videoId={videoId}
            aiStatus={aiStatus}
            darkMode={darkMode}
            onEditImage={handleEditImage}
          />
          <ImageEditorModal
            open={imageEditorOpen}
            step={editingStep}
            onClose={() => {
              setImageEditorOpen(false)
              setEditingStepId(null)
            }}
            onSave={(blob) => {
              if (!editingStepId) return
              updateStepImage(editingStepId, blob)
            }}
          />
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            aiContext={aiContext}
            setAiContext={setAiContext}
            savedPrompt={savedPrompt}
            setSavedPrompt={setSavedPrompt}
            includeTimestamp={includeTimestamp}
            setIncludeTimestamp={setIncludeTimestamp}
            geminiModel={geminiModel}
            setGeminiModel={setGeminiModel}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            imageNamePrefix={imageNamePrefix}
            setImageNamePrefix={setImageNamePrefix}
            aiFillEnabled={aiFillEnabled}
            setAiFillEnabled={setAiFillEnabled}
          />
        </main>
      </div>
    )
  }
