import React from 'react'

export default function Header({ darkMode, setDarkMode, stepsCount, exportDoc, busy }) {
  return (
    <header className={`border`} style={{ backgroundColor: darkMode ? '#2b2b2b' : undefined, borderColor: darkMode ? '#444' : undefined }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">DocuVideo</div>
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="ml-2 rounded px-2 py-1 text-xs border"
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
        <div className="text-sm text-slate-400 flex items-center gap-4">
          <div>{stepsCount} passos</div>
          <button
            className="rounded-md border border-gray-500 text-white px-3 py-1 text-sm font-semibold"
            onClick={exportDoc}
            disabled={busy || stepsCount === 0}
          >
            {busy ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </div>
    </header>
  )
}
