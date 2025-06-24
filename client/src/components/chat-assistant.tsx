import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Send, Loader2, Copy, Trash2 } from "lucide-react";
import { type Rule } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
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
  configuration?: Configuration | null;
  exportJsonData?: any;
  originalConfiguration?: any;
  onCreateRule?: (suggestion: KeySuggestion) => void;
  onCreateRuleFromJson?: (jsonRule: any) => void;
}

export default function ChatAssistant({ 
  rules, 
  configuration, 
  exportJsonData, 
  originalConfiguration,
  onCreateRule,
  onCreateRuleFromJson
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your keyboard shortcut assistant. I can help you find available key combinations that aren't already used in your configuration. Just tell me what command or action you want to map, and I'll suggest some options!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async ({
      message,
      rules,
      conversationHistory,
    }: {
      message: string;
      rules: Rule[];
      conversationHistory?: any[];
    }) => {
      const response = await fetch("/api/chat/suggest-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message, 
          rules, 
          conversationHistory,
          currentConfiguration: exportJsonData,
          originalConfiguration: originalConfiguration || configuration?.data,
          configurationId: configuration?.id
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get suggestions");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: "Failed to get suggestions. Please try again.",
        variant: "destructive",
      });
    },
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
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");

    // Include conversation history for better context
    const conversationHistory = [...messages, userMessage].slice(-10); // Keep last 10 messages for context

    chatMutation.mutate({
      message: currentInput,
      rules,
      conversationHistory: conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Key combination copied to clipboard",
    });
  };

  const handleCreateRule = (suggestion: KeySuggestion) => {
    if (onCreateRule) {
      onCreateRule(suggestion);
      toast({
        title: "Rule Created",
        description: `Added new rule for ${suggestion.combination}`,
      });
    }
  };

  const handleCreateRuleFromJson = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      
      // Handle full configuration with rules array
      if (parsed.rules && Array.isArray(parsed.rules)) {
        parsed.rules.forEach((rule: any) => {
          onCreateRuleFromJson?.(rule);
        });
        toast({
          title: "Rules Added",
          description: `Added ${parsed.rules.length} rule(s) from configuration`
        });
      }
      // Handle single rule with manipulators
      else if (parsed.manipulators) {
        onCreateRuleFromJson?.(parsed);
        toast({
          title: "Rule Added",
          description: `Added rule: ${parsed.description}`
        });
      }
      // Handle single manipulator
      else if (parsed.type === 'basic' && parsed.from && parsed.to) {
        const rule = {
          description: parsed.description || "Chat-generated rule",
          manipulators: [parsed]
        };
        onCreateRuleFromJson?.(rule);
        toast({
          title: "Rule Added", 
          description: "Added rule from chat suggestion"
        });
      } else {
        toast({
          title: "Invalid JSON",
          description: "JSON doesn't contain valid Karabiner rules or manipulators",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Failed to parse JSON rule",
        variant: "destructive"
      });
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hi! I'm your keyboard shortcut assistant. I can help you find key combinations that aren't already used in your configuration and also help you map keys more efficiently. Just tell me what command or action you want to map, and I'll suggest some options!",
        timestamp: new Date(),
      },
    ]);
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
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-xl border flex flex-col z-50">
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4" />
          <h3 className="font-medium text-sm">Shortcut Assistant</h3>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-white hover:bg-blue-700 h-6 w-6 p-0"
            title="Clear chat"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700 h-6 w-6 p-0 text-lg"
          >
            ×
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-2 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {typeof message.content === 'string' ? (
                    message.content.split("```").map((part, index) => {
                      if (index % 2 === 1) {
                        // This is a code block
                        const code = part.replace(/^json\n/, "");
                        return (
                          <div key={index} className="relative my-2">
                            <pre className="bg-slate-800 text-green-400 p-3 rounded text-xs overflow-x-auto font-mono">
                              <code>{code}</code>
                            </pre>
                            <div className="absolute top-2 right-2 flex space-x-1">
                              <button
                                onClick={() => handleCopyToClipboard(code)}
                                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                              >
                                Copy
                              </button>
                              {onCreateRuleFromJson && (code.includes('"manipulators"') || (code.includes('"type": "basic"') && code.includes('"from"'))) && (
                                <button
                                  onClick={() => handleCreateRuleFromJson(code)}
                                  className="p-1 rounded bg-green-700 hover:bg-green-600 text-white text-xs"
                                >
                                  Add Rule
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                      // Regular text
                      return <span key={index}>{part}</span>;
                    })
                  ) : (
                    <div className="text-slate-600 text-sm font-mono bg-slate-50 p-2 rounded">
                      <pre>{JSON.stringify(message.content, null, 2)}</pre>
                    </div>
                  )}
                </div>

                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="bg-white p-2 rounded border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-800">
                            {suggestion.combination}
                          </code>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleCopyToClipboard(suggestion.combination)
                              }
                              className="h-5 w-5 p-0 text-slate-600 hover:text-slate-800"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            {onCreateRule && (
                              <Button
                                size="sm"
                                onClick={() => handleCreateRule(suggestion)}
                                className="h-5 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">
                          {suggestion.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-800 p-2 rounded-lg text-sm flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-3 flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  chatMutation.isPending
                    ? "Thinking..."
                    : "Ask about key mappings..."
                }
                className="flex-1 text-sm"
                disabled={chatMutation.isPending}
                autoFocus={isOpen}
              />
              <Button
                type="submit"
                disabled={chatMutation.isPending || !input.trim()}
                size="sm"
                className="px-3"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Ask about key mappings or follow-up questions
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
