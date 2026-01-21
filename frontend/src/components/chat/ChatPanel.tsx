import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Send, Trash2, Bot, User, Loader2 } from 'lucide-react'
import { sendChatMessage, clearConversation, type ChatMessage } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      sendChatMessage(message, conversationId || undefined, true),
    onSuccess: (data) => {
      setConversationId(data.conversation_id)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
        },
      ])
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
          timestamp: new Date().toISOString(),
        },
      ])
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => {
      if (conversationId) {
        return clearConversation(conversationId)
      }
      return Promise.resolve({ message: 'No conversation to clear' })
    },
    onSuccess: () => {
      setMessages([])
      setConversationId(null)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || chatMutation.isPending) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    chatMutation.mutate(input.trim())
    setInput('')
  }

  const handleClear = () => {
    clearMutation.mutate()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface border-l border-border shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-text">Pulse AI</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={clearMutation.isPending || messages.length === 0}
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-muted py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Ask me about cluster health, jobs, alerts, or performance
              optimization.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-text-muted">Try asking:</p>
              <div className="space-y-1">
                {[
                  'What is the current cluster status?',
                  'Why is GPU node-1 showing high temperature?',
                  'How can I optimize pending jobs?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="block w-full text-left text-xs px-3 py-2 rounded bg-background hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-background text-text'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-info" />
                </div>
              )}
            </div>
          ))
        )}
        {chatMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-background rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about cluster health..."
            className="flex-1 px-4 py-2 rounded-lg bg-background border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={chatMutation.isPending}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || chatMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
