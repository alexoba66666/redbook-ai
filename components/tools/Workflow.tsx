import React, { useState } from 'react';
import { 
  Sparkles, 
  Loader2, 
  RefreshCw, 
  Download, 
  Image as ImageIcon,
  Copy,
  Check,
  Zap,
  LayoutTemplate,
  PlusCircle,
  Save
} from 'lucide-react';
import { NoteContent, BatchResult } from '../../types';
import { generateBatchNotes, generateCoverImage } from '../../services/geminiService';
import { saveNoteToStorage } from '../../utils/storage';
import JSZip from 'jszip'; // Imported via Import Map in index.html

export const Workflow: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [historyTitles, setHistoryTitles] = useState<string[]>([]);
  const [batchCount, setBatchCount] = useState(0);

  const processBatch = async (currentTopic: string, isNextBatch: boolean = false) => {
    if (!currentTopic.trim()) return;
    
    setIsProcessing(true);
    // If not adding next batch, clear previous results
    if (!isNextBatch) {
      setResults([]);
      setHistoryTitles([]);
      setBatchCount(0);
    }
    
    setStatusMessage("Analyzing trends & Generating 5 viral angles with Private Traffic Hook...");

    try {
      // 1. Generate Text Content Batch (passing history to avoid dupes)
      const notes = await generateBatchNotes(currentTopic, isNextBatch ? historyTitles : []);
      
      // Update history
      const newTitles = notes.map(n => n.title);
      setHistoryTitles(prev => [...prev, ...newTitles]);

      // Initialize results with text
      // We start IDs based on current length to keep keys unique
      const startId = isNextBatch ? results.length : 0;
      const initialResults: BatchResult[] = notes.map((note, index) => ({
        id: startId + index,
        status: 'generating_image',
        note: note
      }));

      // If next batch, append. If new topic, replace.
      if (isNextBatch) {
        setResults(prev => [...prev, ...initialResults]);
      } else {
        setResults(initialResults);
      }

      setStatusMessage("Generating visual assets with NanoBanana (Gemini 2.5 Flash Image)...");

      // 2. Generate Images in Parallel for the NEW items only
      const imagePromises = initialResults.map(async (res) => {
        try {
          if (!res.note.imagePrompt) return;
          
          const base64 = await generateCoverImage(res.note.imagePrompt);
          
          setResults(prev => prev.map(p => 
            p.id === res.id 
              ? { ...p, status: 'completed', coverImageBase64: base64 } 
              : p
          ));
        } catch (e) {
          console.error(`Image gen failed for ${res.id}`, e);
          setResults(prev => prev.map(p => 
            p.id === res.id 
              ? { ...p, status: 'error' } 
              : p
          ));
        }
      });

      await Promise.all(imagePromises);
      setStatusMessage("Batch production complete!");
      setBatchCount(prev => prev + 1);

    } catch (error) {
      console.error(error);
      setStatusMessage("Error during generation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 bg-rednote-50 px-4 py-2 rounded-full border border-rednote-100">
           <Zap className="w-4 h-4 text-rednote-500 fill-current" />
           <span className="text-sm font-bold text-rednote-700">Powered by Gemini 2.5 Pro & NanoBanana</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">批量爆款笔记工厂</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          输入一个选题，AI将自动完成：<br/>
          <span className="font-bold text-gray-700">趋势分析 → 5篇差异化文案(含私域引流) → 自动配图 → 自动打包</span>
        </p>

        <div className="max-w-2xl mx-auto flex gap-3 mt-8">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="输入核心关键词 (e.g. '夏日美白饮品', '新手健身计划')..."
            className="flex-1 p-4 rounded-2xl border border-gray-200 shadow-sm focus:ring-4 focus:ring-rednote-500/10 focus:border-rednote-500 outline-none text-lg transition-all"
            disabled={isProcessing}
            onKeyDown={(e) => e.key === 'Enter' && processBatch(topic, false)}
          />
          <button
            onClick={() => processBatch(topic, false)}
            disabled={isProcessing || !topic}
            className="bg-gray-900 text-white px-8 rounded-2xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            {isProcessing && batchCount === 0 ? <Loader2 className="animate-spin" /> : <Sparkles />}
            生成5篇
          </button>
        </div>
        
        {statusMessage && (
           <p className={`text-sm font-medium animate-pulse ${isProcessing ? 'text-rednote-500' : 'text-green-600'}`}>
             {statusMessage}
           </p>
        )}
      </div>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-fade-in-up">
            {results.map((res) => (
              <NoteCard key={res.id} data={res} />
            ))}
          </div>
          
          {/* Load More Button */}
          <div className="flex justify-center pt-8 border-t border-gray-100">
             <button
                onClick={() => processBatch(topic, true)}
                disabled={isProcessing}
                className="group flex items-center gap-3 px-8 py-4 bg-rednote-50 text-rednote-600 rounded-full font-bold hover:bg-rednote-100 transition-all border border-rednote-200 shadow-sm"
             >
                {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                再来 5 篇 (不重复 & 高质量)
             </button>
          </div>
        </div>
      )}

      {!isProcessing && results.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400">
          <LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Results will appear here</p>
        </div>
      )}
    </div>
  );
};

const NoteCard: React.FC<{ data: BatchResult }> = ({ data }) => {
  const { note, status, coverImageBase64 } = data;
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    const fullText = `${note.title}\n\n${note.content}\n\n${note.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (saved) return;
    const success = saveNoteToStorage(note, coverImageBase64);
    if (success) {
        setSaved(true);
        // Optional: Show toast
    } else {
        alert("保存失败，空间可能已满");
    }
  };

  const handleDownload = async () => {
    if (!coverImageBase64) return;
    setDownloading(true);
    
    try {
        const zip = new JSZip();
        // 1. Add Text File
        const textContent = `TITLE: ${note.title}\n\nCONTENT:\n${note.content}\n\nTAGS:\n${note.tags.map(t => `#${t}`).join(' ')}\n\nIMAGE PROMPT:\n${note.imagePrompt}`;
        zip.file("note_content.txt", textContent);

        // 2. Add Image File (Base64 -> Blob)
        zip.file("cover_image.png", coverImageBase64, {base64: true});

        // 3. Generate Zip
        const content = await zip.generateAsync({type:"blob"});
        
        // 4. Trigger Download
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RedNote_${note.title.substring(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        console.error("Download failed", e);
        alert("打包下载失败");
    } finally {
        setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-[600px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative">
      
      {/* Visual Part (Cover) */}
      <div className="relative h-64 bg-gray-100 overflow-hidden shrink-0">
        {status === 'generating_image' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
             <Loader2 className="w-8 h-8 animate-spin mb-2 text-rednote-400" />
             <span className="text-xs">NanoBanana Generating...</span>
          </div>
        ) : coverImageBase64 ? (
          <div className="relative h-full w-full">
            <img 
              src={`data:image/png;base64,${coverImageBase64}`} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
            {/* Overlay Title for "Auto Layout" simulation */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white font-bold text-sm leading-tight line-clamp-2 shadow-sm">{note.title}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Content Part */}
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-sm">{note.title}</h3>
        
        <div className="flex-1 overflow-y-auto pr-1 mb-3 scrollbar-hide">
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {note.content}
          </p>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap gap-1 h-6 overflow-hidden">
            {note.tags.map((tag, i) => (
              <span key={i} className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
          
          <div className="flex gap-2 pt-3 border-t border-gray-100">
             <button 
               onClick={handleSave}
               disabled={saved}
               className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 active:scale-95 ${saved ? 'bg-green-50 text-green-600' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
             >
               {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
               {saved ? 'Saved' : 'Save'}
             </button>
             <button 
               onClick={handleDownload}
               disabled={!coverImageBase64 || downloading}
               className="flex-1 bg-rednote-50 text-rednote-600 py-2 rounded-lg text-xs font-bold hover:bg-rednote-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 active:scale-95"
             >
               {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
               Zip
             </button>
             <button 
               onClick={handleCopy}
               className="w-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200"
             >
               {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}