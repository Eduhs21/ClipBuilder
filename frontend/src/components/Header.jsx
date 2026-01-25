import React from 'react'

export default function Header({ darkMode, setDarkMode, stepsCount, exportDoc, busy }) {
  return (
    <header className={`border`} style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">ClipBuilder</div>
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="ml-2 cb-btn"
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
        <div className="text-sm flex items-center gap-4" style={{ color: 'var(--muted-text)' }}>
          <div>{stepsCount} passos</div>
        </div>
      </div>
    </header>
  )
}
