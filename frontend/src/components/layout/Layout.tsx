import { useState } from 'react'
import { Outlet } from 'react-router'
import { MessageSquare } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'

export function Layout() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main className="ml-56 min-h-screen">
        <div className="p-6 max-w-[1800px]">
          <Outlet />
        </div>
      </main>

      {/* Chat toggle button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-5 right-5 w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
        title="Open AI Assistant"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Chat panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Overlay when chat is open */}
      {isChatOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsChatOpen(false)}
        />
      )}
    </div>
  )
}
