import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  ShieldCheck,
  Bot,
  User,
  AlertTriangle,
  Lightbulb,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { securityAssistantApi } from '../../api/featureApis';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const SecurityAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextSummary, setContextSummary] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialQuickPrompts = [
    'Explain my recent login activity',
    'Do I have any active security alerts?',
    'How do passkeys protect me from phishing?',
    'Give me top recommendations to protect my account',
  ];

  useEffect(() => {
    // Load context telemetry
    securityAssistantApi
      .getContext()
      .then((res) => {
        if (res.success) setContextSummary(res.summary);
      })
      .catch(() => {});

    // Initial greeting message
    setMessages([
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Hello ${user?.fullName || 'there'}! I am your **SecurePulse AI Security Assistant**.\n\nI continuously analyze your account telemetry, active sessions, and risk scores to provide actionable cybersecurity guidance. Ask me anything about your login history, active alerts, or account hardening.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await securityAssistantApi.chat(text);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: res.reply || 'I analyzed your request. Your account remains under active protection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content:
          '⚠️ I encountered a temporary network glitch while synthesizing your security analysis. Your authentication and credentials remain 100% safe.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                AI Security Assistant
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Online
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Personalized cybersecurity intelligence and real-time activity explanations
              </p>
            </div>
          </div>

          {contextSummary && (
            <div className="flex items-center gap-3 bg-white dark:bg-cyber-surface px-4 py-2 rounded-xl border border-gray-200 dark:border-cyber-border text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {contextSummary.activeSessions} Active Session(s)
                </span>
                <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {contextSummary.unreadAlerts} Unread Alert(s)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl flex flex-col h-[600px] shadow-sm overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isAi = m.role === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
                    isAi
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl p-4 text-sm leading-relaxed ${
                    isAi
                      ? 'bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border text-gray-800 dark:text-gray-200 shadow-sm'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div
                    className={`text-[10px] mt-2 font-mono ${
                      isAi ? 'text-gray-400 dark:text-gray-500' : 'text-emerald-100/80 text-right'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-2xl mr-auto items-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border rounded-2xl px-4 py-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                Analyzing security telemetry and synthesizing response...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-cyber-border/60 bg-gray-50/50 dark:bg-cyber-card/30 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Suggested:
          </span>
          {initialQuickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={loading}
              className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border hover:border-emerald-500 dark:hover:border-emerald-500 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about your login activity, alerts, or cybersecurity..."
              disabled={loading}
              className="flex-1 bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
            Private & Authorized: Assistant accesses only your account metrics. Plaintext passwords, hashes, and OTPs are strictly confidential.
          </div>
        </div>
      </div>
    </div>
  );
};

