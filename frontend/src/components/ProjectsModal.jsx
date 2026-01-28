import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { FolderOpen, Trash2, Download, X, Save, RefreshCw } from 'lucide-react'

export default function ProjectsModal({
    open,
    onClose,
    steps,
    videoId,
    onLoadProject,
    onExport,
}) {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [saveName, setSaveName] = useState('')
    const [saving, setSaving] = useState(false)
    const [tab, setTab] = useState('list') // 'list' | 'save'

    async function fetchProjects() {
        setLoading(true)
        setError('')
        try {
            const res = await api.get('/projects')
            setProjects(res?.data?.projects || [])
        } catch (e) {
            setError('Falha ao carregar projetos.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchProjects()
            setTab('list')
            setSaveName('')
        }
    }, [open])

    async function handleSaveProject() {
        if (!saveName.trim()) {
            setError('Informe um nome para o projeto.')
            return
        }

        setSaving(true)
        setError('')
        try {
            // Convert steps to project format with base64 images
            const projectSteps = await Promise.all(
                steps.map(async (step, i) => {
                    let image_base64 = null
                    if (step.blob && step.has_image) {
                        try {
                            const reader = new FileReader()
                            image_base64 = await new Promise((resolve, reject) => {
                                reader.onload = () => resolve(reader.result)
                                reader.onerror = reject
                                reader.readAsDataURL(step.blob)
                            })
                        } catch {
                            // ignore image conversion errors
                        }
                    }

                    return {
                        order: i + 1,
                        description: step.description || '',
                        timestamp: step.timestamp || '',
                        has_image: !!(step.has_image && step.blob),
                        image_base64,
                    }
                })
            )

            await api.post('/projects', {
                name: saveName.trim(),
                video_id: videoId,
                steps: projectSteps,
            })

            setSaveName('')
            setTab('list')
            fetchProjects()
        } catch (e) {
            const detail = e?.response?.data?.detail
            setError(detail || 'Falha ao salvar projeto.')
        } finally {
            setSaving(false)
        }
    }

    async function handleLoadProject(projectId) {
        setLoading(true)
        setError('')
        try {
            const res = await api.get(`/projects/${projectId}`)
            const project = res?.data
            if (project && onLoadProject) {
                onLoadProject(project)
                onClose()
            }
        } catch (e) {
            setError('Falha ao carregar projeto.')
        } finally {
            setLoading(false)
        }
    }

    async function handleDeleteProject(projectId) {
        if (!confirm('Tem certeza que deseja deletar este projeto?')) return

        try {
            await api.delete(`/projects/${projectId}`)
            fetchProjects()
        } catch (e) {
            setError('Falha ao deletar projeto.')
        }
    }

    function formatDate(isoString) {
        if (!isoString) return ''
        try {
            const date = new Date(isoString)
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
        } catch {
            return ''
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="w-full max-w-xl rounded-xl shadow-2xl"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ borderColor: 'var(--card-border)' }}
                >
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                        Projetos Salvos
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: 'var(--card-border)' }}>
                    <button
                        onClick={() => setTab('list')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'list'
                                ? 'border-b-2'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                        style={tab === 'list' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                    >
                        Carregar Projeto
                    </button>
                    <button
                        onClick={() => setTab('save')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'save'
                                ? 'border-b-2'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                        style={tab === 'save' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                    >
                        Salvar Projeto Atual
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {error && (
                        <div
                            className="mb-4 p-3 rounded-lg text-sm"
                            style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                        >
                            {error}
                        </div>
                    )}

                    {tab === 'list' && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {projects.length} projeto{projects.length !== 1 ? 's' : ''} salvo{projects.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={fetchProjects}
                                    disabled={loading}
                                    className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    title="Atualizar lista"
                                >
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loading && projects.length === 0 ? (
                                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Carregando...
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="text-center py-8">
                                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Nenhum projeto salvo ainda.
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>
                                        Salve seu trabalho atual para continuar depois.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                            style={{ border: '1px solid var(--card-border)' }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium truncate">{project.name}</h3>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                    {project.steps_count} passo{project.steps_count !== 1 ? 's' : ''} • Atualizado em {formatDate(project.updated_at)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleLoadProject(project.id)}
                                                    className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                                    title="Carregar projeto"
                                                >
                                                    <Download className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProject(project.id)}
                                                    className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                                    title="Deletar projeto"
                                                >
                                                    <Trash2 className="h-4 w-4" style={{ color: 'var(--danger)' }} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'save' && (
                        <div className="space-y-4">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Salve os passos atuais para poder editar esta documentação depois.
                            </p>

                            {steps.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm" style={{ color: 'var(--warning)' }}>
                                        Nenhum passo para salvar. Capture alguns frames primeiro.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Nome do projeto</label>
                                        <input
                                            type="text"
                                            value={saveName}
                                            onChange={(e) => setSaveName(e.target.value)}
                                            placeholder="Ex: Tutorial Excel - Gráficos"
                                            className="w-full px-4 py-2.5 rounded-lg text-sm"
                                            style={{
                                                backgroundColor: 'var(--input-bg)',
                                                border: '1px solid var(--input-border)',
                                                color: 'var(--text)',
                                            }}
                                        />
                                    </div>

                                    <div
                                        className="p-3 rounded-lg text-sm"
                                        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span style={{ color: 'var(--text-secondary)' }}>Passos a salvar:</span>
                                            <span className="font-medium">{steps.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span style={{ color: 'var(--text-secondary)' }}>Com imagem:</span>
                                            <span className="font-medium">{steps.filter((s) => s.has_image && s.blob).length}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSaveProject}
                                        disabled={saving || !saveName.trim()}
                                        className="cb-btn cb-btn-primary w-full h-11 font-semibold disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {saving ? 'Salvando...' : 'Salvar Projeto'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
