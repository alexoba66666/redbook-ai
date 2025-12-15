import React, { useState } from 'react';
import { PenTool, Wand2, Copy, Check } from 'lucide-react';
import { generateVariations } from '../../services/geminiService';
import { RewrittenVersion, NoteContent } from '../../types';

export const Rewriter: React.FC = () => {
  const [originalText, setOriginalText] = useState('');
  const [variations, setVariations] = useState<RewrittenVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleRewrite = async () => {
    if (!originalText.trim()) return;
    setLoading(true);
    setVariations([]);

    try {
      // Mocking a structured input for the API
      const input: NoteContent = {
        title: "User Input",
        content: originalText,
        tags: []
      };
      
      const results = await generateVariations(input, 3);
      setVariations(results);
    } catch (error) {
      console.error(error);
      alert("Error generating variations. Check API Key.");
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
      {/* Input Section */}
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <PenTool className="w-4 h-4" /> 原文输入
          </h3>
          <span className="text-xs text-gray-400">{originalText.length} chars</span>
        </div>
        <textarea
          className="flex-1 p-6 resize-none focus:outline-none text-gray-700 leading-relaxed"
          placeholder="在此输入或粘贴需要改写的文案..."
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
        />
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleRewrite}
            disabled={loading || !originalText}
            className="w-full bg-rednote-500 hover:bg-rednote-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-rednote-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Wand2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wand2 className="w-5 h-5" />
            )}
            AI 智能裂变 (生成3个版本)
          </button>
        </div>
      </div>

      {/* Output Section */}
      <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-2">
        {loading && variations.length === 0 && (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="text-center">
              <div className="w-3 h-3 bg-rednote-400 rounded-full animate-bounce inline-block mx-1"></div>
              <div className="w-3 h-3 bg-rednote-500 rounded-full animate-bounce inline-block mx-1 delay-100"></div>
              <div className="w-3 h-3 bg-rednote-600 rounded-full animate-bounce inline-block mx-1 delay-200"></div>
              <p className="text-gray-400 mt-4 font-medium">Writing viral copy...</p>
            </div>
          </div>
        )}

        {variations.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:border-rednote-200 transition-all">
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-bold px-2 py-1 bg-rednote-50 text-rednote-600 rounded uppercase tracking-wider">
                {v.style} Style
              </span>
              <button
                onClick={() => copyToClipboard(`${v.title}\n\n${v.content}\n\n${v.tags.map(t=>`#${t}`).join(' ')}`, v.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {copiedId === v.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="p-6">
              <h4 className="font-bold text-lg text-gray-900 mb-3">{v.title}</h4>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed mb-4 text-sm">
                {v.content}
              </p>
              <div className="flex flex-wrap gap-2">
                {v.tags.map((tag, i) => (
                  <span key={i} className="text-blue-500 text-sm hover:underline">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {!loading && variations.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
             <PenTool className="w-12 h-12 mb-4 opacity-20" />
             <p>改写结果将显示在这里</p>
          </div>
        )}
      </div>
    </div>
  );
};
