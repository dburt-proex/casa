import React, { useState } from 'react';
import { Terminal } from 'lucide-react';
import { api } from '../../lib/api';
import { ChatMessage } from '../../types';
import { cn } from '../../lib/utils';

export function OperatorChat() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const data = await api.post<{reply: string}>('/chat', { message: userMsg });
      setHistory(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err: any) {
      setHistory(prev => [...prev, { role: 'assistant', text: `[SYSTEM ERROR] ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-[#12121a] border border-gray-800/60 rounded-xl overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
            <Terminal className="w-12 h-12 opacity-20" />
            <p className="text-sm font-mono">CASA Operator Assistant initialized. Awaiting query.</p>
          </div>
        ) : (
          history.map((msg, i) => (
            <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-blue-600/20 text-blue-100 border border-blue-500/30" 
                  : "bg-gray-800/40 text-gray-300 border border-gray-700/50 font-mono"
              )}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl px-5 py-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-[#0d0d12] border-t border-gray-800/60">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Query CASA policies, request analysis, or ask for boundary stress metrics..."
            className="w-full bg-[#1a1a24] border border-gray-700/50 rounded-lg pl-4 pr-12 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
