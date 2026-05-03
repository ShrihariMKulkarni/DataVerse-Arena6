import React from 'react'
import { useToast } from '../context/ToastContext'

export default function Toast() {
  const { toasts, removeToast } = useToast()

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: '◈',
  }

  if (!toasts.length) return null

  return (
    <div className="cyber-toast">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-item ${t.type}`}
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                {icons[t.type] || icons.info}
              </span>
              <div>
                <div className="text-[0.6rem] cyber-heading text-cyber-muted mb-0.5">
                  SYSTEM{t.type === 'error' ? ' ERROR' : t.type === 'success' ? ' OK' : t.type === 'warning' ? ' WARN' : ' MSG'}
                </div>
                <div className="text-cyber-text leading-snug">{t.message}</div>
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-cyber-muted hover:text-cyber-cyan transition-colors flex-shrink-0 text-xs mt-0.5"
            >✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
