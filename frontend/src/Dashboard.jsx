import { useEffect, useMemo, useRef, useState } from 'react'
import { api, getApiUrl, downloadMarkdownAsDocx, downloadMarkdownAsPdf, downloadMarkdownAsHtml } from './lib/api'
import { generateMarkdown, parseMarkdown, validateSchema, generateFilename } from './lib/markdownUtils'
import Header from './components/Header'
import VideoArea from './components/VideoArea'
import StepCard from './components/StepCard'
import Sidebar from './components/Sidebar'
import SettingsModal from './components/SettingsModalExtended'
import ImageEditorModal from './components/ImageEditorModal'
import ImportMarkdownModal from './components/ImportMarkdownModal'
import EnhancedDocPreview from './components/EnhancedDocPreview'
import GifPreviewModal from './components/GifPreviewModal'
import GIF from 'gif.js'
import { Play, FileVideo, Wand2, Settings, Download, Upload, FileText, Video, Loader2, ChevronDown } from 'lucide-react'

const LS = {
  geminiModel: 'CLIPBUILDER_GEMINI_MODEL',
  dark: 'CLIPBUILDER_DARK',
  savedPrompt: 'CLIPBUILDER_SAVED_PROMPT',
  aiFillEnabled: 'CLIPBUILDER_AI_FILL_ENABLED',
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
  } catch { }
}

function lsRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch { }
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
    } catch { }
  }, 1500)
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function Dashboard() {
    const [darkMode, setDarkMode] = useState(() => {
      try {
        return lsGet(LS.dark) === '1'
      } catch {
        return false
      }
    })
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const youtubePollRef = useRef(null)
  const gifEncoderRef = useRef(null)
  const gifFrameIntervalRef = useRef(null)

  const [videoUrl, setVideoUrl] = useState(null)
  const [videoId, setVideoId] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeImporting, setYoutubeImporting] = useState(false)
  const [geminiModel, setGeminiModel] = useState(() => {
    const stored = lsGet(LS.geminiModel)
    const allowed = new Set([
      'models/gemini-2.5-flash',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-4-maverick-17b-128e-instruct'
    ])
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
    const v = lsGet(LS.includeTimestamp)
    return v === undefined ? true : v === 'true'
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
  const [imageNamePrefix, setImageNamePrefix] = useState(() => {
    try { return lsGet(LS.imageNamePrefix) || 'step_' } catch { return 'step_' }
  })

  // === NOVOS ESTADOS PARA MARKDOWN ===
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('Novo Processo')

  // === ESTADOS PARA ENHANCEMENT COM GROQ ===
  const [enhanceLoading, setEnhanceLoading] = useState(false)
  const [enhancedMarkdown, setEnhancedMarkdown] = useState('')
  const [enhancePreviewOpen, setEnhancePreviewOpen] = useState(false)
  const [docProDropdownOpen, setDocProDropdownOpen] = useState(false)
  const docProDropdownRef = useRef(null)
  const [documentStatus, setDocumentStatus] = useState('em_progresso') // em_progresso | pausado | concluido
  const [lastCompletedStep, setLastCompletedStep] = useState(0)
  const [documentOverview, setDocumentOverview] = useState('')
  const [documentGeneratedAt, setDocumentGeneratedAt] = useState(() => new Date().toISOString())

  // === ESTADOS PARA GRAVAÇÃO DE GIF ===
  const [isRecordingGif, setIsRecordingGif] = useState(false)
  const [gifProgress, setGifProgress] = useState(0)
  const [gifBlob, setGifBlob] = useState(null)
  const [gifUrl, setGifUrl] = useState('')
  const [gifPreviewOpen, setGifPreviewOpen] = useState(false)
  const [isGeneratingGif, setIsGeneratingGif] = useState(false)
  const [gifDescribeLoading, setGifDescribeLoading] = useState(false)
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false)
  const [generationStage, setGenerationStage] = useState('') // 'analyzing' | 'generating' | 'downloading'

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
    } catch { }
  }, [darkMode])

  useEffect(() => {
    if (!docProDropdownOpen) return
    function handleClickOutside(e) {
      if (docProDropdownRef.current && !docProDropdownRef.current.contains(e.target)) {
        setDocProDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [docProDropdownOpen])

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
        try { URL.revokeObjectURL(videoUrl) } catch { }
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
        } catch { }
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

    // Para GIFs, usar endpoint /describe-gif
    if (step?.is_gif && step?.blob) {
      setAiStepBusyId(id)
      try {
        const form = new FormData()
        form.append('file', new File([step.blob], 'clipbuilder.gif', { type: 'image/gif' }))
        if (documentTitle && documentTitle.trim()) {
          form.append('document_title', documentTitle.trim())
        }
        const contextParts = []
        if (documentTitle && documentTitle.trim()) {
          contextParts.push(`Título: ${documentTitle.trim()}`)
        }
        steps.forEach((s, i) => {
          if (s.id !== id && s.description && s.description.trim()) {
            contextParts.push(`Passo ${i + 1}: ${s.description.trim()}`)
          }
        })
        if (contextParts.length > 0) {
          form.append('document_context', contextParts.join('\n'))
        }

        const res = await api.post('/describe-gif', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const text = res?.data?.description
        if (text && typeof text === 'string' && text.trim()) {
          updateDescription(id, text.trim())
        }
      } catch (e) {
        const status = e?.response?.status
        const detail = e?.response?.data?.detail
        if (status === 429) {
          setAiError(detail || 'Limite/quota do Gemini excedida (429).')
        } else {
          setAiError(detail ? `Falha ao descrever GIF com IA: ${detail}` : 'Falha ao descrever GIF com IA. Verifique o backend.')
        }
      } finally {
        setAiStepBusyId(null)
      }
      return
    }

    // Para frames normais, precisa de timestamp
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

  // === EXPORTAÇÃO/IMPORTAÇÃO MARKDOWN ===

  async function exportMarkdownDoc() {
    setError('')
    if (steps.length === 0) {
      setError('Capture pelo menos um passo antes de exportar Markdown.')
      return
    }

    const rawPrefix = (imageNamePrefix || '').toString().trim()
    if (!rawPrefix) {
      setError('Preencha o prefixo do nome dos arquivos de imagem nas Configurações antes de exportar.')
      return
    }

    setBusy(true)
    try {
      // Importar JSZip dinamicamente
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      const sanitizePrefix = (raw) => {
        let v = (raw || '').toString().trim()
        if (!v) return 'step_'
        v = v.replace(/\.png$/i, '')
        v = v.replace(/[\\/]/g, '_')
        v = v.replace(/\s+/g, '_')
        v = v.replace(/[^a-zA-Z0-9._-]/g, '_')
        v = v.slice(0, 60)
        return v || 'step_'
      }

      const prefix = sanitizePrefix(rawPrefix)

      // Preparar steps com campos expandidos para o Markdown
      const enrichedSteps = steps.map((step, idx) => ({
        ...step,
        title: step.title || `Passo ${idx + 1}`,
        userAction: step.userAction || step.description || '',
        expectedResult: step.expectedResult || '',
        observations: step.observations || '',
        imageName: step.has_image && step.blob ? `images/${prefix}${String(idx + 1).padStart(2, '0')}.png` : ''
      }))

      const metadata = {
        title: documentTitle,
        status: documentStatus,
        videoSource: videoId || youtubeUrl || 'local',
        lastCompletedStep: lastCompletedStep,
        generatedAt: documentGeneratedAt
      }

      // Gerar o markdown com schema completo (frontmatter válido)
      const markdown = generateMarkdown(enrichedSteps, metadata, documentOverview)

      // Adicionar o markdown ao ZIP
      const safeTitle = documentTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'documento'
      zip.file(`${safeTitle}.md`, markdown)

      // Criar pasta de imagens e adicionar as imagens
      const imagesFolder = zip.folder('images')
      steps.forEach((step, idx) => {
        if (step.has_image && step.blob) {
          const imageName = `${prefix}${String(idx + 1).padStart(2, '0')}.png`
          imagesFolder.file(imageName, step.blob)
        }
      })

      // Gerar o arquivo ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const filename = `${safeTitle}_backup.zip`
      downloadBlob(zipBlob, filename)

    } catch (e) {
      console.error('Erro ao exportar:', e)
      setError('Falha ao exportar Markdown: ' + (e.message || 'Erro desconhecido'))
    } finally {
      setBusy(false)
    }
  }

  function handleImportMarkdown(parsed, rawContent, images = {}) {
    if (!parsed || !parsed.isValid) {
      setError('Arquivo Markdown inválido.')
      return
    }

    // Restaurar metadados
    if (parsed.metadata.title) setDocumentTitle(parsed.metadata.title)
    if (parsed.metadata.status) setDocumentStatus(parsed.metadata.status)
    if (parsed.metadata.lastCompletedStep !== undefined) setLastCompletedStep(parsed.metadata.lastCompletedStep)
    if (parsed.metadata.generatedAt) setDocumentGeneratedAt(parsed.metadata.generatedAt)
    if (parsed.metadata.videoSource) setVideoSource(parsed.metadata.videoSource)
    if (parsed.overview) setDocumentOverview(parsed.overview)

    // Converter passos importados para o formato do app
    const importedSteps = parsed.steps.map((step, idx) => {
      // Tentar encontrar a imagem correspondente
      const stepNum = String(idx + 1).padStart(2, '0')
      let imageBlob = null
      let imageUrl = ''

      // Procurar imagem pelo nome do passo
      for (const [imageName, blob] of Object.entries(images)) {
        // Verificar se o nome da imagem corresponde ao passo
        if (imageName.includes(stepNum) || imageName.includes(`step_${stepNum}`) || imageName.includes(`passo_${stepNum}`)) {
          imageBlob = blob
          imageUrl = URL.createObjectURL(blob)
          break
        }
      }

      // Se não encontrou por número, tentar pelo imageName do passo
      if (!imageBlob && step.imageName && images[step.imageName]) {
        imageBlob = images[step.imageName]
        imageUrl = URL.createObjectURL(imageBlob)
      }

      return {
        id: step.id || crypto.randomUUID(),
        description: step.description || '',
        userAction: step.userAction || '',
        expectedResult: step.expectedResult || '',
        observations: step.observations || '',
        timestamp: step.timestamp || '',
        seconds: null,
        title: step.title || '',
        completed: step.completed || false,
        has_image: !!imageBlob,
        blob: imageBlob,
        url: imageUrl
      }
    })

    setSteps(importedSteps)
    setSelectedStepId(importedSteps.length > 0 ? importedSteps[0].id : null)
  }

  function markStepCompleted(stepIndex) {
    setSteps((prev) => prev.map((s, idx) =>
      idx === stepIndex ? { ...s, completed: !s.completed } : s
    ))

    // Atualizar último passo concluído
    let lastCompleted = 0
    steps.forEach((step, idx) => {
      if (idx === stepIndex ? !step.completed : step.completed) {
        lastCompleted = idx + 1
      }
    })
    setLastCompletedStep(lastCompleted)
  }

  // Função auxiliar para videoSource (usado na importação)
  function setVideoSource(source) {
    // Se for uma URL do YouTube, configurar para importação
    if (source && source.includes('youtube')) {
      setYoutubeUrl(source)
    }
  }

  // === FUNÇÃO DE ENHANCEMENT COM GROQ (Doc Pro) ===
  async function enhanceAndExport(format) {
    setError('')
    setAiError('')

    if (steps.length === 0) {
      setError('Capture pelo menos um passo antes de gerar o documento profissional.')
      return
    }

    const title = documentTitle || 'Documento Sem Título'
    const safeTitle = (title || 'documento').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)

    setEnhanceLoading(true)
    try {
      const stepsPayload = steps.map((step) => ({
        description: step.description || '',
        timestamp: step.timestamp || '',
        has_image: !!step.has_image
      }))

      const response = await api.post('/enhance-document', {
        title,
        steps: stepsPayload
      })

      const markdown = response?.data?.markdown || ''
      if (!markdown) {
        throw new Error('Resposta vazia do servidor')
      }

      if (format === 'md') {
        setEnhancedMarkdown(markdown)
        setEnhancePreviewOpen(true)
        return
      }

      if (format === 'docx') {
        await downloadMarkdownAsDocx(markdown, `${safeTitle}.docx`, true)
        return
      }
      if (format === 'pdf') {
        await downloadMarkdownAsPdf(markdown, `${safeTitle}.pdf`)
        return
      }
      if (format === 'html') {
        await downloadMarkdownAsHtml(markdown, `${safeTitle}.html`)
        return
      }
    } catch (e) {
      const status = e?.response?.status
      const detail = e?.response?.data?.detail
      if (status === 429) {
        setAiError(detail || 'Limite de requisições do Groq excedido. Tente novamente em alguns segundos.')
      } else if (status === 400) {
        setAiError(detail || 'Erro nos dados enviados.')
      } else {
        setAiError(detail || 'Falha ao gerar documento profissional. Verifique se o backend está rodando e a API Key do Groq está configurada.')
      }
    } finally {
      setEnhanceLoading(false)
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
      form.append('output_format', 'markdown')

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
      const fallbackName = 'clipbuilder_export.zip'
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
        } catch { }
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

  // === FUNÇÕES DE GRAVAÇÃO DE GIF ===
  function startGifRecording() {
    if (!videoRef.current || !canvasRef.current || !videoUrl) {
      setError('Carregue um vídeo primeiro para gravar GIF.')
      return
    }

    setError('')
    setIsRecordingGif(true)
    setGifProgress(0)

    const video = videoRef.current
    const canvas = canvasRef.current

    // Configurar canvas com tamanho do vídeo
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')

    // Criar encoder GIF
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: canvas.width,
      height: canvas.height,
      workerScript: '/gif.worker.js'
    })

    gifEncoderRef.current = gif

    // Iniciar o vídeo se estiver pausado
    if (video.paused) {
      video.play().catch(() => { })
    }

    // Capturar frames a cada 100ms (10 FPS)
    gifFrameIntervalRef.current = setInterval(() => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        gif.addFrame(ctx, { copy: true, delay: 100 })
      } catch (e) {
        console.error('Erro ao capturar frame:', e)
      }
    }, 100)
  }

  function stopGifRecording() {
    setIsRecordingGif(false)

    // Parar captura de frames
    if (gifFrameIntervalRef.current) {
      clearInterval(gifFrameIntervalRef.current)
      gifFrameIntervalRef.current = null
    }

    // Pausar vídeo
    if (videoRef.current) {
      videoRef.current.pause()
    }

    const gif = gifEncoderRef.current
    if (!gif) return

    setIsGeneratingGif(true)
    setGifPreviewOpen(true)

    gif.on('progress', (p) => {
      setGifProgress(p)
    })

    gif.on('finished', (blob) => {
      setGifBlob(blob)
      setGifUrl(URL.createObjectURL(blob))
      setIsGeneratingGif(false)
      gifEncoderRef.current = null
    })

    gif.render()
  }

  async function addGifAsStep() {
    if (!gifBlob) return

    setGifDescribeLoading(true)
    let description = 'GIF animado'

    // Capturar timestamp do momento atual do vídeo (se disponível)
    const video = videoRef.current
    const seconds = video ? Math.max(0, Number(video.currentTime) || 0) : null
    const timestamp = seconds !== null ? formatTimestamp(seconds) : ''

    // Gerar thumbnail do primeiro frame do GIF
    let thumbnailUrl = null
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = gifUrl
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      thumbnailUrl = canvas.toDataURL('image/png')
    } catch (_) {
      // Se falhar, thumbnailUrl fica null e o GifStepPreview tentará extrair
    }

    try {
      const form = new FormData()
      form.append('file', new File([gifBlob], 'clipbuilder.gif', { type: 'image/gif' }))
      if (documentTitle && documentTitle.trim()) {
        form.append('document_title', documentTitle.trim())
      }
      const contextParts = []
      if (documentTitle && documentTitle.trim()) {
        contextParts.push(`Título: ${documentTitle.trim()}`)
      }
      steps.forEach((s, i) => {
        if (s.description && s.description.trim()) {
          contextParts.push(`Passo ${i + 1}: ${s.description.trim()}`)
        }
      })
      if (contextParts.length > 0) {
        form.append('document_context', contextParts.join('\n'))
      }

      const res = await api.post('/describe-gif', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const text = res?.data?.description
      if (text && typeof text === 'string' && text.trim()) {
        description = text.trim()
      }
    } catch (_) {
      // Keep fallback "GIF animado"
    } finally {
      setGifDescribeLoading(false)
    }

    const id = crypto.randomUUID()
    // Criar novo blob URL para o passo (o gifUrl original será revogado no closeGifPreview)
    const stepGifUrl = URL.createObjectURL(gifBlob)
    setSteps((prev) => [
      ...prev,
      {
        id,
        blob: gifBlob,
        url: stepGifUrl,
        thumbnailUrl,
        description,
        timestamp,
        seconds,
        has_image: true,
        is_gif: true
      }
    ])
    setSelectedStepId(id)
    closeGifPreview()
  }

  function downloadGif() {
    if (!gifBlob) return
    downloadBlob(gifBlob, `clipbuilder_gif_${Date.now()}.gif`)
  }

  function closeGifPreview() {
    setGifPreviewOpen(false)
    setGifBlob(null)
    if (gifUrl) {
      URL.revokeObjectURL(gifUrl)
      setGifUrl('')
    }
    setGifProgress(0)
    setIsGeneratingGif(false)
  }

  async function handleGenerateDocumentation() {
    if (!gifBlob) return
    setIsGeneratingDoc(true)
    setGenerationStage('analyzing')
    setAiError('')

    try {
      // Stage 1: Describe GIF (Extract context)
      // Send as Multipart form data - efficient for large files
      const form = new FormData()
      form.append('file', new File([gifBlob], 'clipbuilder.gif', { type: 'image/gif' }))

      // Add minimal context
      if (documentTitle) form.append('document_title', documentTitle)

      const descRes = await api.post('/describe-gif', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const description = descRes?.data?.description || "Procedimento demonstrado no GIF (análise automática indisponível)"

      // Generate Thumbnail for DocContext
      let thumbBase64 = null
      try {
        const img = new Image()
        img.src = URL.createObjectURL(gifBlob)
        await new Promise((resolve) => img.onload = resolve)

        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 800 / img.naturalWidth)
        canvas.width = img.naturalWidth * scale
        canvas.height = img.naturalHeight * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        thumbBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
      } catch (err) {
        console.warn('Thumbnail generation failed', err)
      }

      // Stage 2: Generate Structured Document (with Text + Thumbnail)
      setGenerationStage('generating')

      const res = await api.post('/generate-documentation', {
        title: documentTitle || "Procedimento",
        steps: [{
          description: description,
          has_image: !!thumbBase64
        }],
        images: thumbBase64 ? [thumbBase64] : [],
        output_format: "docx"
      }, {
        responseType: 'blob'
      })

      setGenerationStage('downloading')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      downloadBlob(res.data, `procedimento_${timestamp}.docx`)
      closeGifPreview()

    } catch (e) {
      console.error(e)
      let msg = e.message
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text()
          msg = JSON.parse(text).detail || msg
        } catch { }
      } else if (e.response?.data?.detail) {
        msg = e.response.data.detail
      }
      setAiError("Falha ao gerar documentação: " + msg)
    } finally {
      setIsGeneratingDoc(false)
      setGenerationStage('')
    }
  }

  const editingStep = steps.find((s) => s.id === editingStepId) || null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <Header darkMode={darkMode} setDarkMode={setDarkMode} stepsCount={steps.length} exportDoc={exportDoc} busy={busy} />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_400px]">
        <section className="cb-panel">
          <div className="flex flex-col items-center gap-8">
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
              isRecordingGif={isRecordingGif}
              onStartGifRecording={startGifRecording}
              onStopGifRecording={stopGifRecording}
            />

            <div className="w-full max-w-[960px]">
              {steps.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Capture frames para montar o tutorial</div>
                  <div className="text-xs" style={{ color: 'var(--muted-text)' }}>Use a tecla <kbd className="px-1.5 py-0.5 rounded text-xs font-mono border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>S</kbd> para capturar rapidamente</div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Selecione um passo à direita para editar</div>
                </div>
              )}
            </div>
            <div className="w-full max-w-[960px]">
              <div className="space-y-5">
                {/* Criar: adicionar ao tutorial */}
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted-text)' }}>Adicionar ao tutorial</div>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={captureFrame}
                      disabled={!videoUrl || capturing}
                      className="cb-btn cb-btn-primary w-full h-12 text-base font-semibold"
                      title="Pause no vídeo e capture (tecla S)"
                    >
                      <Play className="h-5 w-5" />
                      {capturing ? 'Capturando...' : 'Capturar Frame'}
                    </button>
                  </div>
                </div>

                {/* Ajustes + Finalizar: mesma linha em telas médias */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted-text)' }}>Projeto</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSettingsOpen(true)}
                        className="cb-btn w-full h-11"
                        title="Ajustar IA, exportação e backup"
                      >
                        <Settings className="h-4 w-4" />
                        Config
                      </button>
                      <button
                        onClick={() => setImportModalOpen(true)}
                        className="cb-btn w-full h-11"
                        title="Importar projeto (.md)"
                      >
                        <Upload className="h-4 w-4" />
                        Importar
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted-text)' }}>Exportar</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={exportMarkdownDoc}
                        disabled={busy || steps.length === 0}
                        className="cb-btn w-full h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Salvar projeto (.md + imagens)"
                      >
                        <Download className="h-4 w-4" />
                        {busy ? 'Salvando...' : 'Exportar .md'}
                      </button>
                      <div ref={docProDropdownRef} className="relative w-full">
                        <div className="flex rounded-lg overflow-hidden border w-full" style={{ borderColor: 'var(--card-border)' }}>
                          <button
                            onClick={() => {
                              if (enhanceLoading || steps.length === 0) return
                              setDocProDropdownOpen((v) => !v)
                            }}
                            disabled={enhanceLoading || steps.length === 0}
                            className="cb-btn flex-1 h-11 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            title="Doc Pro: gerar documento e escolher formato (MD, DOCX, HTML, PDF)"
                            aria-haspopup="listbox"
                            aria-expanded={docProDropdownOpen}
                            aria-label="Doc Pro — abrir opções de formato"
                          >
                            {enhanceLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Wand2 className="h-4 w-4" />
                            )}
                            {enhanceLoading ? 'Gerando...' : 'Doc Pro'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (enhanceLoading || steps.length === 0) return
                              setDocProDropdownOpen((v) => !v)
                            }}
                            disabled={enhanceLoading || steps.length === 0}
                            className="cb-btn h-11 px-2 flex items-center disabled:opacity-50 disabled:cursor-not-allowed border-l transition-all duration-200"
                            style={{ borderColor: 'var(--card-border)' }}
                            aria-label="Abrir opções de formato"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${docProDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {docProDropdownOpen ? (
                          <ul
                            role="listbox"
                            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[10rem]"
                            style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}
                          >
                            {[
                              { id: 'md', label: 'Markdown (MD)', desc: 'Abrir preview e baixar .md' },
                              { id: 'docx', label: 'Word (DOCX)', desc: 'Baixar .docx' },
                              { id: 'html', label: 'HTML', desc: 'Baixar .html' },
                              { id: 'pdf', label: 'PDF', desc: 'Baixar .pdf' }
                            ].map((opt) => (
                              <li key={opt.id} role="option">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDocProDropdownOpen(false)
                                    enhanceAndExport(opt.id)
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                  style={{ color: 'var(--text)' }}
                                >
                                  <span className="font-medium">{opt.label}</span>
                                  <span className="block text-xs mt-0.5" style={{ color: 'var(--muted-text)' }}>{opt.desc}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {(error || aiError) ? (
                  <div className="rounded-lg border p-4 text-sm" style={{ borderColor: error ? 'var(--danger)' : 'var(--warning)', backgroundColor: error ? 'var(--danger-bg)' : 'var(--warning-bg)', color: error ? 'var(--danger)' : 'var(--warning)' }}>
                    {error ? (
                      <div className="flex items-start gap-2">
                        <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    ) : null}
                    {aiError ? (
                      <div className="flex items-start gap-2">
                        <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{aiError}</span>
                      </div>
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
          geminiModel={geminiModel}
          setGeminiModel={setGeminiModel}
          imageNamePrefix={imageNamePrefix}
          setImageNamePrefix={setImageNamePrefix}
          aiFillEnabled={aiFillEnabled}
          setAiFillEnabled={setAiFillEnabled}
          onExportMarkdown={exportMarkdownDoc}
          onImportMarkdown={() => setImportModalOpen(true)}
          onEnhanceDocument={() => enhanceAndExport('md')}
          stepsCount={steps.length}
          enhanceLoading={enhanceLoading}
        />
        <ImportMarkdownModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportMarkdown}
        />
        <EnhancedDocPreview
          open={enhancePreviewOpen}
          onClose={() => setEnhancePreviewOpen(false)}
          markdown={enhancedMarkdown}
          onMarkdownChange={setEnhancedMarkdown}
          title={documentTitle}
          steps={steps}
        />
        <GifPreviewModal
          isOpen={gifPreviewOpen}
          onClose={closeGifPreview}
          gifUrl={gifUrl}
          gifBlob={gifBlob}
          onAddToDoc={addGifAsStep}
          onDownload={downloadGif}
          isGenerating={isGeneratingGif}
          progress={gifProgress}
          gifDescribeLoading={gifDescribeLoading}
          onGenerateDoc={handleGenerateDocumentation}
          isGeneratingDoc={isGeneratingDoc}
          generationStage={generationStage}
        />
      </main>
    </div>
  )
}
