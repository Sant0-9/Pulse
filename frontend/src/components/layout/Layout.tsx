import { useState } from 'react'
import { Outlet } from 'react-router'
import { MessageSquare } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'

export function Layout() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>

      {/* Chat toggle button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
        title="Open AI Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Overlay when chat is open */}
      {isChatOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsChatOpen(false)}
        />
      )}
    </div>
  )
}
