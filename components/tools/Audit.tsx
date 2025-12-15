import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { auditContent } from '../../services/geminiService';
import { AuditResult } from '../../types';

export const Audit: React.FC = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAudit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const data = await auditContent(text);
      setResult(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rednote-500" />
          违禁词检测 / Sensitivity Audit
        </h3>
        <textarea
          className="w-full h-40 p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rednote-500/20 focus:border-rednote-500 transition-all resize-none mb-4"
          placeholder="输入标题和正文进行检测..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            onClick={handleAudit}
            disabled={loading || !text}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            开始检测
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Score Card */}
          <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
             <div className="relative w-32 h-32 flex items-center justify-center mb-4">
               <svg className="transform -rotate-90 w-32 h-32">
                 <circle cx="64" cy="64" r="60" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                 <circle cx="64" cy="64" r="60" stroke={result.score > 80 ? '#22c55e' : '#ef4444'} strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * result.score) / 100} className="transition-all duration-1000" />
               </svg>
               <span className="absolute text-3xl font-bold text-gray-800">{result.score}</span>
             </div>
             <p className="font-medium text-gray-600">Safety Score</p>
             <div className="mt-2 text-sm text-gray-400">
               {result.hasSensitiveWords ? 'Risks Detected' : 'Safe to Post'}
             </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-4">检测详情</h4>
            {result.hasSensitiveWords ? (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-gray-700 leading-relaxed"
                     dangerouslySetInnerHTML={{ __html: result.highlightedText }} />
                
                <div className="mt-4 space-y-3">
                  {result.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-800 text-sm">
                          Detected: <span className="text-red-500">"{issue.word}"</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{issue.reason}</p>
                        <p className="text-xs text-green-600 mt-1 font-medium">Suggest: {issue.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p>未发现违规敏感词</p>
                <p className="text-sm opacity-60">符合小红书社区规范</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
