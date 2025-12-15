import React, { useState } from 'react';
import { Upload, Link as LinkIcon, FileText, Loader2, Copy } from 'lucide-react';
import { parseContent } from '../../services/geminiService';
import { NoteContent } from '../../types';

export const Parser: React.FC = () => {
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [inputLink, setInputLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NoteContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // In a real app, backend would scrape the URL. 
      // Here, we simulate or ask Gemini to imagine based on URL/text context, 
      // but strictly we'll treat the link as text input for now or ask for upload.
      if (mode === 'link') {
         // Simulating link parsing delay
         await new Promise(r => setTimeout(r, 1500));
         setError("Demo limitation: Direct URL scraping requires a backend proxy. Please use 'Image/Text' mode and paste the content or upload a screenshot.");
         setLoading(false);
         return;
      }
    } catch (err) {
      setError("Failed to parse content. Please try again.");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await parseContent(undefined, base64);
        setResult(data);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
        setError("AI parsing failed. " + (err instanceof Error ? err.message : ''));
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ScanLineIcon className="w-5 h-5 text-rednote-500" />
          素材提取 / Extract
        </h3>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMode('link')}
            className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors
              ${mode === 'link' ? 'border-rednote-500 bg-rednote-50 text-rednote-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <LinkIcon className="w-4 h-4" /> 链接提取
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors
              ${mode === 'upload' ? 'border-rednote-500 bg-rednote-50 text-rednote-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <Upload className="w-4 h-4" /> 图片/截图上传
          </button>
        </div>

        {mode === 'link' ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="粘贴小红书笔记链接 (e.g. https://www.xiaohongshu.com/...)"
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rednote-500/20 focus:border-rednote-500 transition-all"
              value={inputLink}
              onChange={(e) => setInputLink(e.target.value)}
            />
            <button
              onClick={handleParse}
              disabled={loading || !inputLink}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Parsing...' : '开始提取'}
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-rednote-300 transition-colors bg-gray-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="w-8 h-8 text-rednote-500 animate-spin mb-2" />
                <p className="text-gray-500 text-sm">Gemini 2.5 (NanoBanana) is analyzing...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">点击上传截图</p>
                <p className="text-gray-400 text-sm mb-4">支持 JPG, PNG (Max 5MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Select File
                </label>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-800">解析结果</h3>
            <button className="text-gray-400 hover:text-rednote-500 transition-colors">
              <Copy className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</span>
              <p className="text-lg font-bold text-gray-900 mt-1">{result.title}</p>
            </div>
            
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content</span>
              <div className="bg-gray-50 p-4 rounded-xl mt-1 text-gray-700 leading-relaxed whitespace-pre-wrap">
                {result.content}
              </div>
            </div>

            <div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tags</span>
               <div className="flex flex-wrap gap-2 mt-2">
                 {result.tags.map((tag, idx) => (
                   <span key={idx} className="px-3 py-1 bg-rednote-50 text-rednote-600 rounded-full text-sm font-medium">
                     #{tag}
                   </span>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScanLineIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="14" height="14" x="5" y="5" rx="2"/><path d="M7 12h10"/></svg>
)
