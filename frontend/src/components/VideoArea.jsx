import React from 'react'

export default function VideoArea({ videoUrl, videoRef, canvasRef, onPickVideo, youtubeUrl, setYoutubeUrl, onImportYoutube, youtubeImporting, capturing, aiStatus, darkMode }) {
  return (
    <div className="w-full max-w-[960px]">
      <div className="w-full max-w-[960px] flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept="video/mp4,video/x-matroska,.mp4,.mkv"
              onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)}
            />
            <div className="rounded-full bg-gray-700 px-4 py-2 text-base font-semibold text-white">Upload</div>
          </label>

          <div className={`px-3 py-2 text-sm rounded ${darkMode ? 'text-white' : 'text-slate-700'}`}>
            {aiStatus === 'uploading' || aiStatus === 'processing' ? (
              <div className="inline-flex items-center gap-2 text-gray-200">
                <svg className="h-4 w-4 animate-spin text-gray-200" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                {youtubeImporting ? 'Baixando vídeo...' : 'Processando IA'}
              </div>
            ) : aiStatus === 'ready' ? (
              <div className="inline-flex items-center gap-2 text-gray-200">IA pronta</div>
            ) : aiStatus === 'error' ? (
              <div className="inline-flex items-center gap-2 text-red-700">Falha na IA</div>
            ) : (
              <div className="text-slate-500">IA: —</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <div className="text-xs" style={{ color: 'var(--muted-text)' }}>
          Importar do YouTube
        </div>
        <div className="flex gap-2">
          <input
            value={youtubeUrl || ''}
            onChange={(e) => setYoutubeUrl?.(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 rounded border px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
          />
          <button
            type="button"
            onClick={() => onImportYoutube?.()}
            disabled={!!youtubeImporting}
            className="rounded border px-4 py-2 text-sm font-semibold"
          >
            {youtubeImporting ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>

      <div className="aspect-video w-full rounded-md overflow-hidden relative" style={{ background: 'var(--panel)' }}>
        {videoUrl ? (
          <>
            <video key={videoUrl} ref={videoRef} src={videoUrl} controls crossOrigin="anonymous" playsInline preload="auto" className="h-full w-full" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {(aiStatus === 'uploading' || aiStatus === 'processing' || capturing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-10 w-10 animate-spin text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <div className="text-sm text-white">{capturing ? 'Capturando...' : (youtubeImporting ? 'Baixando vídeo...' : 'IA processando...')}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-300">Faça upload de um vídeo (.mp4/.mkv)</div>
        )}
      </div>
    </div>
  )
}
