import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Trash2, 
  Download, 
  FileText, 
  CheckSquare, 
  Square,
  Search,
  Calendar,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { SavedNote } from '../types';
import { getSavedNotes, deleteNotesFromStorage } from '../utils/storage';
import JSZip from 'jszip';

export const Dashboard: React.FC = () => {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    const data = getSavedNotes();
    setNotes(data);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotes.length && filteredNotes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 篇笔记吗?`)) {
      const remaining = deleteNotesFromStorage(Array.from(selectedIds));
      setNotes(remaining);
      setSelectedIds(new Set());
    }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const folderName = `RedNote_Batch_${new Date().toISOString().slice(0,10)}`;
      const rootFolder = zip.folder(folderName);

      const targets = notes.filter(n => selectedIds.has(n.id));

      targets.forEach((note) => {
        // Sanitize filename
        const safeTitle = note.title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').substring(0, 20);
        const noteFolder = rootFolder?.folder(safeTitle);

        if (noteFolder) {
          // Content
          const contentText = `TITLE: ${note.title}\n\nCONTENT:\n${note.content}\n\nTAGS:\n${note.tags.map(t => `#${t}`).join(' ')}\n\nPROMPT:\n${note.imagePrompt || ''}`;
          noteFolder.file("content.txt", contentText);

          // Image
          if (note.coverImageBase64) {
            noteFolder.file("cover.png", note.coverImageBase64, { base64: true });
          }
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (e) {
      console.error(e);
      alert("批量下载失败");
    } finally {
      setIsDownloading(false);
    }
  };

  // Stats
  const totalNotes = notes.length;
  const todayCount = notes.filter(n => {
    const d = new Date(n.createdAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  }).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-rednote-500 to-rednote-600 rounded-2xl p-6 text-white shadow-lg shadow-rednote-500/20">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-rednote-100 font-medium mb-1">Total Notes</p>
               <h2 className="text-4xl font-bold">{totalNotes}</h2>
             </div>
             <div className="bg-white/20 p-2 rounded-lg">
               <FileText className="w-6 h-6 text-white" />
             </div>
           </div>
           <p className="mt-4 text-sm text-rednote-100 opacity-90">
             Stored in local workspace
           </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-gray-500 font-medium mb-1">Created Today</p>
               <h2 className="text-4xl font-bold text-gray-900">{todayCount}</h2>
             </div>
             <div className="bg-green-50 p-2 rounded-lg">
               <Zap className="w-6 h-6 text-green-500" />
             </div>
           </div>
           <p className="mt-4 text-sm text-green-600 font-medium">
             Active production
           </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center items-start">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Quick Actions</h3>
            <Link 
              to="/workflow" 
              className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              New Batch (5 Notes)
            </Link>
        </div>
      </div>

      {/* Management Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sticky top-20 z-10 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-2 py-1 rounded transition-colors"
            >
               {selectedIds.size > 0 && selectedIds.size === filteredNotes.length ? (
                 <CheckSquare className="w-5 h-5 text-rednote-500" />
               ) : (
                 <Square className="w-5 h-5 text-gray-400" />
               )}
               Select All
            </button>
            <span className="h-6 w-px bg-gray-200"></span>
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
         </div>

         <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
               <input 
                 type="text" 
                 placeholder="Search titles or tags..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rednote-500/20"
               />
            </div>
            {selectedIds.size > 0 && (
              <>
                <button 
                  onClick={handleBatchDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-rednote-50 text-rednote-600 rounded-xl font-bold hover:bg-rednote-100 transition-colors"
                >
                   {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                   Download ({selectedIds.size})
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                   <Trash2 className="w-4 h-4" />
                   Delete
                </button>
              </>
            )}
         </div>
      </div>

      {/* Content Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
           <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
             <FileText className="w-8 h-8" />
           </div>
           <p className="text-gray-500 font-medium">No notes found.</p>
           {searchQuery ? (
             <button onClick={() => setSearchQuery('')} className="text-rednote-500 mt-2 font-bold text-sm">Clear Search</button>
           ) : (
             <Link to="/workflow" className="text-rednote-500 mt-2 font-bold text-sm">Go create some!</Link>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredNotes.map((note) => (
            <div 
              key={note.id}
              className={`
                group relative bg-white rounded-xl overflow-hidden border transition-all duration-200
                ${selectedIds.has(note.id) ? 'border-rednote-500 ring-2 ring-rednote-500/20 shadow-lg' : 'border-gray-200 shadow-sm hover:shadow-md'}
              `}
              onClick={() => toggleSelect(note.id)}
            >
              {/* Image Aspect */}
              <div className="aspect-[3/4] bg-gray-100 relative">
                {note.coverImageBase64 ? (
                  <img src={`data:image/png;base64,${note.coverImageBase64}`} alt={note.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                
                {/* Overlay Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                   <div className={`
                     w-6 h-6 rounded-md flex items-center justify-center transition-all
                     ${selectedIds.has(note.id) ? 'bg-rednote-500 text-white shadow-md' : 'bg-white/80 text-transparent border border-gray-200 group-hover:border-gray-400'}
                   `}>
                     <CheckSquare className="w-4 h-4" />
                   </div>
                </div>
                
                {/* Date Badge */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <span className="text-[10px] text-white/90 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3" />
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight mb-2 h-10">
                  {note.title}
                </h4>
                <div className="flex flex-wrap gap-1 h-5 overflow-hidden">
                   {note.tags.slice(0, 3).map((t, i) => (
                     <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">#{t}</span>
                   ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};