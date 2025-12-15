import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Parser } from './components/tools/Parser';
import { Rewriter } from './components/tools/Rewriter';
import { Audit } from './components/tools/Audit';
import { Designer } from './components/tools/Designer';
import { Workflow } from './components/tools/Workflow';
import { Loader2, KeyRound } from 'lucide-react';

const ApiKeyGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // Priority 1: Check if env var is already populated (e.g. from .env or previous selection)
      if (process.env.API_KEY) {
        setHasKey(true);
        return;
      }

      // Priority 2: Check AI Studio integration
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback: If no aistudio and no env var, then no key
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        // Assume success if promise resolves, or wait for re-render if env updates
        setHasKey(true);
      } catch (e) {
        console.error("Key selection failed/cancelled", e);
      }
    }
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-rednote-500 animate-spin" />
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center">
           <div className="w-16 h-16 bg-rednote-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <KeyRound className="w-8 h-8 text-rednote-500" />
           </div>
           <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Required</h1>
           <p className="text-gray-500 mb-8 leading-relaxed">
             Please connect your Google API Key to continue.
           </p>
           
           <button 
             onClick={handleSelectKey}
             className="w-full bg-rednote-500 text-white font-bold py-4 rounded-xl hover:bg-rednote-600 transition-all shadow-lg shadow-rednote-500/20 flex items-center justify-center gap-2 active:scale-95"
           >
             Connect API Key
           </button>
           
           <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-400 text-left">
             <p className="font-bold text-gray-500 mb-1">Note:</p>
             <p>A free API key (Gemini 2.5 Flash) is sufficient for all features.</p>
           </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ApiKeyGuard>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="parser" element={<Parser />} />
            <Route path="rewriter" element={<Rewriter />} />
            <Route path="audit" element={<Audit />} />
            <Route path="designer" element={<Designer />} />
            <Route path="workflow" element={<Workflow />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ApiKeyGuard>
  );
};

export default App;