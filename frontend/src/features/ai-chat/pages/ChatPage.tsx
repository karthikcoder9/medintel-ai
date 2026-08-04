import React, { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Volume2, Plus, ExternalLink, Bot, User, AlertCircle, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { chatService } from '@/services/api'
import { useTranslation } from '@/i18n/i18nContext'
import type { ChatMessage, Conversation, Citation } from '@/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useLocation } from 'react-router-dom'

export default function ChatPage() {
  const location = useLocation()
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const qc = useQueryClient()
  const hasAutoSentRef = useRef(false)

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.getConversations(),
    select: (res) => (res.data ?? []) as Conversation[],
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMutation = useMutation({
    mutationFn: ({ msg, convId }: { msg: string; convId?: string }) =>
      chatService.sendMessage(msg, convId),
    onMutate: ({ msg }) => {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: msg,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsTyping(true)
      setMessage('')
    },
    onSuccess: (res) => {
      setIsTyping(false)
      if (res.success && res.data) {
        if (!activeConversationId) setActiveConversationId(res.data.conversation_id)
        const assistantMsg: ChatMessage = {
          id: res.data.message_id,
          role: 'assistant',
          content: res.data.response,
          citations: res.data.citations,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        qc.invalidateQueries({ queryKey: ['conversations'] })
      }
    },
    onError: () => {
      setIsTyping(false)
      toast.error('AI response failed. Please try again.')
    },
  })

  useEffect(() => {
    const initMsg = location.state?.initialMessage
    if (initMsg && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true
      sendMutation.mutate({ msg: initMsg })
    }
  }, [location.state])

  const handleSend = () => {
    if (!message.trim()) return
    sendMutation.mutate({ msg: message.trim(), convId: activeConversationId ?? undefined })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const loadConversation = async (id: string) => {
    setActiveConversationId(id)
    const res = await chatService.getMessages(id)
    if (res.success && res.data) setMessages(res.data)
  }

  const newConversation = () => {
    setActiveConversationId(null)
    setMessages([])
  }

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          setIsRecording(true)
          toast.success('Listening... Speak now 🎙️')
        }

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join('')
          setMessage(transcript)
        }

        recognition.onerror = () => {
          setIsRecording(false)
          toast.error('Voice recognition error. Please try again.')
        }

        recognition.onend = () => {
          setIsRecording(false)
        }

        recognition.start()
        setMediaRecorder(recognition)
      } catch {
        toast.error('Could not access microphone speech recognition.')
      }
    } else {
      toast.error('Browser voice recognition not supported. Please type your message.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && (mediaRecorder as any).stop) {
      (mediaRecorder as any).stop()
    }
    setMediaRecorder(null)
    setIsRecording(false)
  }

  const playTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''))
      utterance.rate = 0.95 // Slightly slower for elderly comprehension
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
      toast.success('Playing audio explanation 🔊')
    } else {
      toast.error('Browser voice synthesis is not supported.')
    }
  }

  return (
    <div className="page-container" style={{ paddingBottom: 0, height: '100%' }}>
      <div className="chat-layout">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>Conversations</h3>
            <button className="btn btn-primary btn-sm" onClick={newConversation} id="new-chat-btn">
              <Plus size={16} /> New Chat
            </button>
          </div>
          <div className="conv-list">
            {(conversations ?? []).map((c) => (
              <button
                key={c.id}
                className={`conv-item ${activeConversationId === c.id ? 'active' : ''}`}
                onClick={() => loadConversation(c.id)}
              >
                <Bot size={16} style={{ flexShrink: 0, color: 'var(--color-primary-light)' }} />
                <div className="conv-item-text">
                  <div className="conv-item-title">{c.title || 'New Conversation'}</div>
                  <div className="conv-item-time">{new Date(c.last_message_at).toLocaleDateString()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="chat-container" style={{ flex: 1 }}>
          <div className="chat-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="chat-avatar"><Bot size={20} color="white" /></div>
              <div>
                <div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>MedIntel AI Assistant</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
                  Online • RAG-powered
                </div>
              </div>
            </div>
            <div className="disclaimer-banner" style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}>
              <AlertCircle size={14} /> Not a medical diagnosis tool
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome glass-panel" style={{ borderRadius: 'var(--radius-xl)' }}>
                <div className="chat-welcome-icon pulse-ring"><Bot size={36} color="white" /></div>
                <h3>{t('aiChatAssistant', "Hello! I'm your Medication Assistant")}</h3>
                <p>{t('aiChatDesc', "Ask me anything about your medicines. I'll explain them in simple, friendly language.")}</p>
                <div className="chat-suggestions">
                  {['What does Metformin do?', 'What are the side effects of Aspirin?', 'Can I take Lisinopril with food?'].map(q => (
                    <button key={q} className="suggestion-chip card-hover-effect"
                      onClick={() => sendMutation.mutate({ msg: q, convId: activeConversationId ?? undefined })}>
                      <Sparkles size={12} color="var(--color-primary-light)" /> {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id} className={`message-row ${msg.role === 'user' ? 'message-row-user' : 'message-row-assistant'}`}>
                {msg.role === 'assistant' && (
                  <div className="msg-avatar assistant-avatar pulse-ring"><Bot size={16} /></div>
                )}
                <div>
                  <div className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-assistant glass-panel'}`}
                    style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {(msg.citations ?? []).map((c: Citation, ci) => (
                        <a key={ci} href={c.url ?? '#'} target="_blank" rel="noopener noreferrer"
                          className="citation-chip">
                          <ExternalLink size={10} /> {c.source}
                        </a>
                      ))}
                      <button className="citation-chip" onClick={() => playTTS(msg.content)}>
                        <Volume2 size={10} /> Listen
                      </button>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="msg-avatar user-avatar"><User size={16} /></div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="message-row message-row-assistant">
                <div className="msg-avatar assistant-avatar"><Bot size={16} /></div>
                <div className="message-bubble message-assistant message-assistant-typing">
                  <div className="typing-dot" /> <div className="typing-dot" /> <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={t('askAboutMedicine', 'Ask about your medicine... (e.g. What does Aspirin do?)')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-label="Chat message input"
            />
            <button
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
            </button>
            <button
              className="btn btn-primary btn-icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              aria-label="Send message"
              id="chat-send-btn"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .chat-layout {
          display: flex;
          gap: var(--space-6);
          height: calc(100vh - var(--header-height) - var(--space-8) - var(--space-8));
        }
        .chat-sidebar {
          width: 260px; flex-shrink: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .chat-sidebar-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--space-4); border-bottom: 1px solid var(--border-subtle);
        }
        .conv-list { flex: 1; overflow-y: auto; padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); }
        .conv-item {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-3); border-radius: var(--radius-lg);
          background: none; border: 1px solid transparent;
          cursor: pointer; text-align: left; transition: all var(--transition-fast); width: 100%;
        }
        .conv-item:hover { background: var(--bg-elevated); }
        .conv-item.active { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); }
        .conv-item-text { flex: 1; min-width: 0; }
        .conv-item-title { font-size: var(--text-sm); font-weight: var(--fw-medium); color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-item-time { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }

        .chat-header-bar {
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--border-subtle);
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg-surface);
        }
        .chat-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-glow-primary);
        }

        .chat-welcome {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: var(--space-4); text-align: center;
          padding: var(--space-8);
        }
        .chat-welcome-icon {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-glow-primary);
        }
        .chat-welcome h3 { font-size: var(--text-xl); color: var(--text-primary); }
        .chat-welcome p { color: var(--text-secondary); max-width: 400px; }
        .chat-suggestions { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; }
        .suggestion-chip {
          background: var(--bg-elevated); border: 1px solid var(--border-default);
          border-radius: var(--radius-full); padding: 8px 16px;
          font-size: var(--text-sm); color: var(--text-secondary); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .suggestion-chip:hover { background: var(--color-primary-glow); border-color: var(--border-primary); color: var(--color-primary-light); }

        .message-row { display: flex; align-items: flex-end; gap: var(--space-2); }
        .message-row-user { flex-direction: row-reverse; }
        .message-row-assistant { flex-direction: row; }
        .msg-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-bottom: 4px;
        }
        .assistant-avatar { background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: white; }
        .user-avatar { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); }

        @media (max-width: 768px) {
          .chat-sidebar { display: none; }
          .chat-layout { height: calc(100vh - var(--header-height) - var(--space-4)); }
        }
      `}</style>
    </div>
  )
}
