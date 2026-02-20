'use client'
import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { parseVoiceInput } from '@/lib/voice-parser'
import { createTask } from '@/app/actions/tasks'
import type { Task } from '@/types'

interface QueuedTask {
  tempId: string
  name: string
  dueDate: string | null
  forLater: boolean
}

interface VoiceTaskCaptureProps {
  boardId: string | undefined
  onClose: () => void
  onSaved: (tasks: Task[]) => void
}

const STOP_WORDS = new Set(['done', 'stop', 'finish', 'finished', "that's it", "that's all", 'cancel'])

function dateLabel(dueDate: string | null): string {
  if (!dueDate) return 'For Later'
  return format(parseISO(dueDate), 'EEE, MMM d')
}

export function VoiceTaskCapture({ boardId, onClose, onSaved }: VoiceTaskCaptureProps) {
  const [isListening, setIsListening]   = useState(false)
  const [interim, setInterim]           = useState('')
  const [queue, setQueue]               = useState<QueuedTask[]>([])
  const [saving, setSaving]             = useState(false)
  const [supported, setSupported]       = useState(true)
  const recognitionRef                  = useRef<any>(null)
  const keepListeningRef                = useRef(false)

  function buildRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return null }

    const r = new SR()
    r.continuous      = true
    r.interimResults  = true
    r.lang            = 'en-US'

    r.onresult = (event: any) => {
      let interimText = ''
      let finalText   = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText  += t
        else                          interimText += t
      }
      setInterim(interimText)

      if (finalText.trim()) {
        const clean = finalText.trim().toLowerCase().replace(/[.,!?]+$/, '')
        if (STOP_WORDS.has(clean)) { stopListening(); return }

        const parsed = parseVoiceInput(finalText.trim())
        setQueue(prev => [...prev, {
          tempId:   `${Date.now()}-${Math.random()}`,
          name:     parsed.taskName,
          dueDate:  parsed.dueDate,
          forLater: parsed.forLater,
        }])
        setInterim('')
      }
    }

    r.onend = () => {
      // Auto-restart so pauses don't kill the session
      if (keepListeningRef.current) {
        try { r.start() } catch { /* already started */ }
      } else {
        setIsListening(false)
        setInterim('')
      }
    }

    r.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setSupported(false)
        keepListeningRef.current = false
        setIsListening(false)
      }
    }

    return r
  }

  function startListening() {
    const r = buildRecognition()
    if (!r) return
    keepListeningRef.current = true
    recognitionRef.current   = r
    r.start()
    setIsListening(true)
  }

  function stopListening() {
    keepListeningRef.current = false
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterim('')
  }

  // Auto-start on mount, stop on unmount
  useEffect(() => {
    startListening()
    return () => {
      keepListeningRef.current = false
      recognitionRef.current?.stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!queue.length || saving) return
    setSaving(true)
    stopListening()
    const created: Task[] = []
    for (const task of queue) {
      const t = await createTask({
        name:     task.name,
        due_date: task.dueDate,
        details:  null,
        for_later: task.forLater,
        board_id:  boardId ?? null,
      })
      created.push(t)
    }
    onSaved(created)
    onClose()
  }

  return (
    <div
      style={{
        position:      'absolute',
        bottom:        0,
        left:          0,
        right:         0,
        zIndex:        20,
        background:    'white',
        borderRadius:  '20px 20px 0 0',
        boxShadow:     '0 -4px 32px rgba(0,0,0,0.18)',
        padding:       '20px 20px 32px',
        maxHeight:     '65vh',
        display:       'flex',
        flexDirection: 'column',
        gap:           12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width:      40,
            height:     40,
            borderRadius: '50%',
            background: isListening ? '#FF5252' : '#E0E0E0',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize:   18,
            flexShrink: 0,
            animation:  isListening ? 'pulse-ring 1s ease-in-out infinite' : 'none',
          }}>
            🎤
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>
              {isListening ? 'Listening…' : 'Voice capture paused'}
            </p>
            <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
              {isListening
                ? 'Speak tasks naturally · say "done" to stop'
                : 'Press Resume or add tasks below'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: 'none', background: '#F3F4F6',
            cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Close voice capture"
        >
          ×
        </button>
      </div>

      {/* Unsupported warning */}
      {!supported && (
        <p style={{
          fontSize: 13, color: '#EF4444',
          padding: '8px 12px', background: '#FEF2F2',
          borderRadius: 8, margin: 0,
        }}>
          Voice recognition isn't supported in this browser. Try Chrome or Edge.
        </p>
      )}

      {/* Live interim transcript */}
      {interim && (
        <div style={{
          padding:     '10px 14px',
          background:  '#F8F9FA',
          borderRadius: 10,
          border:      '1px dashed #D1D5DB',
          fontSize:    14,
          color:       '#6B7280',
          fontStyle:   'italic',
        }}>
          "{interim}…"
        </div>
      )}

      {/* Queued tasks */}
      {queue.length > 0 ? (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {queue.map(task => (
            <div
              key={task.tempId}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        10,
                padding:    '9px 12px',
                background: '#F9FAFB',
                borderRadius: 10,
                border:     '1px solid #E5E7EB',
              }}
            >
              <span style={{ fontSize: 14, flex: 1, fontWeight: 600, color: '#1A1A2E', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.name}
              </span>
              <span style={{
                fontSize:     11,
                fontWeight:   600,
                padding:      '3px 8px',
                borderRadius: 20,
                background:   task.dueDate ? 'var(--color-upcoming)' : 'var(--color-for-later)',
                color:        '#1A1A2E',
                flexShrink:   0,
                whiteSpace:   'nowrap',
              }}>
                {dateLabel(task.dueDate)}
              </span>
              <button
                onClick={() => setQueue(prev => prev.filter(t => t.tempId !== task.tempId))}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: 'none', background: '#E5E7EB',
                  cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-label="Remove task"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '8px 0', margin: 0 }}>
          {supported ? 'Say something like "meeting on Thursday" or "call dentist next Monday"' : ''}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {isListening ? (
          <button
            onClick={stopListening}
            style={{
              flex: 1, height: 44, borderRadius: 12,
              border: '2px solid #FF5252', background: 'white',
              color: '#FF5252', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={startListening}
            disabled={!supported}
            style={{
              flex: 1, height: 44, borderRadius: 12,
              border: '2px solid var(--color-upcoming)', background: 'white',
              color: '#1A1A2E', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            Resume
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || queue.length === 0}
          style={{
            flex: 2, height: 44, borderRadius: 12, border: 'none',
            background: queue.length > 0 ? 'var(--color-upcoming)' : '#E5E7EB',
            color:      queue.length > 0 ? '#1A1A2E' : '#9CA3AF',
            fontWeight: 700, fontSize: 14,
            cursor: queue.length > 0 && !saving ? 'pointer' : 'default',
          }}
        >
          {saving
            ? 'Saving…'
            : queue.length === 0
              ? 'No tasks yet'
              : `Add ${queue.length} task${queue.length > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
