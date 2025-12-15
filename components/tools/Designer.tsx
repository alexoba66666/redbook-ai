import React, { useState, useRef } from 'react';
import { 
  Layout, 
  Image as ImageIcon, 
  Type, 
  Download, 
  Camera, 
  Upload, 
  Loader2, 
  Sparkles,
  Grid,
  MessageCircle,
  ArrowUp,
  Smile,
  CheckCircle2,
  Trash2,
  Play,
  CheckSquare,
  Square,
  Scan,
  Zap,
  ArrowRight
} from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { generateProductShot, upscaleImage } from '../../services/geminiService';

type Mode = 'cover' | 'studio' | 'upscale';
type CoverStyle = 'big_char' | 'emotion' | 'two_line' | 'split' | 'chat' | 'collection';

interface TemplateConfig {
  id: CoverStyle;
  name: string;
  icon: any;
  desc: string;
}

const templates: TemplateConfig[] = [
  { id: 'big_char', name: '大字报体', icon: Type, desc: '醒目大字，强力吸睛' },
  { id: 'emotion', name: '情绪表情体', icon: Smile, desc: '表情包+文案，引发共鸣' },
  { id: 'two_line', name: '双行法', icon: Layout, desc: '上引人好奇，下详细说明' },
  { id: 'split', name: '上下排列法', icon: ArrowUp, desc: '上标题，下核心图' },
  { id: 'chat', name: '对话聊天体', icon: MessageCircle, desc: '真实对话，增加信任感' },
  { id: 'collection', name: '产品合集体', icon: Grid, desc: '多图拼贴，种草合集' },
];

const PRESET_ANGLES = [
  'Front View (正视图)', 
  'Top Down Flatlay (俯拍平铺)', 
  '45° Isometric (45度侧拍)', 
  'Close-up Detail (细节特写)', 
  'Held in Hand (手持展示)', 
  'Lifestyle Scene (生活场景)'
];

// Helper: Calculate the closest supported Gemini aspect ratio from the input image
const getImageAspectRatio = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      // Supported Gemini aspect ratios
      const targets = [
        { id: "1:1", val: 1 },
        { id: "3:4", val: 0.75 },
        { id: "4:3", val: 1.333 },
        { id: "9:16", val: 0.5625 },
        { id: "16:9", val: 1.777 }
      ];
      
      let closest = targets[0];
      let minDiff = Math.abs(ratio - closest.val);
      
      for (let i = 1; i < targets.length; i++) {
        const diff = Math.abs(ratio - targets[i].val);
        if (diff < minDiff) {
          minDiff = diff;
          closest = targets[i];
        }
      }
      resolve(closest.id);
    };
    img.onerror = () => resolve("1:1"); // Fallback
    img.src = dataUrl;
  });
};

export const Designer: React.FC = () => {
  const [mode, setMode] = useState<Mode>('cover');
  
  // Cover State
  const [activeStyle, setActiveStyle] = useState<CoverStyle>('big_char');
  const [title, setTitle] = useState('这是主标题');
  const [subtitle, setSubtitle] = useState('这是副标题或详细说明');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [collectionImages, setCollectionImages] = useState<(string | null)[]>([null, null, null, null]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Studio State
  const [productImage, setProductImage] = useState<string | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['Front View (正视图)']);
  const [customContext, setCustomContext] = useState('一张高端的棚拍照片，[产品]位于中心。来自大型柔光箱的柔和漫射光在表面创造出温柔的渐变。无缝的、中性的米色到奶油色的渐变背景平滑过渡。极简构图，线条干净。主体的自然纹理非常清晰。柔和、复杂的单色调配色。哈苏拍摄');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<{url: string, angle: string}[]>([]);
  const [selectedResultIndices, setSelectedResultIndices] = useState<Set<number>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  // Upscale State
  const [upscaleInput, setUpscaleInput] = useState<string | null>(null);
  const [upscaleTextHint, setUpscaleTextHint] = useState<string>(''); // NEW: For Text Hints
  const [upscaleResult, setUpscaleResult] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);

  // Handlers
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setBgImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCollectionUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = (ev) => {
          const newImages = [...collectionImages];
          newImages[index] = ev.target?.result as string;
          setCollectionImages(newImages);
       };
       reader.readAsDataURL(file);
     }
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(previewRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `RedNote_Cover_${activeStyle}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("下载失败");
    }
    setIsDownloading(false);
  };

  const toggleAngle = (angle: string) => {
    if (selectedAngles.includes(angle)) {
      setSelectedAngles(prev => prev.filter(a => a !== angle));
    } else {
      setSelectedAngles(prev => [...prev, angle]);
    }
  };

  const handleBatchGenerate = async () => {
    if (!productImage || selectedAngles.length === 0) return;
    setIsGenerating(true);
    
    try {
      const base64 = productImage.split(',')[1];
      
      const promises = selectedAngles.map(async (angle) => {
        const fullPrompt = `${angle}. ${customContext}`;
        try {
          const resultBase64 = await generateProductShot(base64, fullPrompt);
          return {
            status: 'fulfilled',
            angle: angle,
            url: `data:image/png;base64,${resultBase64}`
          };
        } catch (e) {
          console.error(`Failed to generate ${angle}`, e);
          return { status: 'rejected', angle };
        }
      });

      const results = await Promise.all(promises);
      
      const successfulImages = results
        .filter((r): r is { status: string, angle: string, url: string } => r.status === 'fulfilled')
        .map(r => ({ url: r.url, angle: r.angle }));
      
      if (successfulImages.length === 0 && results.length > 0) {
        alert("生成失败，请检查网络或更换图片重试");
      }

      setGeneratedResults(prev => [...successfulImages, ...prev]);

    } catch (e) {
      console.error(e);
      alert("批量生成过程中出现错误");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearResults = () => {
    if(confirm("确定清空所有生成的图片吗？")) {
      setGeneratedResults([]);
      setSelectedResultIndices(new Set());
    }
  };

  const toggleResultSelection = (index: number) => {
    const newSet = new Set(selectedResultIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedResultIndices(newSet);
  };

  const toggleSelectAllResults = () => {
    if (selectedResultIndices.size === generatedResults.length) {
      setSelectedResultIndices(new Set());
    } else {
      const allIndices = generatedResults.map((_, i) => i);
      setSelectedResultIndices(new Set(allIndices));
    }
  };

  const handleBatchDownloadResults = async () => {
    if (selectedResultIndices.size === 0) return;
    setIsBatchDownloading(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder("Product_Shots");

      selectedResultIndices.forEach((index) => {
        const item = generatedResults[index];
        if (item) {
          const base64Data = item.url.split(',')[1];
          const safeAngle = item.angle.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
          folder?.file(`${safeAngle}_${index}.png`, base64Data, { base64: true });
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RedNote_Studio_Batch_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (e) {
      console.error(e);
      alert("批量下载失败");
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleUpscale = async () => {
    if (!upscaleInput) return;
    setIsUpscaling(true);
    setUpscaleResult(null);
    try {
      const base64 = upscaleInput.split(',')[1];
      
      // Calculate closest supported aspect ratio to avoid distortion
      const ratio = await getImageAspectRatio(upscaleInput);
      console.log("Upscaling with aspect ratio:", ratio);
      
      // Pass the text context to the service
      const result = await upscaleImage(base64, ratio, upscaleTextHint);
      setUpscaleResult(`data:image/png;base64,${result}`);
    } catch (e: any) {
      console.error(e);
      // Improved error message feedback
      const msg = e.message || "Unknown error";
      if (msg.includes("403")) {
        alert("Permission Denied (403): Ensure your API Key is valid. 'Gemini 2.5 Flash' should be free, but check your project settings.");
      } else {
        alert(`Upscaling failed: ${msg}`);
      }
    } finally {
      setIsUpscaling(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px] overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex justify-center mb-6 shrink-0">
        <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm">
          <button 
            onClick={() => setMode('cover')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${mode === 'cover' ? 'bg-rednote-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Layout className="w-4 h-4" /> 爆款封面设计
          </button>
          <button 
            onClick={() => setMode('studio')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${mode === 'studio' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Camera className="w-4 h-4" /> AI 产品棚拍
          </button>
          <button 
            onClick={() => setMode('upscale')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${mode === 'upscale' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Scan className="w-4 h-4" /> AI 画质超清化
          </button>
        </div>
      </div>

      {mode === 'cover' ? (
        <div className="flex flex-1 gap-8 overflow-hidden">
          {/* Cover Controls */}
          <div className="w-96 flex flex-col gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto">
            
            {/* Template Grid */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">选择版式 / Template</label>
              <div className="grid grid-cols-2 gap-3">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveStyle(t.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all hover:bg-gray-50 flex flex-col gap-2
                      ${activeStyle === t.id ? 'border-rednote-500 bg-rednote-50 ring-1 ring-rednote-500/20' : 'border-gray-100 text-gray-600'}
                    `}
                  >
                    <t.icon className={`w-5 h-5 ${activeStyle === t.id ? 'text-rednote-500' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-bold text-sm">{t.name}</div>
                      <div className="text-[10px] opacity-70 leading-tight mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Inputs */}
            <div className="space-y-4 border-t border-gray-100 pt-6">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">内容编辑 / Content</label>
              
              <div>
                 <label className="text-xs text-gray-500 mb-1 block">Main Title</label>
                 <input 
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:border-rednote-500 outline-none"
                   placeholder="输入主标题..."
                 />
              </div>

              {activeStyle !== 'big_char' && (
                <div>
                   <label className="text-xs text-gray-500 mb-1 block">Subtitle / Detail</label>
                   <textarea 
                     value={subtitle}
                     onChange={(e) => setSubtitle(e.target.value)}
                     className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:border-rednote-500 outline-none h-20 resize-none"
                     placeholder="输入副标题或详细文案..."
                   />
                </div>
              )}

              {/* Image Upload Logic */}
              {activeStyle === 'collection' ? (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Upload 4 Images</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map(idx => (
                      <div key={idx} className="relative aspect-square bg-gray-50 rounded-lg border border-dashed border-gray-300 hover:border-rednote-400 overflow-hidden">
                        {collectionImages[idx] ? (
                           <img src={collectionImages[idx]!} className="w-full h-full object-cover" />
                        ) : (
                           <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                             <Upload className="w-5 h-5" />
                           </div>
                        )}
                        <input type="file" onChange={(e) => handleCollectionUpload(idx, e)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                   <label className="text-xs text-gray-500 mb-2 block">Background Image</label>
                   <div className="relative h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 hover:border-rednote-400 flex flex-col items-center justify-center text-gray-400 transition-colors overflow-hidden group">
                      {bgImage ? (
                        <>
                          <img src={bgImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Change</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-xs">Click to upload</span>
                        </>
                      )}
                      <input type="file" onChange={handleBgUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                   </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="mt-auto w-full bg-rednote-500 text-white py-3 rounded-xl font-bold hover:bg-rednote-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rednote-500/20 active:scale-95"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              下载封面 (PNG)
            </button>
          </div>

          {/* Canvas Preview Area */}
          <div className="flex-1 bg-gray-100 rounded-2xl flex items-center justify-center overflow-auto p-8 relative border border-gray-200">
             <div className="relative shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
               {/* THE CANVAS */}
               <div 
                 ref={previewRef}
                 className="w-[375px] h-[500px] bg-white overflow-hidden relative flex flex-col"
                 style={{ 
                   backgroundImage: activeStyle !== 'collection' && activeStyle !== 'split' && bgImage ? `url(${bgImage})` : 'none',
                   backgroundSize: 'cover',
                   backgroundPosition: 'center'
                 }}
               >
                 {/* Default placeholder bg if no image */}
                 {activeStyle !== 'collection' && activeStyle !== 'split' && !bgImage && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-300">
                       <ImageIcon className="w-20 h-20 opacity-20" />
                    </div>
                 )}

                 {/* 1. Big Char Style */}
                 {activeStyle === 'big_char' && (
                    <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center p-6 text-center">
                       <h1 className="text-6xl font-black text-yellow-400 tracking-tighter leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] stroke-text">
                         {title.slice(0, 4)}<br/>{title.slice(4)}
                       </h1>
                       <div className="mt-6 bg-rednote-600 text-white px-4 py-1 text-xl font-bold -rotate-2 shadow-lg">
                         {subtitle || 'CLICK ME'}
                       </div>
                    </div>
                 )}

                 {/* 2. Emotion Style */}
                 {activeStyle === 'emotion' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                        <div className="absolute top-10 right-6 text-8xl animate-bounce drop-shadow-lg">😭</div>
                        <h1 className="text-4xl font-black text-white mb-2 drop-shadow-md">
                          {title}
                        </h1>
                        <p className="text-yellow-300 font-bold text-lg bg-black/40 inline-block px-2 rounded backdrop-blur-sm">
                          {subtitle}
                        </p>
                    </div>
                 )}

                 {/* 3. Two Line Style */}
                 {activeStyle === 'two_line' && (
                    <div className="absolute top-10 left-0 right-0 px-6">
                       <div className="bg-white/95 backdrop-blur shadow-xl rounded-xl p-5 border-l-8 border-rednote-500">
                          <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">{title}</h2>
                          <div className="h-px bg-gray-200 w-full mb-2"></div>
                          <p className="text-gray-600 text-sm font-medium">{subtitle}</p>
                       </div>
                    </div>
                 )}

                 {/* 4. Split Style */}
                 {activeStyle === 'split' && (
                    <div className="h-full flex flex-col">
                       <div className="h-[35%] bg-rednote-500 flex flex-col justify-center px-6 text-white relative overflow-hidden">
                          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full"></div>
                          <h1 className="text-3xl font-black leading-tight mb-2 relative z-10">{title}</h1>
                          <p className="text-rednote-100 text-sm font-medium relative z-10">{subtitle}</p>
                       </div>
                       <div className="h-[65%] bg-gray-200 relative">
                          {bgImage ? (
                            <img src={bgImage} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              Image Area
                            </div>
                          )}
                       </div>
                    </div>
                 )}

                 {/* 5. Chat Style */}
                 {activeStyle === 'chat' && (
                    <>
                      <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>
                      <div className="absolute inset-0 flex flex-col justify-center p-6 space-y-4">
                         <div className="self-start bg-white rounded-2xl rounded-tl-none p-4 shadow-lg max-w-[85%] animate-fade-in-up">
                            <p className="font-bold text-gray-800 text-lg">🤔 {title}?</p>
                         </div>
                         <div className="self-end bg-green-500 text-white rounded-2xl rounded-tr-none p-4 shadow-lg max-w-[85%] animate-fade-in-up delay-100">
                            <p className="font-bold text-lg">✅ {subtitle}!</p>
                         </div>
                         <div className="self-start bg-white rounded-2xl rounded-tl-none p-4 shadow-lg max-w-[85%] animate-fade-in-up delay-200">
                            <p className="text-gray-600 font-medium">真的太好用了，集美们冲鸭！🔥</p>
                         </div>
                      </div>
                    </>
                 )}

                 {/* 6. Collection Style */}
                 {activeStyle === 'collection' && (
                    <div className="h-full p-3 bg-white flex flex-col">
                       <h1 className="text-center font-black text-xl mb-3 text-gray-900 bg-yellow-300 inline-block self-center px-4 py-1 skew-x-[-10deg]">
                         {title}
                       </h1>
                       <div className="flex-1 grid grid-cols-2 gap-2">
                          {collectionImages.map((img, i) => (
                            <div key={i} className="bg-gray-100 rounded-lg overflow-hidden relative">
                               {img ? (
                                 <img src={img} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Slot {i+1}</div>
                               )}
                               <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded">Top {i+1}</div>
                            </div>
                          ))}
                       </div>
                       <p className="text-center text-gray-500 text-xs mt-3 font-medium">{subtitle}</p>
                    </div>
                 )}

                 {/* Watermark/Footer */}
                 <div className="absolute bottom-3 right-3 opacity-50">
                    <span className="text-[10px] text-white font-bold drop-shadow-md">@RedNote_Ops</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      ) : mode === 'studio' ? (
        // ================== STUDIO MODE ==================
        <div className="flex flex-1 gap-8 p-6 max-w-6xl mx-auto w-full overflow-hidden">
           <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
              
              {/* Execution Button - Moved Top */}
              <button
                onClick={handleBatchGenerate}
                disabled={isGenerating || !productImage || selectedAngles.length === 0}
                className="w-full bg-rednote-500 text-white py-4 rounded-xl font-bold hover:bg-rednote-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rednote-500/20 text-lg group active:scale-95 shrink-0"
              >
                {isGenerating ? (
                   <>
                     <Loader2 className="w-5 h-5 animate-spin" />
                     正在生产中...
                   </>
                ) : (
                   <>
                     <Play className="w-5 h-5 fill-current" />
                     开始批量生产 ({selectedAngles.length})
                   </>
                )}
              </button>

              {/* 1. Upload Product */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 shrink-0">
                 <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <div className="bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</div>
                   上传产品图 / Upload Product
                 </h3>
                 
                 <div className="relative aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-900 transition-colors flex flex-col items-center justify-center overflow-hidden group">
                    {productImage ? (
                      <div className="relative w-full h-full">
                         <img src={productImage} className="w-full h-full object-contain p-4" />
                         <button 
                           onClick={() => setProductImage(null)}
                           className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:text-red-500"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 pointer-events-none">
                        <Upload className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-sm font-medium">点击上传产品原图</p>
                      </div>
                    )}
                    {!productImage && (
                      <input type="file" onChange={(e) => {
                         const f = e.target.files?.[0];
                         if(f) {
                           const r = new FileReader();
                           r.onload = (ev) => setProductImage(ev.target?.result as string);
                           r.readAsDataURL(f);
                         }
                      }} className="absolute inset-0 opacity-0 cursor-pointer" />
                    )}
                 </div>
              </div>

              {/* 2. Select Angles */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
                 <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <div className="bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</div>
                   选择拍摄角度 (多选) / Select Angles
                 </h3>
                 <div className="grid grid-cols-2 gap-2 mb-4">
                    {PRESET_ANGLES.map(a => {
                      const isSelected = selectedAngles.includes(a);
                      return (
                        <button 
                          key={a}
                          onClick={() => toggleAngle(a)}
                          className={`text-xs p-3 rounded-lg border transition-all flex flex-col gap-1 items-start text-left
                            ${isSelected 
                              ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-[1.02]' 
                              : 'bg-white border-gray-200 hover:border-gray-400 text-gray-600'
                            }`}
                        >
                          <span className="font-bold">{a.split('(')[0]}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                             {a.split('(')[1].replace(')', '')}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3 h-3 absolute top-2 right-2 text-green-400" />}
                        </button>
                      )
                    })}
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">通用提示词 / Common Prompt</label>
                    <textarea 
                        value={customContext}
                        onChange={(e) => setCustomContext(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-200 text-sm h-32 resize-none focus:ring-2 focus:ring-gray-900/20 outline-none leading-relaxed"
                        placeholder="例如：白色极简背景，自然光，高级感..."
                    />
                 </div>
                 
                 <p className="text-center text-xs text-gray-400 mt-3">
                   Powered by NanoBanana Image Model
                 </p>
              </div>
           </div>

           {/* Results Area */}
           <div className="w-2/3 bg-gray-50 rounded-2xl border border-gray-200 p-6 overflow-y-auto flex flex-col">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-gray-700 flex items-center gap-2">
                     <ImageIcon className="w-5 h-5" />
                     生成结果 / Gallery ({generatedResults.length})
                   </h3>
                   {generatedResults.length > 0 && (
                     <button onClick={clearResults} className="text-xs text-red-500 hover:underline">Clear All</button>
                   )}
                </div>
                
                {generatedResults.length > 0 && (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 shadow-sm animate-fade-in">
                     <button onClick={toggleSelectAllResults} className="flex items-center gap-2 text-xs font-bold text-gray-600 px-2 hover:text-gray-900">
                        {selectedResultIndices.size === generatedResults.length && generatedResults.length > 0 
                          ? <CheckSquare className="w-4 h-4 text-rednote-500"/> 
                          : <Square className="w-4 h-4 text-gray-400"/>
                        }
                        全选 / Select All
                     </button>
                     
                     <button 
                       onClick={handleBatchDownloadResults}
                       disabled={selectedResultIndices.size === 0 || isBatchDownloading}
                       className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${selectedResultIndices.size > 0 ? 'bg-rednote-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                     >
                       {isBatchDownloading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3"/>}
                       下载选中 ({selectedResultIndices.size})
                     </button>
                  </div>
                )}
              </div>

              {generatedResults.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl m-4">
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                     <Camera className="w-10 h-10 opacity-20" />
                   </div>
                   <p className="font-medium">暂无生成图片</p>
                   <p className="text-sm opacity-60 mt-1">请在左侧上传产品并选择角度，点击“开始批量生产”</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedResults.map((item, i) => (
                    <div 
                      key={i} 
                      className={`group relative rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all border cursor-pointer animate-fade-in-up
                        ${selectedResultIndices.has(i) ? 'border-rednote-500 ring-2 ring-rednote-500/20' : 'border-gray-100'}
                      `}
                      onClick={() => toggleResultSelection(i)}
                    >
                       {/* Selection Checkbox */}
                       <div className="absolute top-2 left-2 z-10">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-sm backdrop-blur-sm
                             ${selectedResultIndices.has(i) ? 'bg-rednote-500 text-white' : 'bg-white/60 hover:bg-white text-transparent border border-gray-200'}
                          `}>
                             <CheckCircle2 className="w-4 h-4" />
                          </div>
                       </div>

                       <div className="aspect-[3/4] relative">
                         <img src={item.url} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                            <a 
                              href={item.url} 
                              download={`RedNote_Studio_${item.angle.split(' ')[0]}_${i}.png`} 
                              className="p-3 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform shadow-lg"
                              title="Download Single"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="w-5 h-5" />
                            </a>
                         </div>
                       </div>
                       <div className="p-3">
                          <p className="text-xs font-bold text-gray-700 truncate" title={item.angle}>{item.angle}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">AI Generated</p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      ) : (
         // ================== UPSCALE MODE ==================
         <div className="flex flex-1 gap-8 p-6 max-w-6xl mx-auto w-full overflow-hidden">
             {/* Left: Input */}
             <div className="w-1/3 flex flex-col gap-6">
                <button
                  onClick={handleUpscale}
                  disabled={isUpscaling || !upscaleInput}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-lg group active:scale-95 shrink-0"
                >
                  {isUpscaling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在增强中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      开始 AI 超清化
                    </>
                  )}
                </button>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</div>
                    上传原图 / Upload Original
                  </h3>

                  <div className="relative flex-1 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-600 transition-colors flex flex-col items-center justify-center overflow-hidden group mb-4">
                     {upscaleInput ? (
                       <div className="relative w-full h-full">
                          <img src={upscaleInput} className="w-full h-full object-contain p-4" />
                          <button 
                            onClick={() => setUpscaleInput(null)}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     ) : (
                       <div className="text-center text-gray-400 pointer-events-none p-4">
                         <Upload className="w-10 h-10 mx-auto mb-2" />
                         <p className="text-sm font-medium">点击上传图片 (JPG/PNG)</p>
                         <p className="text-xs mt-2 opacity-60">支持模糊、低清图片</p>
                       </div>
                     )}
                     {!upscaleInput && (
                       <input type="file" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if(f) {
                            const r = new FileReader();
                            r.onload = (ev) => setUpscaleInput(ev.target?.result as string);
                            r.readAsDataURL(f);
                          }
                       }} className="absolute inset-0 opacity-0 cursor-pointer" />
                     )}
                  </div>
                  
                  {/* Text Hint Input */}
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">图片内文字内容 (强制修正) / Text Override</label>
                      <textarea 
                        value={upscaleTextHint}
                        onChange={(e) => setUpscaleTextHint(e.target.value)}
                        className="w-full p-3 rounded-lg border border-indigo-200 text-sm h-20 resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed bg-indigo-50/30 font-mono"
                        placeholder="[重要] 请输入图片中的准确汉字。例如：'小红书运营指南'。AI 将强制使用此内容重建文字，防止乱码。"
                      />
                      <p className="text-[10px] text-indigo-500/80">
                        * 准确填写文字可显著防止汉字变形
                      </p>
                   </div>

                </div>
             </div>

             {/* Right: Result */}
             <div className="flex-1 bg-gray-900 rounded-2xl p-6 flex flex-col shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bg-black/20 p-4 flex justify-between items-center z-10 backdrop-blur-sm">
                   <h3 className="text-white font-bold flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-yellow-400" />
                     处理结果 / Enhanced Result
                   </h3>
                   {upscaleResult && (
                     <a href={upscaleResult} download={`RedNote_Upscale_HD_${Date.now()}.png`} className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 flex items-center gap-2 transition-colors">
                       <Download className="w-3 h-3" />
                       Download HD
                     </a>
                   )}
                </div>

                <div className="flex-1 flex items-center justify-center p-4 pt-16">
                   {upscaleResult ? (
                     <div className="relative w-full h-full flex items-center justify-center animate-fade-in">
                       <img src={upscaleResult} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                       <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                         Resolution: High Definition
                       </div>
                     </div>
                   ) : (
                     <div className="text-center text-gray-600">
                        {isUpscaling ? (
                           <div className="flex flex-col items-center">
                             <div className="relative">
                               <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                               <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-xs font-bold text-indigo-500">HD</span>
                               </div>
                             </div>
                             <p className="mt-4 text-gray-400 font-medium">Reconstructing Details...</p>
                             <p className="text-xs text-gray-600 mt-1">Applying Strict Color & Text Filters</p>
                           </div>
                        ) : (
                           <>
                             <Scan className="w-16 h-16 mx-auto mb-4 opacity-20" />
                             <p>Waiting for input...</p>
                           </>
                        )}
                     </div>
                   )}
                </div>
             </div>
         </div>
      )}
    </div>
  );
};
