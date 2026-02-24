'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, X, Send, Loader2, Sparkles, TrendingUp, Clock, Target } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface UserContext {
  totalSessions: number
  averageScore: number
}

// Gợi ý nhanh bằng tiếng Việt
const QUICK_SUGGESTIONS = [
  { icon: Target, text: "Điểm tập trung của tôi?" },
  { icon: Clock, text: "Nên học lúc mấy giờ?" },
  { icon: TrendingUp, text: "Cách cải thiện focus?" },
  { icon: Sparkles, text: "Lập lịch học cho tôi" },
]

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Xin chào! Tôi là trợ lý AI của FocusMate. Tôi có thể phân tích dữ liệu tập trung của bạn và đưa ra gợi ý cá nhân hóa. Hãy hỏi tôi về điểm tập trung, thời gian học tối ưu, hoặc cách cải thiện năng suất nhé!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Reset chat khi widget đóng (không lưu history)
  useEffect(() => {
    if (!isOpen) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Xin chào! Tôi là trợ lý AI của FocusMate. Tôi có thể phân tích dữ liệu tập trung của bạn và đưa ra gợi ý cá nhân hóa. Hãy hỏi tôi về điểm tập trung, thời gian học tối ưu, hoặc cách cải thiện năng suất nhé!",
          timestamp: new Date(),
        },
      ])
      setUserContext(null)
    }
  }, [isOpen])

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    if (!messageText) setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok) {
        throw new Error('Không nhận được phản hồi')
      }

      const data = await response.json()

      // Cập nhật context người dùng nếu có
      if (data.context) {
        setUserContext(data.context)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không nhận được phản hồi từ trợ lý',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-80 md:w-96 shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-1.5 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">Trợ lý FocusMate</CardTitle>
                {userContext && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {userContext.totalSessions} phiên
                    </Badge>
                    {userContext.averageScore > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        TB: {userContext.averageScore}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80 px-4" ref={scrollRef}>
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs text-muted-foreground">Đang phân tích dữ liệu...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Gợi ý nhanh */}
            {!isLoading && messages.length <= 2 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">Gợi ý nhanh:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2 py-0"
                      onClick={() => handleSuggestionClick(suggestion.text)}
                    >
                      <suggestion.icon className="h-3 w-3 mr-1" />
                      {suggestion.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 border-t p-4">
              <Input
                placeholder="Hỏi về dữ liệu tập trung của bạn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                size="icon"
                disabled={isLoading || !input.trim()}
                onClick={() => handleSend()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
