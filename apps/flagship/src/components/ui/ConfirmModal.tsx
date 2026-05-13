import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  expectedConfirmationText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  description, 
  expectedConfirmationText = "CONFIRM",
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const isMatch = input === expectedConfirmationText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#12121a] border border-red-900/50 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 bg-red-950/20">
          <div className="flex items-center gap-3 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-semibold tracking-wide">{title}</h2>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            {description}
          </p>
          
          <div className="space-y-2 pt-4">
            <label className="text-xs font-mono text-gray-500 uppercase">
              Type <span className="text-red-400 font-bold">{expectedConfirmationText}</span> to proceed
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 font-mono"
              placeholder={expectedConfirmationText}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800/60 bg-[#0d0d12]">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (isMatch) {
                onConfirm();
                setInput('');
              }
            }}
            disabled={!isMatch}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Execute Action
          </button>
        </div>
      </div>
    </div>
  );
}
