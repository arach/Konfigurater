import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Send, Loader2, Copy } from 'lucide-react';
import { type Rule } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: KeySuggestion[];
}

interface KeySuggestion {
  combination: string;
  description: string;
  reasoning: string;
}

interface ChatAssistantProps {
  rules: Rule[];
  onCreateRule?: (suggestion: KeySuggestion) => void;
}

export default function ChatAssistant({ rules, onCreateRule }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your keyboard shortcut assistant. I can help you find available key combinations that aren't already used in your configuration. Just tell me what command or action you want to map, and I'll suggest some options!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async ({ message, rules }: { message: string; rules: Rule[] }) => {
      const response = await apiRequest({
        endpoint: '/api/chat/suggest-keys',
        method: 'POST',
        body: { message, rules }
      });
      return response;
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: "Failed to get suggestions. Please try again.",
        variant: "destructive"
      });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');

    chatMutation.mutate({ message: currentInput, rules });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Key combination copied to clipboard"
    });
  };

  const handleCreateRule = (suggestion: KeySuggestion) => {
    if (onCreateRule) {
      onCreateRule(suggestion);
      toast({
        title: "Rule Created",
        description: `Added new rule for ${suggestion.combination}`
      });
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-96 shadow-xl border-0 flex flex-col">
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-medium">Shortcut Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-blue-700 h-8 w-8 p-0"
        >
          ×
        </Button>
      </div>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-white p-2 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                            {suggestion.combination}
                          </code>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyToClipboard(suggestion.combination)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            {onCreateRule && (
                              <Button
                                size="sm"
                                onClick={() => handleCreateRule(suggestion)}
                                className="h-6 px-2 text-xs"
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">{suggestion.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{suggestion.reasoning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-800 p-3 rounded-lg text-sm flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What command do you want to map?"
              className="flex-1"
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={chatMutation.isPending || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}