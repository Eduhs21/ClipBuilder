import React from 'react'

export default function VideoArea({ videoUrl, videoRef, canvasRef, onPickVideo, youtubeUrl, setYoutubeUrl, onImportYoutube, youtubeImporting, capturing, aiStatus }) {
  return (
    <div className="w-full max-w-[960px]">
      <div className="mb-4 flex items-center justify-end">
        {aiStatus === 'uploading' || aiStatus === 'processing' ? (
          <div className="cb-badge" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
            <svg className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--spinner)' }} viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>{youtubeImporting ? 'Baixando vídeo...' : 'Processando IA'}</span>
          </div>
        ) : aiStatus === 'ready' ? (
          <div className="cb-badge cb-badge-success">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>IA pronta</span>
          </div>
        ) : aiStatus === 'error' ? (
          <div className="cb-badge cb-badge-error">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>Falha na IA</span>
          </div>
        ) : null}
      </div>

      <div className="aspect-video w-full rounded-xl overflow-hidden relative border" style={{ background: 'var(--panel)', borderColor: 'var(--panel-border)' }}>
        {videoUrl ? (
          <>
            <video key={videoUrl} ref={videoRef} src={videoUrl} controls crossOrigin="anonymous" playsInline preload="auto" className="h-full w-full" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {(aiStatus === 'uploading' || aiStatus === 'processing' || capturing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <svg className="h-10 w-10 animate-spin text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <div className="text-sm font-medium text-white">{capturing ? 'Capturando...' : (youtubeImporting ? 'Baixando vídeo...' : 'IA processando...')}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col h-full w-full">
            {/* YouTube URL - Topo */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--panel-border)' }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true">
                    <path
                      d="M21.8 8.001a2.748 2.748 0 00-1.93-1.945C18.23 5.6 12 5.6 12 5.6s-6.23 0-7.87.456A2.749 2.749 0 002.2 8.001 28.37 28.37 0 001.75 12c-.005 1.341.154 2.68.45 3.999a2.748 2.748 0 001.93 1.945C5.77 18.4 12 18.4 12 18.4s6.23 0 7.87-.456a2.748 2.748 0 001.93-1.945c.296-1.319.455-2.658.45-3.999.005-1.341-.154-2.68-.45-3.999z"
                      fill="currentColor"
                    />
                    <path d="M10 9.75v4.5L14.5 12 10 9.75z" fill="white" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>YouTube</div>
                  <div className="text-xs" style={{ color: 'var(--muted-text)' }}>
                    Cole uma URL de vídeo para carregar automaticamente.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  value={youtubeUrl || ''}
                  onChange={(e) => setYoutubeUrl?.(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="cb-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => onImportYoutube?.()}
                  disabled={!!youtubeImporting}
                  className="cb-btn cb-btn-primary whitespace-nowrap"
                >
                  {youtubeImporting ? 'Importando...' : 'Carregar'}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
                Suporta links curtos e completos do YouTube.
              </p>
            </div>

            {/* Divisor "ou" */}
            <div className="px-4 py-1.5 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--panel-border)' }}></div>
              <span className="text-xs font-medium" style={{ color: 'var(--muted-text)' }}>ou</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--panel-border)' }}></div>
            </div>

            {/* Upload de arquivo - Área central como player */}
            <label className="flex-1 cursor-pointer group">
              <input
                type="file"
                className="hidden"
                accept="video/mp4,video/x-matroska,.mp4,.mkv"
                onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)}
              />
              <div className="h-full flex flex-col items-center justify-center text-center transition-colors hover:bg-[var(--accent-light)]/5">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full transition-colors group-hover:scale-110" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden="true">
                    <path
                      d="M12 3.25a.75.75 0 01.75.75v9.19l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 011.06-1.06l3.22 3.22V4a.75.75 0 01.75-.75z"
                      fill="currentColor"
                    />
                    <path
                      d="M5 15.75a.75.75 0 01.75.75v1.25A1.25 1.25 0 007 19h10a1.25 1.25 0 001.25-1.25V16.5a.75.75 0 011.5 0v1.25A2.75 2.75 0 0117 20.5H7A2.75 2.75 0 014.25 17.75V16.5a.75.75 0 01.75-.75z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>Arraste um arquivo ou clique aqui</div>
                <div className="text-sm" style={{ color: 'var(--muted-text)' }}>Formatos suportados: .mp4, .mkv</div>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
