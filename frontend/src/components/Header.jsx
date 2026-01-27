import React from 'react'
import { Moon, Sun, FileText } from 'lucide-react'

export default function Header({ darkMode, setDarkMode, stepsCount, exportDoc, busy }) {
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-sm bg-opacity-95" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-serif font-semibold" style={{ color: 'var(--text)' }}>ClipBuilder</h1>
            <span className="text-xs font-medium" style={{ color: 'var(--muted-text)' }}>Crie tutoriais com IA</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{stepsCount} {stepsCount === 1 ? 'passo' : 'passos'}</span>
          </div>
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="cb-btn p-2.5"
            aria-label={darkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
            title={darkMode ? 'Modo escuro ativo' : 'Modo claro ativo'}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
