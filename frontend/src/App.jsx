import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './lib/api'
import Header from './components/Header'
import VideoArea from './components/VideoArea'
import StepCard from './components/StepCard'
import Sidebar from './components/Sidebar'
import SettingsModal from './components/SettingsModalExtended'

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
  URL.revokeObjectURL(url)
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

  const [videoUrl, setVideoUrl] = useState(null)
  const [videoId, setVideoId] = useState(null)
  const [geminiModel, setGeminiModel] = useState(() => {
    const stored = localStorage.getItem('DOCUVIDEO_GEMINI_MODEL')
    const allowed = new Set(['models/gemini-2.0-flash', 'models/gemini-2.5-flash', 'models/gemini-2.5-pro'])
    if (stored && allowed.has(stored)) return stored
    return 'models/gemini-2.0-flash'
  })
  const [aiStatus, setAiStatus] = useState('idle') // idle|uploading|processing|ready|error
  const [aiError, setAiError] = useState('')
  const [aiStepBusyId, setAiStepBusyId] = useState(null)
  const [steps, setSteps] = useState([]) 
  const [busy, setBusy] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [aiContext, setAiContext] = useState('')
  const [includeTimestamp, setIncludeTimestamp] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('DOCUVIDEO_DARK') === '1'
    } catch {
      return false
    }
  })
  const [savedPrompt, setSavedPrompt] = useState(() => {
    try {
      return localStorage.getItem('DOCUVIDEO_SAVED_PROMPT') || ''
    } catch {
      return ''
    }
  })
  const [outputFormat, setOutputFormat] = useState(() => {
    try { return localStorage.getItem('DOCUVIDEO_OUTPUT_FORMAT') || 'markdown' } catch { return 'markdown' }
  })

  const totalImageBytes = useMemo(() => {
    return steps.reduce((sum, s) => sum + (s.blob?.size ?? 0), 0)
  }, [steps])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key?.toLowerCase() !== 's') return
      // Avoid capturing while typing
      const el = document.activeElement
      const tag = el?.tagName?.toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      e.preventDefault()
      captureFrame()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, videoUrl])

  useEffect(() => {
    try {
      if (darkMode) localStorage.setItem('DOCUVIDEO_DARK', '1')
      else localStorage.removeItem('DOCUVIDEO_DARK')
    } catch {}
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

    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    setSteps([])
    setVideoId(null)
    setAiStatus('uploading')
    uploadToGemini(file)
  }



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
        setAiError('Vídeo muito grande para processar.')
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

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) {
        setError('Falha ao gerar imagem do frame.')
        return
      }

      const seconds = Math.max(0, Number(video.currentTime) || 0)
      const timestamp = formatTimestamp(seconds)

      let description = ''
      if (videoId && aiStatus === 'ready') {
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
        },
      ])
    } finally {
      setCapturing(false)
    }
  }

  function updateDescription(id, description) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, description } : s)))
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

      setBusy(true)
      try {
        const form = new FormData()
        form.append(
          'steps',
          JSON.stringify(steps.map((s) => ({ description: s.description ?? '' })))
        )

        steps.forEach((s, idx) => {
          const file = new File([s.blob], `step_${String(idx + 1).padStart(2, '0')}.png`, {
            type: 'image/png'
          })
          form.append('images', file)
        })

        const res = await api.post('/export', form, {
          responseType: 'blob'
        })

        downloadBlob(res.data, 'docuvideo_export.zip')
      } catch (e) {
        const status = e?.response?.status
        if (status === 413) {
          setError('Payload muito grande para exportar. Tente menos passos ou frames menores.')
        } else if (status) {
          setError(`Falha ao exportar (HTTP ${status}).`)
        } else {
          setError('Falha ao exportar. Verifique se o backend está rodando.')
        }
      } finally {
        setBusy(false)
      }
    }

    // Handlers to pass to Sidebar
    function handleSelectStep(id) {
      setSelectedStepId(id)
    }

    return (
      <div className={`min-h-screen ${darkMode ? 'text-slate-100' : 'bg-slate-50 text-slate-900'}`} style={{ backgroundColor: darkMode ? '#2b2b2b' : undefined }}>
        <Header darkMode={darkMode} setDarkMode={setDarkMode} stepsCount={steps.length} exportDoc={exportDoc} busy={busy} />

        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[1fr_360px]">
          <section className={`rounded-lg border p-6`} style={{ backgroundColor: darkMode ? '#2b2b2b' : undefined, borderColor: darkMode ? '#444' : undefined }}>
            <div className="flex flex-col items-center gap-6">
              <VideoArea
                videoUrl={videoUrl}
                videoRef={videoRef}
                canvasRef={canvasRef}
                onPickVideo={onPickVideo}
                captureFrame={captureFrame}
                capturing={capturing}
                aiStatus={aiStatus}
                darkMode={darkMode}
              />

              <div className="w-full max-w-[960px]">
                {steps.length === 0 ? (
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Capture frames para montar o tutorial.</div>
                ) : (
                  <div className="text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}">Selecione um passo à direita para editar</div>
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
                    onClick={() => setSettingsOpen(true)}
                    className="w-full rounded-md border px-6 py-4 text-lg font-semibold"
                  >
                    ⚙️ Configurações da IA
                  </button>
                  <button
                    onClick={exportDoc}
                    disabled={busy || steps.length === 0}
                    className="w-full rounded-md border px-6 py-4 text-lg font-semibold"
                  >
                    {busy ? 'Exportando...' : 'Exportar'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <Sidebar
            steps={steps}
            selectedStepId={selectedStepId}
            setSelectedStepId={handleSelectStep}
            updateDescription={updateDescription}
            generateWithAI={generateWithAI}
            removeStep={removeStep}
            aiStepBusyId={aiStepBusyId}
            videoId={videoId}
            aiStatus={aiStatus}
            darkMode={darkMode}
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
          />
        </main>
      </div>
    )
  }
