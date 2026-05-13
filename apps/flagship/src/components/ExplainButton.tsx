import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
import Markdown from 'react-markdown';

interface ExplainButtonProps {
  context: string;
  data: any;
  className?: string;
}

export function ExplainButton({ context, data, className = '' }: ExplainButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    setIsOpen(true);
    if (explanation) return; // Already loaded

    setIsLoading(true);
    setError(null);
    try {
      const result = await api.post<{ explanation: string }>('/explain', { context, data });
      setExplanation(result.explanation);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExplain}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded border border-blue-500/20 transition-colors ${className}`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Explain this
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#12121a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0d0d12]">
              <div className="flex items-center gap-2 text-blue-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-medium text-sm">AI Explanation</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 text-sm text-gray-300">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-gray-500 animate-pulse">Analyzing context...</p>
                </div>
              ) : error ? (
                <div className="text-red-400 p-3 bg-red-500/10 border border-red-500/20 rounded text-center">
                  {error}
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800">
                  <Markdown>{explanation || ''}</Markdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
