import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Settings2, Sparkles, Video, 
  Loader2, Download,
  Bot, X, AlertCircle, Plus,
  RefreshCw, Edit, Maximize2, Minimize2, Check,
  Square, CheckSquare, Megaphone, ExternalLink, Lock,
  History, Copy, ClipboardCheck, Trash2,
  AlertTriangle, Palette, Bookmark, Wand2, GripVertical, Save,
  Image as ImageIcon, Film, Folder, Tag, LayoutGrid, ChevronDown,
  BookOpen, Headset, Shield,
  Paperclip, Send, FileText, Music
} from 'lucide-react';

// --- Types & Declarations ---

declare var process: {
  env: {
    API_KEY?: string;
    [key: string]: any;
  }
};

type ModalType = 'settings' | 'links' | 'usage' | 'price' | 'support' | 'announcement' | 'edit-prompt' | 'styles' | 'library' | 'save-prompt-confirm' | 'video-remix' | null;

interface AppConfig {
  baseUrl: string;
  apiKey: string;
}

interface GeneratedAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  prompt: string;
  modelName: string;
  durationText: string;
  genTimeLabel: string;
  modelId: string;
  timestamp: number;
  status?: 'queued' | 'processing' | 'completed' | 'failed' | 'loading';
  taskId?: string;
  config?: any;
}

interface ReferenceImage {
  id: string;
  data: string;
  mimeType: string;
}

interface ModelDefinition {
  id: string;
  name: string;
  cost: string;
  features: string[];
  maxImages: number;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
}

interface SavedPrompt {
  id: string;
  text: string;
  name: string;
  category: string;
}

// --- Constants ---

const FIXED_BASE_URL = 'https://www.vivaapi.cn';

const ASPECT_RATIO_LABELS: Record<string, string> = {
  '1:1': '1:1 (正方形)',
  '2:3': '2:3 (照片)',
  '3:2': '3:2 (摄影)',
  '3:4': '3:4 (小红书)',
  '4:3': '4:3 (早期电视)',
  '4:5': '4:5 (详情页)',
  '5:4': '5:4 (装饰画)',
  '9:16': '9:16 (短视频)',
  '16:9': '16:9 (电脑壁纸)',
  '21:9': '21:9 (宽屏电影)',
};

const EXTENDED_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const GPT1_RATIOS = ['1:1', '2:3', '3:2'];
const GPT15_RATIOS = ['1:1', '2:3', '3:2', '9:16', '16:9'];
const GROK_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const KLING_O1_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
const JIMENG_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9'];

const MODELS: ModelDefinition[] = [
  { 
    id: 'gemini-2.5-flash-image', 
    name: 'NANO BANANA', 
    cost: 'Flash',
    features: ['fast', 'multimodal'],
    maxImages: 4,
    supportedAspectRatios: EXTENDED_RATIOS,
    supportedResolutions: ['AUTO']
  },
  { 
    id: 'gemini-3-pro-image-preview', 
    name: 'Nano Banana Pro', 
    cost: 'Pro',
    features: ['hd'],
    maxImages: 8,
    supportedAspectRatios: EXTENDED_RATIOS,
    supportedResolutions: ['1K', '2K', '4K']
  },
  {
    id: 'kling-image-o1',
    name: 'Kling Image O1',
    cost: 'Kling',
    features: ['omni', 'high-quality'],
    maxImages: 4,
    supportedAspectRatios: KLING_O1_RATIOS,
    supportedResolutions: ['1K', '2K']
  },
  {
    id: 'gpt-image-1-all',
    name: 'GPT Image 1',
    cost: 'GPT',
    features: ['stable'],
    maxImages: 4,
    supportedAspectRatios: GPT1_RATIOS,
    supportedResolutions: ['AUTO']
  },
  {
    id: 'gpt-image-1.5-all',
    name: 'GPT Image 1.5',
    cost: 'GPT-1.5',
    features: ['detail'],
    maxImages: 4,
    supportedAspectRatios: GPT15_RATIOS,
    supportedResolutions: ['AUTO']
  },
  {
    id: 'grok-4-image',
    name: 'Grok 4 Image',
    cost: 'Grok',
    features: ['creative'],
    maxImages: 4,
    supportedAspectRatios: GROK_RATIOS,
    supportedResolutions: ['AUTO']
  },
  {
    id: 'jimeng-4.5',
    name: 'Jimeng 4.5',
    cost: 'Jimeng',
    features: ['art'],
    maxImages: 8,
    supportedAspectRatios: EXTENDED_RATIOS,
    supportedResolutions: ['2K', '4K']
  }
];

const VIDEO_MODELS = [
  { 
    id: 'sora-2-all', 
    name: 'Sora 2', 
    desc: '标清视频', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '10', q: '标清'}, 
      {s: '15', q: '标清'}
    ] 
  },
  { 
    id: 'sora-2-pro-all', 
    name: 'Sora 2 Pro', 
    desc: '高清/长效', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '15', q: '高清'}, 
      {s: '25', q: '标清'}
    ] 
  },
  {
    id: 'kling-custom-elements',
    name: 'Kling Motion Ctrl',
    desc: '动作迁移',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    options: [
      {s: '5', q: '5s'},
      {s: '10', q: '10s'},
      {s: '30', q: '30s'}
    ]
  },
  { 
    id: 'veo_3_1-fast', 
    name: 'VEO 3.1 FAST', 
    desc: '标清视频', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '8', q: '标清'}
    ] 
  },
  { 
    id: 'veo3.1-pro', 
    name: 'VEO 3.1 PRO', 
    desc: '高清视频', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '8', q: '高清'}
    ] 
  },
  {
    id: 'jimeng-video-3.0',
    name: 'Jimeng Video 3.0',
    desc: '即梦视频', 
    supportedAspectRatios: JIMENG_RATIOS,
    options: [
      {s: '5', q: '标清'},
      {s: '10', q: '标清'}
    ]
  },
  {
    id: 'grok-video-3',
    name: 'Grok Video 3',
    desc: '标清视频', 
    supportedAspectRatios: ['9:16', '16:9', '2:3', '3:2', '1:1'],
    options: [
      {s: '6', q: '标清'}
    ]
  }
];

const STYLES = [
  { zh: "写实", en: "Realistic" },
  { zh: "3D渲染", en: "3D Render" },
  { zh: "扁平化", en: "Flat design" },
  { zh: "日系动漫", en: "Anime" },
  { zh: "Q版卡通", en: "Cartoon" },
  { zh: "传统国风", en: "Chinese" },
  { zh: "赛博朋克", en: "Cyberpunk" },
  { zh: "INS极简", en: "Minimalist" },
  { zh: "线描", en: "Line Art" },
  { zh: "港风", en: "HK Style" },
  { zh: "美式卡通", en: "US Cartoon" },
  { zh: "蒸汽波", en: "Vaporwave" },
  { zh: "水彩", en: "Watercolor" },
  { zh: "油画", en: "Oil Paint" },
  { zh: "像素艺术", en: "Pixel Art" },
  { zh: "故障艺术", en: "Glitch" },
  { zh: "水墨画", en: "Ink Art" },
  { zh: "马克笔", en: "Marker" },
  { zh: "彩铅", en: "Pencil" },
  { zh: "日式极简", en: "Zen" },
  { zh: "民国风", en: "Retro" },
  { zh: "超现实", en: "Surreal" },
  { zh: "蜡笔画", en: "Crayon" },
  { zh: "黏土", en: "Clay" },
  { zh: "折纸", en: "Origami" },
  { zh: "毛毡", en: "Felt" },
  { zh: "针织", en: "Knitted" }
];

const OPTIMIZER_MODEL = 'gemini-3-flash-preview';

// --- Helpers ---
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const base64ToBlob = (base64: string, mimeType: string) => {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (e) {
    console.error("base64ToBlob failed", e);
    return null;
  }
};

const urlToBlob = async (url: string) => {
    try {
        const response = await fetch(url);
        return await response.blob();
    } catch (e) {
        console.error("urlToBlob failed", e);
        return null;
    }
};

const findImageUrlInObject = (obj: any): string | null => {
  if (!obj) return null;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    const mdMatch = trimmed.match(/!\[.*?\]\((https?:\/\/[^\s"'<>)]+)\)/i);
    if (mdMatch) return mdMatch[1];
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (!trimmed.includes(' ')) return trimmed;
    }
    if (trimmed.startsWith('data:image')) return trimmed;
    const urlMatch = trimmed.match(/(https?:\/\/[^\s"'<>]+)/i);
    if (urlMatch) return urlMatch[1];
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findImageUrlInObject(item);
      if (found) return found;
    }
  } else if (typeof obj === 'object') {
    const priorityKeys = ['url', 'b64_json', 'image', 'img', 'link', 'content', 'data', 'url'];
    for (const key of priorityKeys) {
      if (obj[key]) {
        const found = findImageUrlInObject(obj[key]);
        if (found) return found;
      }
    }
    for (const key in obj) {
      if (typeof obj[key] === 'object' || typeof obj[key] === 'string') {
        const found = findImageUrlInObject(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
};

// --- IndexedDB ---
const DB_NAME = 'viva_ai_db';
const STORE_NAME = 'assets';
const DB_VERSION = 3;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveAssetToDB = async (asset: GeneratedAsset) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(asset);
  } catch(e) { console.error("DB Save Error", e); }
};

const getAllAssetsFromDB = async (): Promise<GeneratedAsset[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch(e) { return []; }
};

const deleteAssetFromDB = async (id: string) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
  } catch(e) { console.error("DB Delete Error", e); }
};

// --- ChatBot Component ---

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    files?: { type: string; data: string }[];
    error?: boolean;
}

const ChatBot = ({ config }: { config: AppConfig }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: -1, y: -1 }); // Initial -1 indicates default
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '你好！我是VIVA智能助手。我可以帮你解答问题、分析文档或处理多媒体内容。\n支持: 文本, 图片, 音频, 视频, PDF。' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [attachments, setAttachments] = useState<{ file: File, preview: string, type: string }[]>([]);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Set initial position on mount to avoid SSR mismatch if any
    useEffect(() => {
        if (position.x === -1) {
            setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const currentX = position.x;
        const currentY = position.y;

        let hasMoved = false;

        const handleMouseMove = (ev: MouseEvent) => {
            if (!hasMoved && (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5)) {
                hasMoved = true;
                setIsDragging(true);
            }
            if (hasMoved) {
                setPosition({
                    x: currentX + (ev.clientX - startX),
                    y: currentY + (ev.clientY - startY)
                });
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setTimeout(() => setIsDragging(false), 50);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                let type = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type === 'application/pdf') type = 'pdf';
                
                setAttachments(prev => [...prev, { file, preview: result, type }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; // Reset input
    };

    const removeAttachment = (idx: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const generateResponse = async (history: ChatMessage[]) => {
        setIsLoading(true);
        try {
            const key = config.apiKey || (typeof process !== 'undefined' && process.env && process.env.API_KEY ? process.env.API_KEY : '');
            if (!key) throw new Error("请先设置API Key");

            const contents = await Promise.all(history.map(async (msg) => {
                const parts: any[] = [{ text: msg.text }];
                if (msg.files && msg.files.length > 0) {
                   msg.files.forEach(f => {
                       const base64 = f.data.split(',')[1];
                       parts.push({
                           inlineData: {
                               mimeType: f.type,
                               data: base64
                           }
                       });
                   });
                }
                return {
                    role: msg.role === 'model' ? 'model' : 'user',
                    parts: parts
                };
            }));
            
            const res = await fetch(`${config.baseUrl}/v1beta/models/gemini-3-flash-preview:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({ 
                    contents,
                    systemInstruction: {
                        parts: [{ text: "你是一个智能助手。请严格遵守以下规则：1. 必须全程使用中文回答。2. 禁止使用英文（除非代码或专业术语必要）。3. 禁止输出任何思考过程、思维链或内部独白。4. 直接给出用户需要的最终答案，不要有多余的解释。" }]
                    }
                })
            });

            const data = await res.json();
            
            if (data.error) throw new Error(data.error.message);

            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);

        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}`, error: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if ((!input.trim() && attachments.length === 0) || isLoading) return;

        const userMsg: ChatMessage = {
            role: 'user',
            text: input,
            files: attachments.map(a => ({ type: a.file.type, data: a.preview }))
        };

        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setInput('');
        setAttachments([]);
        
        await generateResponse(newHistory);
    };

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(idx);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = (idx: number) => {
        setMessages(prev => prev.filter((_, i) => i !== idx));
    };

    const handleRegenerate = (idx: number) => {
        if (isLoading) return;
        // Keep history up to the message before this one
        const newHistory = messages.slice(0, idx);
        setMessages(newHistory);
        generateResponse(newHistory);
    };

    const handleClearChat = () => {
        setMessages([{ role: 'model', text: '你好！我是VIVA智能助手。我可以帮你解答问题、分析文档或处理多媒体内容。\n支持: 文本, 图片, 音频, 视频, PDF。' }]);
        setInput('');
        setAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getIconForType = (type: string) => {
        switch(type) {
            case 'image': return <ImageIcon className="w-3 h-3"/>;
            case 'audio': return <Music className="w-3 h-3"/>;
            case 'video': return <Video className="w-3 h-3"/>;
            case 'pdf': return <FileText className="w-3 h-3"/>;
            default: return <Paperclip className="w-3 h-3"/>;
        }
    };

    const toggleOpen = () => {
        if (!isDragging) setIsOpen(!isOpen);
    };

    return (
        <div style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }} 
             className="flex flex-col items-end gap-2">
            
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[350px] md:w-[400px] h-[500px] bg-white border-4 border-black brutalist-shadow flex flex-col mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200 origin-bottom-right absolute bottom-16 right-0">
                    <div className="bg-brand-yellow p-3 border-b-4 border-black flex justify-between items-center cursor-move" onMouseDown={handleMouseDown}>
                        <div className="flex items-center gap-2">
                             <Bot className="w-6 h-6 text-black" />
                             <span className="font-bold uppercase italic text-lg">AI Assistant</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-brand-red hover:text-white border-2 border-transparent hover:border-black p-1 transition-all rounded-sm">
                            <Minimize2 className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group mb-2`}>
                                <div className={`max-w-[85%] border-2 border-black p-3 ${msg.role === 'user' ? 'bg-brand-blue text-white' : 'bg-white text-black'}`}>
                                    {msg.files && msg.files.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {msg.files.map((f, i) => (
                                                <div key={i} className="bg-black/10 px-2 py-1 text-xs rounded flex items-center gap-1">
                                                    {getIconForType(f.type === 'application/pdf' ? 'pdf' : f.type.split('/')[0])}
                                                    {f.type.includes('image') ? 'Image' : 'File'}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <pre className={`whitespace-pre-wrap font-sans text-sm ${msg.error ? 'text-red-500' : ''}`}>{msg.text}</pre>
                                </div>
                                {msg.role === 'model' && !msg.error && (
                                    <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => handleCopy(msg.text, idx)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-black uppercase transition-colors" title="复制/Copy">
                                            {copiedId === idx ? <Check className="w-3 h-3 text-brand-green"/> : <Copy className="w-3 h-3"/>}
                                            复制
                                         </button>
                                         {idx > 0 && (
                                            <button onClick={() => handleRegenerate(idx)} disabled={isLoading} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-black uppercase transition-colors disabled:opacity-50" title="重新生成/Regenerate">
                                                <RefreshCw className={`w-3 h-3 ${isLoading && idx === messages.length -1 ? 'animate-spin' : ''}`}/>
                                                重新回答
                                            </button>
                                         )}
                                         <button onClick={() => handleDelete(idx)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand-red uppercase transition-colors" title="删除/Delete">
                                            <Trash2 className="w-3 h-3"/>
                                            删除
                                         </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border-2 border-black p-3 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs font-bold uppercase italic">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="p-3 bg-white border-t-4 border-black">
                        {attachments.length > 0 && (
                            <div className="flex gap-2 mb-2 overflow-x-auto pt-3 pr-3 pb-2">
                                {attachments.map((att, i) => (
                                    <div key={i} className="relative flex-shrink-0 bg-slate-100 border-2 border-black w-12 h-12 flex items-center justify-center">
                                        {att.type === 'image' ? (
                                            <img src={att.preview} className="w-full h-full object-cover" />
                                        ) : (
                                            getIconForType(att.type)
                                        )}
                                        <button onClick={() => removeAttachment(i)} className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border border-black w-5 h-5 flex items-center justify-center text-[10px] z-10">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-end gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 border-2 border-black hover:bg-slate-100 transition-colors h-[42px] w-[42px] flex items-center justify-center" title="Upload File">
                                <Paperclip className="w-5 h-5" />
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    multiple 
                                    accept="image/*,audio/*,video/*,application/pdf"
                                    onChange={handleFileSelect}
                                />
                            </button>
                            <div className="flex-1 relative">
                                <textarea 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    placeholder="Message..."
                                    className="w-full p-2 border-2 border-black resize-none h-[42px] focus:bg-brand-cream focus:outline-none text-sm font-medium pr-8"
                                />
                            </div>
                            <button 
                                onClick={handleClearChat} 
                                className="p-2 bg-slate-100 border-2 border-black hover:bg-brand-red hover:text-white transition-all h-[42px] w-[42px] flex items-center justify-center"
                                title="清空对话 / Reset Chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={sendMessage} 
                                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                                className="p-2 bg-brand-green border-2 border-black hover:bg-brand-green/80 transition-all disabled:grayscale disabled:opacity-50 h-[42px] w-[42px] flex items-center justify-center"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Icon */}
            <button 
                onMouseDown={handleMouseDown}
                onClick={toggleOpen}
                className={`w-14 h-14 bg-brand-yellow border-4 border-black rounded-full flex items-center justify-center transition-all cursor-move z-50 group relative ${isDragging ? 'cursor-grabbing' : ''}`}
            >
                {isOpen ? <X className="w-8 h-8"/> : <Bot className="w-8 h-8 group-hover:scale-110 transition-transform"/>}
                {!isOpen && <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red border-2 border-black rounded-full"></div>}
            </button>
        </div>
    );
};

// --- Sub-components ---

const SectionLabel = ({ text }: { text: string }) => (
  <label className="text-sm font-normal border-b-2 border-black pb-0.5 block mb-1.5 uppercase tracking-tighter">
    {text}
  </label>
);

interface CircularButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const CircularButton = ({ children, onClick, className = "" }: CircularButtonProps) => (
  <button onClick={onClick} className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center brutalist-shadow-sm transition-all hover:translate-y-0.5 hover:shadow-none ${className}`}>
      {children}
  </button>
);

const ModalHeader = ({ title, icon: Icon, onClose, bgColor = "bg-brand-yellow" }: { title: string, icon: any, onClose: () => void, bgColor?: string }) => (
  <div className={`${bgColor} p-4 border-b-4 border-black flex justify-between items-center relative flex-shrink-0`}>
    <div className="flex items-center gap-3">
      {Icon && typeof Icon === 'string' ? <span className="text-xl font-bold">{Icon}</span> : Icon && <Icon className="w-8 h-8" />}
      <h2 className="text-3xl font-bold italic tracking-tighter uppercase">{title}</h2>
    </div>
    <button onClick={onClose} 
            className="absolute -top-4 -right-4 bg-brand-red text-white p-2 border-4 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all z-[80]">
      <X className="w-7 h-7" />
    </button>
  </div>
);

const App = () => {
  const [mainCategory, setMainCategory] = useState<'image' | 'video' | 'proxy'>('image');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [selectedVideoModel, setSelectedVideoModel] = useState(VIDEO_MODELS[0].id);
  const [videoOptionIdx, setVideoOptionIdx] = useState(0);
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [activeModal, setActiveModal] = useState<ModalType>('announcement');
  const [previewAsset, setPreviewAsset] = useState<GeneratedAsset | null>(null);
  const [previewRefImage, setPreviewRefImage] = useState<ReferenceImage | null>(null);
  const [config, setConfig] = useState<AppConfig>({ baseUrl: FIXED_BASE_URL, apiKey: '' });
  const [tempConfig, setTempConfig] = useState<AppConfig>(config);
  const [prompt, setPrompt] = useState('');
  const [libraryPrompts, setLibraryPrompts] = useState<SavedPrompt[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceVideo, setReferenceVideo] = useState<ReferenceImage | null>(null);
  const [imageSize, setImageSize] = useState('AUTO');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generationCount, setGenerationCount] = useState(1);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionCurrent, setSelectionCurrent] = useState({ x: 0, y: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draggedPromptIdx, setDraggedPromptIdx] = useState<number | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Library State
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [editingLibraryText, setEditingLibraryText] = useState('');
  const [editingLibraryName, setEditingLibraryName] = useState('');
  const [editingLibraryCategory, setEditingLibraryCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  
  // Library Category Rename State
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Library Add Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Save Modal State
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [showSaveCategoryDropdown, setShowSaveCategoryDropdown] = useState(false);
  
  // Video Remix State
  const [remixingAsset, setRemixingAsset] = useState<GeneratedAsset | null>(null);
  const [remixPrompt, setRemixPrompt] = useState('');

  const galleryRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);

  // Safe process.env access
  const safeEnvKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

  const isVideoMode = mainCategory === 'video';
  const isProxyMode = mainCategory === 'proxy';

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!isVideoMode && !isProxyMode) {
      const model = MODELS.find(m => m.id === selectedModel);
      if (model) {
        if (!model.supportedAspectRatios.includes(aspectRatio)) setAspectRatio(model.supportedAspectRatios[0]);
        if (!model.supportedResolutions.includes(imageSize)) setImageSize(model.supportedResolutions[0]);
      }
    } else if (isVideoMode) {
      const model = VIDEO_MODELS.find(m => m.id === selectedVideoModel);
      if (model) {
          if (model.supportedAspectRatios && !model.supportedAspectRatios.includes(videoRatio)) {
              setVideoRatio(model.supportedAspectRatios[0]);
          }
      }

      const max = (selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1;
      if (referenceImages.length > max && selectedVideoModel !== 'kling-custom-elements') {
        setReferenceImages(prev => prev.slice(0, max));
      } else if (selectedVideoModel === 'kling-custom-elements') {
         if (referenceImages.length > 1) setReferenceImages(prev => prev.slice(0, 1));
      }
    }
  }, [selectedModel, selectedVideoModel, mainCategory, aspectRatio, imageSize, videoRatio, isVideoMode, isProxyMode]);

  useEffect(() => {
    if (error && error.includes('张参考图')) {
      const currentModel = MODELS.find(m => m.id === selectedModel);
      const max = (!isVideoMode) ? (currentModel?.maxImages || 4) : 
                  (selectedVideoModel === 'kling-custom-elements' ? 1 : 
                  ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1));
      if (referenceImages.length <= max) {
        setError(null);
      }
    }
  }, [referenceImages, selectedModel, selectedVideoModel, mainCategory, error, isVideoMode]);

  useEffect(() => {
    if (activeModal === 'edit-prompt') {
      setPrompt(prev => prev.replace(/([。])(?!\s*\n)/g, '$1\n\n').replace(/(\. )/g, '.\n\n'));
    }
  }, [activeModal]);

  useEffect(() => {
    getAllAssetsFromDB().then(assets => {
        const sorted = assets.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setGeneratedAssets(sorted);
        // Restart video polling
        sorted.filter(a => a.type === 'video' && (a.status === 'queued' || a.status === 'processing') && a.modelId !== 'kling-custom-elements')
              .forEach(v => startVideoPolling(v.taskId!, v.id, v.timestamp, v.modelId));
        
        // Restart Kling Image polling
        sorted.filter(a => a.type === 'image' && a.modelId === 'kling-image-o1' && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => startKlingImagePolling(v.taskId!, v.id, v.timestamp));

        // Restart Kling Motion polling
        sorted.filter(a => a.type === 'video' && a.modelId === 'kling-custom-elements' && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => startKlingMotionPolling(v.taskId!, v.id, v.timestamp));
    });

    // Load library prompts
    const savedLibrary = localStorage.getItem('viva_library_prompts');
    const savedCategories = localStorage.getItem('viva_library_categories');
    
    let loadedPrompts: SavedPrompt[] = [];
    let loadedCategories: string[] = [];

    if (savedLibrary) {
        try { 
            const parsed = JSON.parse(savedLibrary);
            loadedPrompts = parsed.map((p: any) => ({
                id: p.id,
                text: p.text,
                name: p.name || (p.text.length > 8 ? p.text.slice(0, 8) + '...' : '未命名'),
                category: p.category || '默认'
            }));
        } catch (e) { loadedPrompts = []; }
    }

    if (savedCategories) {
        try { loadedCategories = JSON.parse(savedCategories); } catch (e) {}
    }

    // Merge categories to ensure consistency
    const promptCats = new Set(loadedPrompts.map(p => p.category));
    const mergedCats = Array.from(new Set([...loadedCategories, ...promptCats])).sort();
    
    setLibraryPrompts(loadedPrompts);
    setCategories(mergedCats);
  }, []);

  // Initialization: Load config from local storage
  useEffect(() => {
    const saved = localStorage.getItem('viva_config');
    
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const enforced = { ...p, baseUrl: FIXED_BASE_URL };
        setConfig(enforced);
        setTempConfig(enforced);
      } catch (e) {
        setConfig({ baseUrl: FIXED_BASE_URL, apiKey: '' });
        setTempConfig({ baseUrl: FIXED_BASE_URL, apiKey: '' });
      }
    }
  }, []);

  const saveConfig = () => {
    const normalized = { ...tempConfig, baseUrl: FIXED_BASE_URL };
    setConfig(normalized);
    setTempConfig(normalized);
    localStorage.setItem('viva_config', JSON.stringify(normalized));
    setActiveModal(null);
    setError(null);
  };
  
  const startKlingImagePolling = (taskId: string, assetId: string, startTime: number) => {
    const interval = setInterval(async () => {
        let key = configRef.current.apiKey || safeEnvKey;
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const url = `${configRef.current.baseUrl}/kling/v1/images/omni-image/${taskId}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } });
            const data = await res.json();
            
            const taskStatus = data.data?.task_status || '';
            
            if (taskStatus === 'succeed') {
                 const images = data.data?.task_result?.images;
                 const imageUrl = images && images.length > 0 ? images[0].url : null;
                 
                 if (imageUrl) {
                    const finishTime = Date.now();
                    const diff = Math.round((finishTime - startTime) / 1000);
                    const assetUpdates = { status: 'completed' as const, url: imageUrl, genTimeLabel: `${diff}s` };
                    
                    setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...assetUpdates } : a));
                    
                    const assets = await getAllAssetsFromDB();
                    const existing = assets.find(a => a.id === assetId);
                    if (existing) {
                        saveAssetToDB({ ...existing, ...assetUpdates });
                    }
                 } else {
                     setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed', genTimeLabel: '无图' } : a));
                 }
                 clearInterval(interval);
            } else if (taskStatus === 'failed') {
                 const errorMsg = data.data?.task_status_msg || '失败';
                 setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed', genTimeLabel: errorMsg } : a));
                 clearInterval(interval);
            }
        } catch (e) {
            console.error("Polling error for kling task", taskId, e);
        }
    }, 3000);
  };

  const startKlingMotionPolling = (taskId: string, assetId: string, startTime: number) => {
    const interval = setInterval(async () => {
        let key = configRef.current.apiKey || safeEnvKey;
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const url = `${configRef.current.baseUrl}/kling/v1/videos/motion-control/${taskId}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } });
            const data = await res.json();
            
            const taskStatus = data.data?.task_status || '';
            
            if (taskStatus === 'succeed' || taskStatus === 'completed') {
                 const videos = data.data?.task_result?.videos;
                 const videoUrl = videos && videos.length > 0 ? videos[0].url : null;
                 
                 if (videoUrl) {
                    const finishTime = Date.now();
                    const diff = Math.round((finishTime - startTime) / 1000);
                    const assetUpdates = { status: 'completed' as const, url: videoUrl, genTimeLabel: `${diff}s` };
                    
                    setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...assetUpdates } : a));
                    
                    const assets = await getAllAssetsFromDB();
                    const existing = assets.find(a => a.id === assetId);
                    if (existing) {
                        saveAssetToDB({ ...existing, ...assetUpdates });
                    }
                 } else {
                     setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed', genTimeLabel: '无视频' } : a));
                 }
                 clearInterval(interval);
            } else if (taskStatus === 'failed') {
                 const errorMsg = data.data?.task_status_msg || '失败';
                 setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed', genTimeLabel: errorMsg } : a));
                 clearInterval(interval);
            }
        } catch (e) {
            console.error("Polling error for kling motion task", taskId, e);
        }
    }, 3000);
  };

  const startVideoPolling = (taskId: string, assetId: string, startTime: number, modelId: string) => {
    const interval = setInterval(async () => {
        let key = configRef.current.apiKey || safeEnvKey;
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const isVeoGrokJimeng = modelId.startsWith('veo') || modelId.startsWith('grok') || modelId.startsWith('jimeng');
            const url = isVeoGrokJimeng ? `${configRef.current.baseUrl}/v1/video/query?id=${taskId}` : `${configRef.current.baseUrl}/v1/videos/${taskId}`;
            
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' } });
            const data = await res.json();
            
            const rawStatus = (data.status || data.state || data.data?.status || '').toLowerCase();
            const videoUrl = data.video_url || data.url || data.uri || data.data?.url || data.data?.video_url;

            const isSuccess = ['completed', 'succeeded', 'success', 'done'].includes(rawStatus);
            const isFailed = ['failed', 'error', 'rejected'].includes(rawStatus);

            if (isSuccess && videoUrl) {
                const finishTime = Date.now();
                const diff = Math.round((finishTime - startTime) / 1000);
                const assetUpdates = { status: 'completed' as const, url: videoUrl, genTimeLabel: `${diff}s` };
                
                setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...assetUpdates } : a));
                
                const assets = await getAllAssetsFromDB();
                const existing = assets.find(a => a.id === assetId);
                if (existing) {
                    saveAssetToDB({ ...existing, ...assetUpdates });
                }
                
                clearInterval(interval);
            } else if (isFailed) {
                setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed', genTimeLabel: '失败' } : a));
                
                const assets = await getAllAssetsFromDB();
                const existing = assets.find(a => a.id === assetId);
                if (existing) {
                    saveAssetToDB({ ...existing, status: 'failed', genTimeLabel: '失败' });
                }

                clearInterval(interval);
            }
        } catch (e) { 
            console.error("Polling error for task", taskId, e); 
        }
    }, 5000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (selectedVideoModel === 'kling-custom-elements') {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const matches = result.match(/^data:(.+);base64,(.+)$/);
            if (matches) setReferenceImages([{ id: generateUUID(), mimeType: matches[1], data: matches[2] }]);
        };
        reader.readAsDataURL(file);
        return;
    }

    const currentModel = MODELS.find(m => m.id === selectedModel);
    const max = (!isVideoMode) ? (currentModel?.maxImages || 4) : ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1);
    const remaining = max - referenceImages.length;
    if (remaining <= 0) { 
      setError(`当前模型最多支持 ${max} 张参考图`); 
      return; 
    }
    Array.from(files).slice(0, Math.max(0, remaining)).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const matches = result.match(/^data:(.+);base64,(.+)$/);
        if (matches) setReferenceImages(prev => [...prev, { id: generateUUID(), mimeType: matches[1], data: matches[2] }]);
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        const matches = result.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            setReferenceVideo({ id: generateUUID(), mimeType: matches[1], data: matches[2] });
        }
    };
    reader.readAsDataURL(file);
  };

  const removeReferenceImage = (id: string) => setReferenceImages(prev => prev.filter(img => img.id !== id));

  const optimizePrompt = async () => {
     // Allow optimization if prompt exists OR reference images exist
     if (!prompt.trim() && referenceImages.length === 0) return;
     
     let key = config.apiKey || safeEnvKey;
     
     setIsOptimizing(true);

     // If prompt is empty but images exist, provide a default instruction
     const effectivePrompt = prompt.trim() || (referenceImages.length > 0 ? "请描述这张图片的内容，用于生成类似的创作。" : "");
     
     let sys = `你是一位专业的AI绘画提示词工程师。
请将用户的输入（可能是简短的中文或英文）结合提供的参考图片（如果有），改写成一段高质量、细节丰富的中文绘画提示词。
分析图片的主体、风格、构图，并将其与用户的文字描述融合。
扩展核心元素：主体、风格、光影、构图和氛围。
不要包含任何宽高比参数（如 --ar, --aspect-ratio）。
只输出优化后的提示词文本，不要输出其他任何解释。`;

     if (isVideoMode) {
       const currentVideoModelDef = VIDEO_MODELS.find(m => m.id === selectedVideoModel);
       const durationOption = currentVideoModelDef?.options[videoOptionIdx];
       const durationSeconds = durationOption ? durationOption.s : '未知';

       sys = `你是一位专业的AI视频提示词专家。
当前视频生成时长设置为：${durationSeconds}秒。
请根据用户的输入以及参考图片内容（如果有），生成一段完整、连贯、高质量的中文视频生成提示词。
该提示词应包含主体描述、场景细节、光影氛围、镜头语言（如运镜方式）和视频风格。
请确保描述的内容量适合${durationSeconds}秒的视频长度，既不要过于单调，也不要包含过多在短时间内无法呈现的复杂情节。
要求：
1. 直接输出最终的提示词段落。
2. 不要包含任何分析、解释、标题或分点（如"核心主题"、"画面细节"等）。
3. 确保提示词适合Sora 2或Veo等模型理解。
4. 仅输出提示词本身。`;
     }

     try {
        const userContent: any[] = [{ type: "text", text: effectivePrompt }];
        
        if (referenceImages.length > 0) {
            referenceImages.forEach(img => {
                const url = img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}`;
                userContent.push({
                    type: "image_url",
                    image_url: { url: url }
                });
            });
        }

        const messages = [
            { role: "system", content: sys },
            { role: "user", content: userContent }
        ];

        const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ 
                model: OPTIMIZER_MODEL, 
                messages: messages,
                max_tokens: 2000 
            })
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message || "Optimization Error");

        const optimized = data.choices?.[0]?.message?.content?.trim();
        if (optimized) { setPrompt(optimized); setError(null); }
     } catch (e: any) { setError("AI优化失败: " + (e.message || "未知错误")); } finally { setIsOptimizing(false); }
  };

  const selectStyle = (style: string) => {
    setPrompt(prev => {
        const trimmed = prev.trim();
        if (!trimmed) return style;
        // Check if last char is punctuation
        const lastChar = trimmed.slice(-1);
        const separator = (lastChar === ',' || lastChar === '，' || lastChar === '.' || lastChar === '。') ? ' ' : ', ';
        return trimmed + separator + style;
    });
    setActiveModal(null);
  };

  // --- Save Prompt Logic ---
  const handleOpenSaveModal = () => {
    if (!prompt.trim()) return;
    setSaveName(prompt.slice(0, 8)); // Default name
    setSaveCategory('默认');
    setShowSaveCategoryDropdown(false);
    setActiveModal('save-prompt-confirm');
  };

  const confirmSavePrompt = () => {
    const cat = saveCategory.trim() || '默认';
    const newPrompt: SavedPrompt = { 
        id: generateUUID(), 
        text: prompt.trim(), 
        name: saveName.trim() || '未命名', 
        category: cat
    };
    
    // Update prompts
    const updated = [newPrompt, ...libraryPrompts];
    setLibraryPrompts(updated);
    localStorage.setItem('viva_library_prompts', JSON.stringify(updated));

    // Update categories
    if (!categories.includes(cat)) {
        const newCats = [...categories, cat].sort();
        setCategories(newCats);
        localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    }

    // Set selected category so next time user opens library it defaults to this (or they can find it easily)
    setSelectedCategory(cat);

    // Return to main app instead of opening library
    setActiveModal(null);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
    setError(null);
  };

  const removePromptFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = libraryPrompts.filter(p => p.id !== id);
    setLibraryPrompts(updated);
    localStorage.setItem('viva_library_prompts', JSON.stringify(updated));
  };

  const usePromptFromLibrary = (text: string) => {
    if (editingLibraryId) return; 
    setPrompt(text);
    setActiveModal(null);
  };

  const handleStartLibraryEdit = (p: SavedPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLibraryId(p.id);
    setEditingLibraryText(p.text);
    setEditingLibraryName(p.name);
    setEditingLibraryCategory(p.category);
  };

  const handleSaveLibraryEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Find original prompt to check for category changes
    const originalPrompt = libraryPrompts.find(p => p.id === id);
    const oldCategory = originalPrompt?.category;

    const updated = libraryPrompts.map(p => p.id === id ? { ...p, text: editingLibraryText, name: editingLibraryName, category: editingLibraryCategory } : p);
    setLibraryPrompts(updated);
    localStorage.setItem('viva_library_prompts', JSON.stringify(updated));
    setEditingLibraryId(null);
    
    // Manage Categories logic
    let newCats = [...categories];
    let changed = false;

    // 1. Add new category if it doesn't exist
    if (editingLibraryCategory && !newCats.includes(editingLibraryCategory)) {
        newCats.push(editingLibraryCategory);
        newCats.sort();
        changed = true;
    }

    // 2. Remove old category if it's now empty
    if (oldCategory && oldCategory !== editingLibraryCategory) {
        // Check if any prompt in the UPDATED list still uses the old category
        const isStillUsed = updated.some(p => p.category === oldCategory);
        if (!isStillUsed) {
            newCats = newCats.filter(c => c !== oldCategory);
            changed = true;
            // If the user is currently filtering by the deleted category, reset filter
            if (selectedCategory === oldCategory) {
                setSelectedCategory('全部');
            }
        }
    }

    if (changed) {
        setCategories(newCats);
        localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    }
  };

  const handleCancelLibraryEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLibraryId(null);
  };
  
  // --- Category Management ---
  const handleStartAddCategory = () => {
      setIsAddingCategory(true);
      setNewCategoryName('');
  };
  
  const handleSaveNewCategory = () => {
    if (!newCategoryName.trim()) {
        setIsAddingCategory(false);
        return;
    }
    const clean = newCategoryName.trim();
    if (categories.includes(clean)) {
        alert("该分类已存在 / Category already exists");
        return;
    }
    const newCats = [...categories, clean].sort();
    setCategories(newCats);
    localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    setSelectedCategory(clean);
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleStartRenameCat = (cat: string) => {
    setRenamingCat(cat);
    setRenameInput(cat);
  };

  const handleFinishRenameCat = () => {
    if (!renamingCat) return;
    const oldName = renamingCat;
    const newName = renameInput.trim();
    
    if (!newName || newName === oldName) {
        setRenamingCat(null);
        return;
    }

    if (categories.includes(newName)) {
        alert("该分类已存在 / Category already exists");
        return; 
    }

    // Update prompts
    const newPrompts = libraryPrompts.map(p => p.category === oldName ? {...p, category: newName} : p);
    setLibraryPrompts(newPrompts);
    localStorage.setItem('viva_library_prompts', JSON.stringify(newPrompts));

    // Update categories
    const newCats = categories.map(c => c === oldName ? newName : c).sort();
    setCategories(newCats);
    localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    
    if (selectedCategory === oldName) setSelectedCategory(newName);
    setRenamingCat(null);
  };
  
  const handleDeleteCategory = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const count = libraryPrompts.filter(p => p.category === catName).length;
    if (count > 0) {
        if (!window.confirm(`分类 "${catName}" 下有 ${count} 条提示词，确认删除吗？提示词也将被删除。\nDelete category "${catName}" and its ${count} prompts?`)) {
            return;
        }
        // Delete prompts
        const newPrompts = libraryPrompts.filter(p => p.category !== catName);
        setLibraryPrompts(newPrompts);
        localStorage.setItem('viva_library_prompts', JSON.stringify(newPrompts));
    }
    
    const newCats = categories.filter(c => c !== catName);
    setCategories(newCats);
    localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    if (selectedCategory === catName) setSelectedCategory('全部');
  };

  // --- Drag & Drop Sorting Handlers ---
  const handleDragStart = (idx: number) => {
    if (editingLibraryId || selectedCategory !== '全部') return; // Disable drag if filtered or editing
    setDraggedPromptIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (editingLibraryId || selectedCategory !== '全部') return;
    if (draggedPromptIdx === null || draggedPromptIdx === idx) return;
    
    const items = [...libraryPrompts];
    const draggedItem = items[draggedPromptIdx];
    items.splice(draggedPromptIdx, 1);
    items.splice(idx, 0, draggedItem);
    
    setDraggedPromptIdx(idx);
    setLibraryPrompts(items);
  };

  const handleDragEnd = () => {
    setDraggedPromptIdx(null);
    localStorage.setItem('viva_library_prompts', JSON.stringify(libraryPrompts));
  };

  const executeVideoGeneration = async (overrideConfig?: any) => {
    const tPrompt = overrideConfig?.prompt ?? prompt;
    if (!tPrompt) { setError("请输入提示词"); return; }
    let key = config.apiKey || safeEnvKey;
    
    const placeholders: GeneratedAsset[] = [];
    const count = overrideConfig ? 1 : generationCount;
    const startTime = Date.now();
    const tModelId = overrideConfig?.modelId ?? selectedVideoModel;
    const tRatio = overrideConfig?.videoRatio ?? videoRatio;
    const tOptIdx = overrideConfig?.videoOptionIdx ?? videoOptionIdx;
    const tRefs = overrideConfig?.referenceImages ?? referenceImages;
    const tRefVideo = overrideConfig?.referenceVideo ?? referenceVideo;

    // Kling Custom Elements Validation
    if (tModelId === 'kling-custom-elements') {
        if (!tRefs || tRefs.length === 0) { setError("Kling Motion: 需要上传一张静态角色图"); return; }
        if (!tRefVideo) { setError("Kling Motion: 需要上传动作参考视频"); return; }
    }

    for (let i = 0; i < count; i++) {
      placeholders.push({
        id: generateUUID(), url: '', type: 'video', prompt: tPrompt,
        modelId: tModelId, modelName: VIDEO_MODELS.find(m => m.id === tModelId)!.name,
        durationText: `${VIDEO_MODELS.find(m => m.id === tModelId)!.options[tOptIdx].s}s`,
        genTimeLabel: '生成中...',
        timestamp: startTime, status: 'loading',
        config: { modelId: tModelId, videoRatio: tRatio, videoOptionIdx: tOptIdx, prompt: tPrompt, referenceImages: [...tRefs], referenceVideo: tRefVideo ? {...tRefVideo} : null, type: 'video' }
      });
    }
    setGeneratedAssets(prev => [...placeholders, ...prev]);

    setError(null);
    try {
        const createOne = async (pId: string) => {
            let response;
            const isVeoModel = tModelId.startsWith('veo');
            const isGrokModel = tModelId.startsWith('grok');
            const isJimengModel = tModelId.startsWith('jimeng');
            
            if (tModelId === 'kling-custom-elements') {
                 // Kling Motion Control Logic
                 const payload = {
                    model_name: "kling-custom-elements",
                    prompt: tPrompt,
                    image: tRefs[0].data.startsWith('http') ? tRefs[0].data : `data:${tRefs[0].mimeType};base64,${tRefs[0].data}`,
                    video: tRefVideo.data.startsWith('http') ? tRefVideo.data : `data:${tRefVideo.mimeType};base64,${tRefVideo.data}`,
                    aspect_ratio: tRatio,
                    duration: VIDEO_MODELS.find(m => m.id === tModelId)!.options[tOptIdx].s
                 };

                 response = await fetch(`${config.baseUrl}/kling/v1/videos/motion-control`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                    body: JSON.stringify(payload)
                 });

            } else if (isVeoModel || isGrokModel || isJimengModel) {
                const payload: any = {
                    model: tModelId,
                    prompt: tPrompt,
                    images: tRefs.map((img: ReferenceImage) => img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}`),
                    aspect_ratio: tRatio
                };

                if (isVeoModel) {
                  payload.enhance_prompt = true;
                  payload.enable_upsample = true;
                }

                if (isGrokModel) {
                   payload.size = '720P';
                }

                if (isJimengModel) {
                    payload.duration = parseInt(VIDEO_MODELS.find(m => m.id === tModelId)!.options[tOptIdx].s);
                }

                response = await fetch(`${config.baseUrl}/v1/video/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                const formData = new FormData();
                formData.append('model', tModelId);
                formData.append('prompt', tPrompt);
                formData.append('seconds', VIDEO_MODELS.find(m => m.id === tModelId)!.options[tOptIdx].s);
                formData.append('size', tRatio.replace(':', 'x'));
                formData.append('watermark', 'false');
                
                if (tRefs && tRefs.length > 0) {
                    const img = tRefs[0];
                    let blob: Blob | null = null;
                    if (img.data.startsWith('http')) {
                        blob = await urlToBlob(img.data);
                    } else {
                        blob = base64ToBlob(img.data, img.mimeType);
                    }
                    if (blob) formData.append('input_reference', blob, 'reference.png');
                }
                response = await fetch(`${config.baseUrl}/v1/videos`, { method: 'POST', headers: { 'Authorization': `Bearer ${key}` }, body: formData });
            }
            
            const data = await response.json();
            if (!response.ok || (data.code && data.code !== 0)) throw new Error(data.error?.message || data.message || "视频生成接口错误");
            
            const tid = data.id || data.data?.id || data.data?.task_id || data.task_id || data.taskId;
            if (!tid) throw new Error("No Task ID returned");

            const updatedAsset: any = { ...placeholders.find(x => x.id === pId), status: 'queued', taskId: tid };
            setGeneratedAssets(prev => prev.map(a => a.id === pId ? updatedAsset : a));
            saveAssetToDB(updatedAsset);
            
            if (tModelId === 'kling-custom-elements') {
                startKlingMotionPolling(tid, pId, startTime);
            } else {
                startVideoPolling(tid, pId, startTime, tModelId);
            }
        };
        
        placeholders.forEach(p => createOne(p.id));
    } catch (err: any) { 
        setError(err.message); 
        setGeneratedAssets(prev => prev.map(a => placeholders.some(p => p.id === a.id) ? { ...a, status: 'failed', genTimeLabel: '接口失败' } : a));
    }
  };

  const executeVideoRemix = async () => {
    if (!remixingAsset || !remixingAsset.taskId || !remixPrompt.trim()) return;
    let key = config.apiKey || safeEnvKey;
    
    // Create placeholder for the remixed video
    const newId = generateUUID();
    const startTime = Date.now();
    
    const placeholder: GeneratedAsset = {
        id: newId, 
        url: '', 
        type: 'video', 
        prompt: remixPrompt,
        modelId: remixingAsset.modelId, 
        modelName: remixingAsset.modelName + ' (Remix)',
        durationText: remixingAsset.durationText,
        genTimeLabel: '重绘中...',
        timestamp: startTime, 
        status: 'loading',
        config: { ...remixingAsset.config, prompt: remixPrompt, isRemix: true }
    };
    
    setGeneratedAssets(prev => [placeholder, ...prev]);
    setActiveModal(null); // Close modal immediately

    try {
        const response = await fetch(`${config.baseUrl}/v1/videos/${remixingAsset.taskId}/remix`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({ prompt: remixPrompt })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "视频重绘接口错误");
        
        const tid = data.id || data.data?.id || data.task_id;
        
        const updatedAsset: any = { ...placeholder, status: 'queued', taskId: tid };
        setGeneratedAssets(prev => prev.map(a => a.id === newId ? updatedAsset : a));
        saveAssetToDB(updatedAsset);
        startVideoPolling(tid, newId, startTime, remixingAsset.modelId);
        
    } catch (err: any) {
        setError(err.message);
        setGeneratedAssets(prev => prev.map(a => a.id === newId ? { ...a, status: 'failed', genTimeLabel: '失败' } : a));
    }
    
    setRemixingAsset(null);
    setRemixPrompt('');
  };

  const executeGeneration = async (overrideConfig?: any) => {
    if (isVideoMode && !overrideConfig) { executeVideoGeneration(); return; }
    if (overrideConfig?.type === 'video') { executeVideoGeneration(overrideConfig); return; }

    const tPrompt = overrideConfig?.prompt ?? prompt;
    if (!tPrompt) { setError("请输入提示词"); return; }
    let key = config.apiKey || safeEnvKey;

    const tModelId = overrideConfig?.modelId ?? selectedModel;
    const tRatio = overrideConfig?.aspectRatio ?? aspectRatio;
    const tSize = overrideConfig?.imageSize ?? imageSize;
    const tRefs = overrideConfig?.referenceImages ?? referenceImages;
    const count = overrideConfig ? 1 : generationCount;
    const startTime = Date.now();

    const placeholders: GeneratedAsset[] = [];
    for (let i = 0; i < count; i++) {
        placeholders.push({
            id: generateUUID(), url: '', type: 'image', prompt: tPrompt,
            modelId: tModelId, modelName: MODELS.find(m => m.id === tModelId)?.name || tModelId,
            durationText: tSize, genTimeLabel: '生成中...',
            timestamp: startTime, status: 'loading',
            config: { modelId: tModelId, aspectRatio: tRatio, imageSize: tSize, prompt: tPrompt, referenceImages: tRefs ? [...tRefs] : [], type: 'image' }
        });
    }
    setGeneratedAssets(prev => [...placeholders, ...prev]);
    setError(null);

    // Specific handling for Kling Omni Image (Async)
    if (tModelId === 'kling-image-o1') {
        const createOneKling = async (pId: string) => {
            try {
                 const payload = {
                    model_name: "kling-image-o1",
                    prompt: tPrompt,
                    n: 1, 
                    aspect_ratio: tRatio,
                    resolution: tSize.toLowerCase(),
                    image_list: tRefs.map((img: ReferenceImage) => ({
                        image: img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}`
                    }))
                 };

                 const res = await fetch(`${config.baseUrl}/kling/v1/images/omni-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                    body: JSON.stringify(payload)
                 });
                 const data = await res.json();
                 
                 if (data.code !== 0) throw new Error(data.message || "Kling API Error");
                 
                 const tid = data.data?.task_id;
                 if (!tid) throw new Error("No Task ID returned");

                 const updatedAsset: any = { ...placeholders.find(x => x.id === pId), status: 'queued', taskId: tid };
                 setGeneratedAssets(prev => prev.map(a => a.id === pId ? updatedAsset : a));
                 saveAssetToDB(updatedAsset);
                 startKlingImagePolling(tid, pId, startTime);

            } catch (e: any) {
                 setGeneratedAssets(prev => prev.map(a => a.id === pId ? { ...a, status: 'failed', genTimeLabel: '请求失败' } : a));
                 setError(e.message);
            }
        }
        placeholders.forEach(p => createOneKling(p.id));
        return;
    }

    // Default synchronous generation
    try {
      const generateOne = async (pId: string) => {
        const start = Date.now();
        let url = '';
        try {
            if (tModelId.startsWith('gemini')) {
                const parts: any[] = [{ text: tPrompt }];
                if (tRefs && tRefs.length > 0) tRefs.forEach((img: ReferenceImage) => parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } }));
                const res = await fetch(`${config.baseUrl}/v1beta/models/${tModelId}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalalities: ["IMAGE"], imageConfig: { aspectRatio: tRatio, imageSize: tSize === 'AUTO' ? undefined : tSize } } })
                });
                const data = await res.json();
                const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
                if (part) { 
                    const d = part.inlineData || part.inline_data; 
                    url = `data:${d.mimeType};base64,${d.data}`; 
                } else url = findImageUrlInObject(data) || '';
                
                if (!url) {
                    const content: any[] = [{ type: "text", text: `${tPrompt} --aspect-ratio ${tRatio}` }];
                    if (tRefs && tRefs.length > 0) tRefs.forEach((img: ReferenceImage) => content.push({ type: "image_url", image_url: { url: img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}` } }));
                    const res2 = await fetch(`${config.baseUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify({ model: tModelId, messages: [{ role: "user", content }], stream: false })
                    });
                    const data2 = await res2.json();
                    url = findImageUrlInObject(data2) || findImageUrlInObject(data2.choices?.[0]?.message?.content) || '';
                }
            } else {
                const content: any[] = [{ type: "text", text: `${tPrompt} --aspect-ratio ${tRatio}` }];
                if (tRefs && tRefs.length > 0) tRefs.forEach((img: ReferenceImage) => content.push({ type: "image_url", image_url: { url: img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}` } }));
                const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                    body: JSON.stringify({ model: tModelId, messages: [{ role: "user", content }], stream: false })
                });
                const data = await res.json();
                url = findImageUrlInObject(data) || findImageUrlInObject(data.choices?.[0]?.message?.content) || '';
            }
        } catch (e) {
            console.error("Single generation failed", e);
        }

        const diff = Math.round((Date.now() - start) / 1000);
        
        if (url) {
            const updated: GeneratedAsset = {
                ...placeholders.find(x => x.id === pId)!,
                url, genTimeLabel: `${diff}s`, status: 'completed', timestamp: Date.now()
            };
            setGeneratedAssets(prev => prev.map(a => a.id === pId ? updated : a));
            saveAssetToDB(updated);
        } else {
            setGeneratedAssets(prev => prev.map(a => a.id === pId ? { ...a, status: 'failed', genTimeLabel: '失败' } : a));
        }
      };
      
      placeholders.forEach(p => generateOne(p.id));
    } catch (err: any) { setError(err.message); }
  };

  const handleAssetDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAssetFromDB(id);
    setGeneratedAssets(prev => prev.filter(a => a.id !== id));
    setSelectedAssetIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
    });
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('[data-asset-card="true"]')) return;
      setIsSelecting(true);
      setSelectionStart({ x: e.clientX, y: e.clientY });
      setSelectionCurrent({ x: e.clientX, y: e.clientY });
      if (!e.shiftKey) setSelectedAssetIds(new Set());
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    setSelectionCurrent({ x: e.clientX, y: e.clientY });
    
    const x1 = Math.min(selectionStart.x, e.clientX);
    const y1 = Math.min(selectionStart.y, e.clientY);
    const x2 = Math.max(selectionStart.x, e.clientX);
    const y2 = Math.max(selectionStart.y, e.clientY);

    const cards = galleryRef.current?.querySelectorAll('[data-asset-card="true"]');
    const newSelected = new Set(e.shiftKey ? selectedAssetIds : []);
    cards?.forEach(card => {
      const crect = card.getBoundingClientRect();
      const assetId = card.getAttribute('data-asset-id');
      if (assetId && !(crect.right < x1 || crect.left > x2 || crect.bottom < y1 || crect.top > y2)) {
        newSelected.add(assetId);
      }
    });
    setSelectedAssetIds(newSelected);
  };

  const handleContainerMouseUp = () => setIsSelecting(false);

  const toggleAssetSelection = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
    
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.size === generatedAssets.length) setSelectedAssetIds(new Set());
    else setSelectedAssetIds(new Set(generatedAssets.map(a => a.id)));
  };

  const handleBatchDownload = () => {
    selectedAssetIds.forEach(id => {
      const asset = generatedAssets.find(a => a.id === id);
      if (asset && asset.url) {
        const link = document.createElement('a');
        link.href = asset.url;
        link.download = `asset-${asset.id}.${asset.type === 'video' ? 'mp4' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleAssetDownload = async (asset: GeneratedAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!asset.url) return;

    try {
        const response = await fetch(asset.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `viva-${asset.id}.${asset.type === 'video' ? 'mp4' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed, using fallback", error);
        const link = document.createElement('a');
        link.href = asset.url;
        link.download = `viva-${asset.id}.${asset.type === 'video' ? 'mp4' : 'png'}`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleAssetRefresh = (asset: GeneratedAsset) => {
     if (asset.config) {
        setPrompt(asset.config.prompt);
        setReferenceImages(asset.config.referenceImages || []);
        if (asset.config.referenceVideo) setReferenceVideo(asset.config.referenceVideo);
        if (asset.type === 'image') {
           setMainCategory('image');
           setSelectedModel(asset.config.modelId);
           setAspectRatio(asset.config.aspectRatio);
           setImageSize(asset.config.imageSize);
           executeGeneration(asset.config);
        } else {
           setMainCategory('video');
           setSelectedVideoModel(asset.config.modelId);
           setVideoRatio(asset.config.videoRatio);
           setVideoOptionIdx(asset.config.videoOptionIdx);
           executeVideoGeneration(asset.config);
        }
     }
  };

  const handleAssetEdit = (asset: GeneratedAsset) => {
     if (asset.type === 'video') {
        if (asset.modelId.includes('sora-2')) {
            setRemixingAsset(asset);
            setRemixPrompt(asset.prompt);
            setActiveModal('video-remix');
        }
        return;
     }

     if (asset.type === 'image' && asset.url) {
        const matches = asset.url.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : 'image/png';
        const data = matches ? matches[2] : asset.url;
        
        setMainCategory('image');

        setReferenceImages(prev => {
            const currentModel = MODELS.find(m => m.id === selectedModel);
            // Since we are switching to image mode, we assume the user wants to use image limits
            const max = currentModel?.maxImages || 4;
            if (prev.length >= max) {
                setError(`当前模型最多支持 ${max} 张参考图`);
                return prev;
            }
            return [...prev, { id: generateUUID(), mimeType, data }];
        });
     }
  };

  const handleAssetGenVideo = (asset: GeneratedAsset) => { 
    if (asset.type === 'video') return;
    setMainCategory('video'); 
    if (asset.url) {
        const matches = asset.url.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : 'image/png';
        const data = matches ? matches[2] : asset.url;
        setReferenceImages([{ id: generateUUID(), mimeType, data }]);
    }
  };

  const handleCopyPrompt = (p: string, id: string) => {
    navigator.clipboard.writeText(p);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentImageModel = MODELS.find(m => m.id === selectedModel);
  const currentVideoModel = VIDEO_MODELS.find(m => m.id === selectedVideoModel);
  const labelClass = "font-normal text-[13px] text-black uppercase";
  const selectClass = "w-full p-1.5 border-2 border-black font-normal bg-white brutalist-shadow-sm focus:outline-none text-xs";
  const isKlingMotion = isVideoMode && selectedVideoModel === 'kling-custom-elements';
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F1F5F9] md:h-screen overflow-hidden" 
         onMouseMove={handleContainerMouseMove} 
         onMouseUp={handleContainerMouseUp}>

      <ChatBot config={config} />
      
      <div className="w-full md:w-[500px] bg-white border-r-4 border-black flex flex-col z-20 brutalist-shadow">
        <header className="bg-brand-yellow px-5 border-b-4 border-black h-20 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-brand-red flex items-center justify-center brutalist-border transition-colors duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-normal tracking-tight text-black">VIVA 智绘坊v2.0</h1>
          </div>
          <a href="https://www.vivaapi.cn/console/log" target="_blank" title="使用日志" className="w-9 h-9 bg-white border-2 border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
            <History className="w-5 h-5" />
          </a>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
          <section className="space-y-3">
            <SectionLabel text="1.创作类型 / Creation Type" />
            <div className="grid grid-cols-5 gap-2">
              <button 
                onClick={() => setMainCategory('image')} 
                className={`col-span-2 relative h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'image' ? 'bg-brand-yellow brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-yellow/20'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'image' ? 'block' : 'hidden'}`}>Selected</div>
                <ImageIcon className={`w-8 h-8 mb-1 ${mainCategory === 'image' ? 'text-black scale-110' : 'text-slate-400 group-hover:text-black group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-sm font-black uppercase italic tracking-tighter ${mainCategory === 'image' ? 'text-black' : 'text-slate-500 group-hover:text-black'}`}>图片创作</span>
              </button>

              <button 
                onClick={() => setMainCategory('video')} 
                className={`col-span-2 relative h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'video' ? 'bg-brand-red brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-red/10'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'video' ? 'block' : 'hidden'}`}>Selected</div>
                <Film className={`w-8 h-8 mb-1 ${mainCategory === 'video' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-brand-red group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-sm font-black uppercase italic tracking-tighter ${mainCategory === 'video' ? 'text-white' : 'text-slate-500 group-hover:text-brand-red'}`}>视频制作</span>
              </button>

              <button 
                onClick={() => setMainCategory('proxy')} 
                className={`col-span-1 relative h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'proxy' ? 'bg-brand-blue brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-blue/10'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'proxy' ? 'block' : 'hidden'}`}><Check className="w-3 h-3"/></div>
                <Shield className={`w-8 h-8 mb-1 ${mainCategory === 'proxy' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-brand-blue group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-sm font-black uppercase italic tracking-tighter ${mainCategory === 'proxy' ? 'text-white' : 'text-slate-500 group-hover:text-brand-blue'}`}>代理</span>
              </button>
            </div>
            
            {/* Reference Images Section - Only show if NOT proxy mode */}
            {!isProxyMode && (
              <div className={`p-3 bg-brand-cream border-2 border-black brutalist-shadow-sm ${referenceImages.length > 0 || referenceVideo ? 'solid-box-green' : 'solid-box-purple'}`}>
                  {isKlingMotion ? (
                     <div className="space-y-4">
                        {/* Character Image */}
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                  <h3 className={labelClass}>静态角色图 (Subject)</h3>
                                  {referenceImages.length > 0 && <span className="text-brand-green text-[10px] font-normal flex items-center gap-1"><Check className="w-3 h-3"/> READY</span>}
                             </div>
                             {referenceImages.length > 0 ? (
                                <div className="relative w-full h-32 border-2 border-black bg-white brutalist-shadow-sm group">
                                    <img src={referenceImages[0].data.startsWith('http') ? referenceImages[0].data : `data:${referenceImages[0].mimeType};base64,${referenceImages[0].data}`} className="w-full h-full object-contain" />
                                    <button onClick={(e) => { e.stopPropagation(); setReferenceImages([]); }} 
                                            className="absolute top-2 right-2 bg-brand-red text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                      <X className="w-4 h-4"/>
                                    </button>
                                </div>
                             ) : (
                                <label className="w-full h-32 flex flex-col items-center justify-center bg-white border-2 border-black border-dashed cursor-pointer hover:bg-slate-50 transition-colors">
                                    <Plus className="w-8 h-8 text-slate-400 mb-2"/>
                                    <span className="text-xs font-bold text-slate-500 uppercase">Upload Image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                             )}
                        </div>
                        {/* Motion Video */}
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                  <h3 className={labelClass}>动作参考视频 (Motion)</h3>
                                  {referenceVideo && <span className="text-brand-green text-[10px] font-normal flex items-center gap-1"><Check className="w-3 h-3"/> READY</span>}
                             </div>
                             {referenceVideo ? (
                                <div className="relative w-full h-32 border-2 border-black bg-black brutalist-shadow-sm group">
                                    <video src={referenceVideo.data.startsWith('http') ? referenceVideo.data : `data:${referenceVideo.mimeType};base64,${referenceVideo.data}`} className="w-full h-full object-contain" controls />
                                    <button onClick={(e) => { e.stopPropagation(); setReferenceVideo(null); }} 
                                            className="absolute top-2 right-2 bg-brand-red text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                      <X className="w-4 h-4"/>
                                    </button>
                                </div>
                             ) : (
                                <label className="w-full h-32 flex flex-col items-center justify-center bg-white border-2 border-black border-dashed cursor-pointer hover:bg-slate-50 transition-colors">
                                    <Video className="w-8 h-8 text-slate-400 mb-2"/>
                                    <span className="text-xs font-bold text-slate-500 uppercase">Upload Video</span>
                                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                                </label>
                             )}
                        </div>
                     </div>
                  ) : (
                      <>
                          <div className="flex justify-between items-center mb-1">
                              <h3 className={labelClass}>参考底稿 (可选) {(isVideoMode) && `(限${(selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? '2' : '1'}张)`}</h3>
                              {referenceImages.length > 0 && <span className="text-brand-green text-[10px] font-normal flex items-center gap-1"><Check className="w-3 h-3"/> READY</span>}
                          </div>
                          {referenceImages.length > 0 ? (
                              <div className="flex gap-3 overflow-x-auto pb-1.5 pt-4 pr-4 pl-1">
                                  {referenceImages.map((img: ReferenceImage, idx: number) => (
                                    <div key={img.id} 
                                         className="relative w-24 h-24 border-2 border-black bg-white brutalist-shadow-sm flex-shrink-0 cursor-pointer"
                                         onDoubleClick={() => setPreviewRefImage(img)}>
                                      <img src={img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center uppercase py-0.5">
                                         {isVideoMode && (selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? (idx === 0 ? '首帧' : '尾帧') : 'REF'}
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); removeReferenceImage(img.id); }} 
                                              className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                        <X className="w-4 h-4"/>
                                      </button>
                                    </div>
                                  ))}
                                  {(!isVideoMode ? referenceImages.length < (currentImageModel?.maxImages || 4) : referenceImages.length < ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1)) && (
                                    <label className="w-24 h-24 border-2 border-black flex items-center justify-center cursor-pointer bg-white brutalist-shadow-sm">
                                      <Plus className="w-6 h-6" /><input type="file" multiple={!isVideoMode} className="hidden" onChange={handleImageUpload} />
                                    </label>
                                  )}
                              </div>
                          ) : (
                              <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-purple text-white border-2 border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-[13px] hover:translate-y-1 hover:shadow-none transition-all">
                                  <input type="file" multiple={!isVideoMode} className="hidden" onChange={handleImageUpload} />
                                  上传图片/UPLOAD
                              </label>
                          )}
                      </>
                  )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionLabel text={isProxyMode ? "2. 代理权益 / Proxy Benefits" : "2. 生成配置 / Generation Settings"} />
            
            {isProxyMode ? (
              <div className="p-4 bg-white border-2 border-black brutalist-shadow-sm space-y-6 font-bold leading-relaxed select-text">
                <h3 className="text-2xl text-center text-[#E5312F] font-black tracking-tighter">代理本站核心优势</h3>
                
                <div className="space-y-2 text-[#003366] text-base">
                    <p>1、提供超低的成本使用价，自用省米，运营赚米;</p>
                    <p>2、提供同<a href="https://www.vivaapi.cn" target="_blank" className="underline hover:text-blue-800">www.vivaapi.cn</a>一样的AI聚合API平台;</p>
                    <p>3、提供同<a href="http://p.vivaapi.cn" target="_blank" className="underline hover:text-blue-800">p.vivaapi.cn</a>一样的AI应用平台;</p>
                    <p>4、无需服务器、无需后续管理、你只需提供一个域名;</p>
                    <p>5、教你0基础搭建部署上线任何AI应用;</p>
                    <p>6、代理费达标后可全额返还;</p>
                    <p>7、2026弯道超车的机会，望君把握。</p>
                </div>

                <div className="text-[#E5312F] space-y-1 text-base">
                    <p>都2026年了，你还在用别人的AI平台</p>
                    <p>为什么不根据自己的实际应用及想法自己搭建一个</p>
                </div>

                <div className="space-y-1 text-base">
                    <p className="text-[#16A34A]">你可选择创建的AI应用方向:</p>
                    <p className="text-[#16A34A]">图像生成，剧本分镜，教育辅导，文档处理</p>
                    <p className="text-[#16A34A]">医疗健康，金融理财，生活助手，算命大师</p>
                </div>

                <div className="text-[#EA580C] space-y-1 text-base">
                    <p>做这些AI应用，完全0基础，不用担心不会操作</p>
                    <p>只需要找到同行的页面</p>
                    <p>复制给AI，并接入我这边提供的API接入文档</p>
                    <p>打几个字，告诉AI创建一样功能的应用就搞定</p>
                </div>

                <div className="pt-4 border-t-2 border-dashed border-slate-300">
                    <div className="flex flex-col items-center gap-2">
                        <h4 className="font-bold text-lg text-black uppercase italic flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-brand-green rounded-full border border-black"></span>
                            招募优质API代理
                        </h4>
                        <a href="https://ai.feishu.cn/wiki/O6Q9wrxxci898Wkj6ndcFnlknJd?from=from_copylink" target="_blank" className="flex items-center justify-center w-full py-3 bg-brand-red text-white border-2 border-black font-bold text-base uppercase hover:bg-black hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm transition-all italic gap-2 group">
                            查看更多详情 <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform"/>
                        </a>
                    </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-brand-cream border-2 border-black brutalist-shadow-sm space-y-4">
                <div className="space-y-1">
                  <label className={labelClass}>选择生成模型 GENRE</label>
                  <select value={!isVideoMode ? selectedModel : selectedVideoModel} onChange={(e) => !isVideoMode ? setSelectedModel(e.target.value) : setSelectedVideoModel(e.target.value)} className={selectClass}>
                    {(!isVideoMode ? MODELS : VIDEO_MODELS).map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                </div>

                {!isVideoMode && currentImageModel && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className={labelClass}>比例 ASPECT</label>
                      <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className={selectClass}>
                        {currentImageModel.supportedAspectRatios.map(r => <option key={r} value={r}>{ASPECT_RATIO_LABELS[r] || r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>分辨率 QUALITY</label>
                      <select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className={selectClass}>
                        {currentImageModel.supportedResolutions.map(res => <option key={res} value={res}>{res}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {isVideoMode && currentVideoModel && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className={labelClass}>比例 ASPECT</label>
                      <select value={videoRatio} onChange={(e) => setVideoRatio(e.target.value)} className={selectClass}>
                        {currentVideoModel.supportedAspectRatios.map(r => <option key={r} value={r}>{ASPECT_RATIO_LABELS[r] || r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>时长/质量 DURATION</label>
                      <select value={videoOptionIdx} onChange={(e) => setVideoOptionIdx(parseInt(e.target.value))} className={selectClass}>
                        {currentVideoModel.options.map((opt, idx) => (
                          <option key={idx} value={idx}>{opt.s}S ({opt.q})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className={labelClass}>生成数量 BATCH</label>
                  <div className="flex items-center gap-2.5 bg-white border-2 border-black p-1.5 brutalist-shadow-sm">
                    <input type="range" min="1" max="10" value={generationCount} onChange={(e) => setGenerationCount(parseInt(e.target.value))} className="flex-1 accent-black h-4" />
                    <span className="font-normal text-black text-xs">{generationCount}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className={labelClass}>提示词描述 PROMPT</label>
                  </div>
                  
                  {/* Updated Toolbar matching the provided image style */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button onClick={optimizePrompt} disabled={isOptimizing} className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F7CE00] text-black border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap min-w-[90px]">
                      {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><Wand2 className="w-3.5 h-3.5"/> AI优化</>}
                    </button>
                    <button onClick={() => setActiveModal('styles')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#3B82F6] text-white border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap min-w-[70px]">
                      <Palette className="w-3.5 h-3.5"/> 风格
                    </button>
                    <button onClick={() => setActiveModal('library')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#A855F7] text-white border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap min-w-[70px]">
                      <Bookmark className="w-3.5 h-3.5"/> 词库
                    </button>
                    
                    <div className="flex gap-2 ml-auto">
                      <button onClick={handleOpenSaveModal} disabled={!prompt.trim()} className="w-9 h-9 flex items-center justify-center bg-[#F472B6] text-white border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm" title="保存">
                        <Save className="w-4 h-4"/>
                      </button>
                      <button onClick={() => setActiveModal('edit-prompt')} className="w-9 h-9 flex items-center justify-center bg-[#4ADE80] text-black border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all" title="展开">
                        <Maximize2 className="w-4 h-4"/>
                      </button>
                      <button onClick={() => setPrompt('')} className="w-9 h-9 flex items-center justify-center bg-white text-black border-2 border-black font-bold text-xs brutalist-shadow-sm hover:bg-brand-red hover:text-white hover:translate-y-0.5 hover:shadow-none transition-all" title="清空">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                      <textarea 
                          value={prompt} 
                          onChange={(e) => setPrompt(e.target.value)} 
                          placeholder="描述您的创作奇想..." 
                          className="w-full h-48 p-3 border-2 border-black font-normal text-[12px] bg-white focus:outline-none brutalist-input resize-y" 
                      />
                      {showSaveSuccess && (
                        <div className="absolute top-2 right-2 bg-brand-green text-black border-2 border-black px-2 py-1 text-[10px] font-bold brutalist-shadow-sm animate-in fade-in slide-in-from-right-2 z-20 italic">
                          保存成功
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="space-y-3">
            {!isProxyMode && (
              <>
                <button onClick={() => executeGeneration()} className="w-full py-3 bg-brand-red text-white text-xl font-normal border-2 border-black brutalist-shadow hover:translate-y-1.5 hover:shadow-none transition-all uppercase tracking-tighter">
                  开始创作/Start Creating
                </button>
                
                <div className="bg-white border-2 border-black p-4 brutalist-shadow-sm space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-brand-red" />
                    <span className="font-bold text-[14px]">温馨提示 / TIPS</span>
                  </div>
                  <div className="space-y-1.5 font-['Microsoft_YaHei','微软雅黑',sans-serif]">
                    <p className="text-[12px] font-normal leading-tight text-slate-700">1、首次使用请在设置中输入API令牌；</p>
                    <p className="text-[12px] font-normal leading-tight text-slate-700">2、如遇到多次请求失败请联系客服；</p>
                    <p className="text-[12px] font-normal leading-tight text-slate-700">3、欢迎提供优化建议。</p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {error && <div className="bg-white border-4 border-brand-red p-3 text-brand-red font-normal text-[11px] brutalist-shadow-sm">ERROR: {error}</div>}
        </div>
      </div>

      <div ref={galleryRef} className="flex-1 flex flex-col relative h-full overflow-hidden" onMouseDown={handleContainerMouseDown}>
        <div className="bg-brand-yellow border-b-4 border-black px-6 h-20 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <CircularButton 
              onClick={() => setActiveModal('settings')} 
              className="bg-white"
            >
              <Settings2 className="w-6 h-6"/>
            </CircularButton>
            <CircularButton onClick={() => setActiveModal('price')} className="bg-brand-green"><span className="text-2xl font-normal text-white">¥</span></CircularButton>
            <CircularButton onClick={() => setActiveModal('usage')} className="bg-white"><BookOpen className="w-6 h-6"/></CircularButton>
            <CircularButton onClick={() => setActiveModal('links')} className="bg-white"><Headset className="w-6 h-6"/></CircularButton>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={handleSelectAll} className="flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-normal brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all bg-white uppercase h-[40px]">
              {selectedAssetIds.size === generatedAssets.length ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>} 全选
            </button>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-normal brutalist-shadow-sm transition-all bg-white uppercase h-[40px]">
                <Square className="w-4 h-4"/> 数量 ({generatedAssets.length})
              </span>
              {selectedAssetIds.size > 0 && (
                <div className="flex gap-2">
                  <button onClick={handleBatchDownload} className="bg-brand-blue text-white border-2 border-black px-4 py-2 text-xs font-normal brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none uppercase">下载 ({selectedAssetIds.size})</button>
                  <button onClick={() => { selectedAssetIds.forEach(id => { deleteAssetFromDB(id); setGeneratedAssets(prev => prev.filter(a => a.id !== id)); }); setSelectedAssetIds(new Set()); }} className="bg-brand-red text-white border-2 border-black px-4 py-2 text-xs font-normal brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none uppercase">删除 ({selectedAssetIds.size})</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-brand-cream border-b-4 border-black py-3 flex justify-center items-center shrink-0">
           <p className="text-base font-bold text-brand-red flex items-center gap-2">
             <AlertTriangle className="w-5 h-5" />
             本应用不存储用户生成资产，请及时下载保存。
           </p>
        </div>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-10">
            {generatedAssets.map((asset) => (
              <div key={asset.id} 
                   data-asset-id={asset.id} 
                   data-asset-card="true" 
                   onClick={(e) => toggleAssetSelection(asset.id, e)}
                   className={`group bg-white border-4 border-black brutalist-shadow transition-all hover:-translate-y-1 cursor-pointer relative ${selectedAssetIds.has(asset.id) ? 'border-brand-blue ring-4 ring-brand-blue/30' : ''}`}>
                
                <button 
                  onClick={(e) => handleAssetDelete(asset.id, e)} 
                  className="absolute top-2 right-2 bg-brand-red text-white p-2 border-2 border-black brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all z-40"
                  title="删除此内容"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="aspect-square bg-slate-100 border-b-4 border-black relative overflow-hidden">
                  {(asset.status === 'loading' || asset.status === 'queued' || asset.status === 'processing') ? (
                     <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 animate-pulse">
                        <Loader2 className="w-12 h-12 mb-4 animate-spin text-brand-black" />
                        <span className="font-normal text-xs uppercase tracking-tighter italic">Rendering...</span>
                     </div>
                  ) : asset.status === 'failed' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-brand-cream gap-2">
                        <div className="bg-brand-red text-white border-2 border-black px-6 py-4 brutalist-shadow-sm flex flex-col items-center justify-center min-w-[140px]">
                           <AlertTriangle className="w-10 h-10 mb-2" />
                           <span className="font-bold text-xl uppercase tracking-tighter italic text-center">生成失败</span>
                        </div>
                        <span className="text-[10px] text-brand-red uppercase font-bold italic tracking-widest mt-2 bg-white px-2 border border-black">{asset.genTimeLabel || 'FAIL'}</span>
                     </div>
                  ) : asset.type === 'image' ? (
                    <img src={asset.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      {asset.status === 'completed' ? <video src={asset.url} className="w-full h-full object-cover" muted loop autoPlay /> : <Loader2 className="w-12 h-12 animate-spin text-brand-red" />}
                    </div>
                  )}
                  <div className={`absolute top-3 left-3 ${asset.status === 'failed' ? 'bg-black text-white' : asset.type === 'video' ? 'bg-brand-red text-white' : 'bg-brand-yellow'} border-2 border-black px-2 py-0.5 font-normal text-[9px] uppercase z-10`}>{asset.type}</div>
                  {asset.status === 'completed' && (
                    <div className="absolute inset-0 bg-brand-yellow/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
                        <button onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }} className="p-3 bg-white border-2 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none"><Maximize2 className="w-6 h-6"/></button>
                        <button onClick={(e) => handleAssetDownload(asset, e)} className="p-3 bg-white border-2 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none"><Download className="w-6 h-6"/></button>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[10px] text-brand-red bg-brand-yellow px-1.5 py-0.5 border border-black uppercase tracking-wider">
                      {asset.modelName} {asset.config?.aspectRatio ? `(${asset.config.aspectRatio})` : asset.config?.videoRatio ? `(${asset.config.videoRatio})` : ''}
                    </span>
                    <span className={`font-bold text-[10px] px-1.5 py-0.5 uppercase border border-black ${asset.status === 'failed' ? 'bg-brand-red text-white' : 'bg-black text-white'}`}>{asset.genTimeLabel}</span>
                  </div>
                  
                  <div className="relative group/prompt">
                    <p className="text-[11px] font-normal line-clamp-2 leading-tight pr-6 transition-colors group-hover/prompt:text-brand-blue" title={asset.prompt}>
                      "{asset.prompt}"
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPrompt(asset.prompt, asset.id);
                      }}
                      className="absolute top-0 right-0 opacity-0 group-hover/prompt:opacity-100 p-1 bg-white border border-black hover:bg-brand-yellow transition-all brutalist-shadow-sm flex items-center justify-center"
                      title="点击复制提示词"
                    >
                      {copiedId === asset.id ? <ClipboardCheck className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  
                  <div className="pt-2 flex gap-2 border-t border-slate-100">
                     <button disabled={asset.status !== 'completed' && asset.status !== 'failed'} onClick={(e) => { e.stopPropagation(); handleAssetRefresh(asset); }} className="flex-1 py-1.5 bg-white border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-yellow hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                        <RefreshCw className="w-3 h-3" /> 刷新
                     </button>
                     <button disabled={asset.status !== 'completed' || (asset.type === 'video' && !asset.modelId.includes('sora-2'))} onClick={(e) => { e.stopPropagation(); handleAssetEdit(asset); }} className="flex-1 py-1.5 bg-white border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-yellow hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                        <Edit className="w-3 h-3" /> 编辑
                     </button>
                     <button disabled={asset.status !== 'completed' || asset.type === 'video'} onClick={(e) => { e.stopPropagation(); handleAssetGenVideo(asset); }} className="flex-1 py-1.5 bg-white border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-red hover:text-white hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                        <Video className="w-3 h-3" /> 视频
                     </button>
                  </div>
                </div>
              </div>
            ))}

            {generatedAssets.length === 0 && (
              <div className="col-span-full h-[400px] border-4 border-dashed border-slate-300 flex flex-col items-center justify-center">
                <Bot className="w-32 h-32 opacity-10 mb-4" />
                <span className="font-normal text-4xl uppercase tracking-tighter opacity-10 italic">READY FOR ADVENTURE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSelecting && (
        <div className="fixed border-2 border-brand-blue z-[60] pointer-events-none" 
             style={{ 
               left: Math.min(selectionStart.x, selectionCurrent.x), 
               top: Math.min(selectionStart.y, selectionCurrent.y), 
               width: Math.abs(selectionCurrent.x - selectionStart.x), 
               height: Math.abs(selectionCurrent.y - selectionStart.y) 
             }} 
        />
      )}

      {activeModal === 'announcement' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[550px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="最新公告 / ANNOUNCEMENT" icon={Megaphone} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
              
              <div className="bg-brand-red text-white p-4 border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-2 animate-pulse">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <span className="font-bold text-lg italic uppercase tracking-wider text-center">
                  首次使用前，请设置API令牌
                </span>
              </div>

              <div className="space-y-4">
                 <div className="bg-[#fdf2f8] border-2 border-black p-4 brutalist-shadow-sm transition-transform hover:-translate-y-1">
                    <h3 className="font-bold text-lg mb-2 italic uppercase flex items-center gap-2">
                        <span className="bg-brand-red text-white px-2 py-0.5 text-xs border border-black">UPDATE</span>
                        功能更新
                    </h3>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                        1、新增 Kling Motion Control (动作迁移) 模型。<br/>
                        2、支持 sora 2 视频编辑。<br/>
                        3、新增AI智能助手。
                    </p>
                 </div>
              </div>
              
              <button onClick={() => setActiveModal(null)} className="w-full py-4 bg-black text-white border-4 border-white outline outline-2 outline-black font-bold text-xl brutalist-shadow hover:translate-y-1 hover:shadow-none transition-all uppercase tracking-tighter italic">
                我知道了 / I GOT IT
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[650px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="系统设置 / Settings" icon={Settings2} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
              <p className="text-lg font-bold text-brand-red leading-tight italic">
                API令牌分组：限时特价→企业级→default→优质gemini→逆向
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <a href={FIXED_BASE_URL} target="_blank" className="text-base font-bold uppercase text-black hover:text-brand-blue cursor-pointer underline flex items-center gap-1 italic">
                    API令牌获取地址 <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase italic">
                    <Lock className="w-3 h-3" /> 固定设置
                  </span>
                </div>
                <div className="relative">
                  <input type="text" value={FIXED_BASE_URL} readOnly className="w-full p-3 border-2 border-black font-bold text-lg bg-slate-100 text-slate-500 outline-none brutalist-input cursor-not-allowed italic" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-base font-bold uppercase text-black italic">API令牌 (KEY)</label>
                <input type="password" value={tempConfig.apiKey} onChange={e => setTempConfig({...tempConfig, apiKey: e.target.value})} placeholder="sk-..." className="w-full p-3 border-2 border-black font-bold text-lg focus:bg-brand-cream outline-none brutalist-input" />
              </div>
              <button onClick={saveConfig} className="w-full py-5 bg-brand-yellow border-4 border-black font-bold text-2xl brutalist-shadow hover:translate-y-1 hover:shadow-none transition-all uppercase tracking-tighter italic">
                保存设置/SAVE SETTINGS
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'links' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[500px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="联系客服 / CONTACT SUPPORT" icon={Headset} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
               {/* WeChat Card */}
               <div className="bg-brand-cream border-4 border-black p-6 flex flex-col items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                  <div className="absolute top-0 right-0 bg-brand-yellow px-3 py-1 border-l-2 border-b-2 border-black font-bold text-[10px] uppercase">Online</div>
                  <div className="w-16 h-16 bg-brand-blue text-white border-2 border-black rounded-full flex items-center justify-center brutalist-shadow-sm mb-2">
                      <Headset className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-2 w-full">
                      <h3 className="font-bold text-sm uppercase italic text-slate-500 tracking-widest">WeChat Support</h3>
                      <div className="flex w-full items-stretch">
                          <div className="bg-brand-green text-black px-4 flex items-center justify-center border-2 border-black border-r-0 font-black text-xl whitespace-nowrap tracking-tighter">
                            微信客服
                          </div>
                          <div className="bg-white border-2 border-black px-4 py-3 text-2xl font-black uppercase tracking-wider select-all cursor-text hover:bg-slate-50 transition-colors flex-1 text-center">
                              viva-api
                          </div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">Click text to copy / Long press</p>
                  </div>
               </div>

               <div className="w-full h-0.5 bg-slate-100 border-t-2 border-dashed border-slate-300"></div>

               {/* Recruitment & Docs */}
               <div className="space-y-4 text-center">
                  <div className="space-y-1">
                      <h4 className="font-bold text-lg uppercase italic flex items-center justify-center gap-2">
                          <span className="w-2 h-2 bg-brand-green rounded-full border border-black"></span>
                          招募优质API代理
                      </h4>
                      <p className="text-xs font-bold text-slate-500 italic px-4 leading-relaxed">
                          名额有限，欢迎想通过AI创业的伙伴加入。
                      </p>
                  </div>

                  <a href="https://ai.feishu.cn/wiki/O6Q9wrxxci898Wkj6ndcFnlknJd?from=from_copylink" target="_blank" className="flex items-center justify-center w-full py-4 bg-brand-red text-white border-4 border-transparent outline outline-2 outline-black font-bold text-lg uppercase hover:bg-black hover:translate-y-1 hover:shadow-none brutalist-shadow transition-all italic gap-2 group">
                      查看更多详情 <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform"/>
                  </a>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'usage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[550px] bg-brand-cream border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="Usage Flow (使用流程)" icon={BookOpen} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
              {[
                { n: '1', t: '注册与令牌', d: <>
                  前往主站 <a href="https://www.vivaapi.cn" target="_blank" className="text-blue-600 font-bold underline italic">www.vivaapi.cn</a> 注册并创建您的专属令牌。
                  <div className="mt-2 text-brand-red font-bold text-sm">API令牌分组：限时特价→企业级→default→优质gemini→逆向</div>
                </> },
                { n: '2', t: '配置使用', d: '点击本站上方设置 按钮，输入令牌即可开始创作。' },
                { n: '3', t: '查询日志', d: '使用记录及额度消耗情况请在主站后台查询。' }
              ].map(step => (
                <div key={step.n} className="relative bg-white border-2 border-black p-6 pt-8 brutalist-shadow-sm">
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-lg italic font-bold border-2 border-white">{step.n}</div>
                  <h3 className="font-bold text-xl mb-2 italic uppercase">{step.t}</h3>
                  <p className="text-base font-bold text-slate-500 leading-relaxed italic">{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'price' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[500px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="Price Desc (价格说明)" icon="¥" onClose={() => setActiveModal(null)} />
            <div className="p-0 max-h-[60vh] overflow-y-auto no-scrollbar">
              {[
                {
                  category: 'AI优化',
                  items: [
                    { m: 'gemini-3-flash-preview', p: '0.002元/次' }
                  ]
                },
                {
                  category: '图片模型',
                  items: [
                    { m: 'Nano Banana', p: '0.06元/张' },
                    { m: 'Nano Banana Pro', p: '0.22元-0.40元/张' },
                    { m: 'Kling Image O1', p: '0.24元/张' },
                    { m: 'gpt-image-1', p: '0.06元/张' },
                    { m: 'gpt-image-1.5', p: '0.06元/张' },
                    { m: 'Grok 4 Image', p: '0.06元/张' },
                    { m: 'Jimeng 4.5', p: '0.13元/张' },
                  ]
                },
                {
                  category: '视频模型',
                  items: [
                    { m: 'Kling Motion Ctrl', p: '0.595元/次' },
                    { m: 'VEO 3.1 FAST', p: '0.11元/条' },
                    { m: 'VEO 3.1 PRO', p: '2.45元/条' },
                    { m: 'Jimeng Video 3.0', p: '0.266元/条' },
                    { m: 'Sora 2', p: '0.08元/条' },
                    { m: 'Sora 2 Pro', p: '2.52元/条' },
                    { m: 'Grok Video 3', p: '0.14元/条' },
                  ]
                }
              ].map((cat) => (
                <div key={cat.category} className="border-b-4 border-black last:border-b-0">
                  <div className="bg-slate-700 text-white px-6 py-1 text-base font-bold uppercase tracking-wider flex items-center gap-2 italic">
                    <Sparkles className="w-3 h-3" /> {cat.category}
                  </div>
                  {cat.items.map((item, iidx) => (
                    <div key={iidx} className="flex justify-between items-center px-6 py-2 border-b-2 border-black last:border-b-0 bg-white hover:bg-brand-cream transition-colors">
                      <span className="text-xl font-mono font-bold text-black tracking-tight italic">{item.m}</span>
                      <span className="text-lg font-bold text-black italic">{item.p}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'edit-prompt' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl h-[80vh] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col">
            <ModalHeader title="提示词编辑 / PROMPT EDITOR" icon={Edit} onClose={() => setActiveModal(null)} />
            <div className="flex-1 p-6 flex flex-col gap-4 min-h-0">
                <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    placeholder="在此输入详细的提示词..." 
                    className="flex-1 w-full p-4 border-2 border-black font-normal text-xl bg-[#F8FAFC] focus:outline-none brutalist-input resize-none leading-relaxed italic" 
                />
                <div className="flex justify-between items-center pt-2">
                    <div className="text-xs text-slate-500 font-bold uppercase italic">
                        {prompt.length} CHARS
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setPrompt('')} className="px-4 py-2 bg-white border-2 border-black font-bold uppercase hover:bg-slate-100 transition-colors brutalist-shadow-sm text-xs">
                            清空 / Clear
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(prompt); }} className="px-4 py-2 bg-white border-2 border-black font-bold uppercase hover:bg-brand-yellow transition-colors brutalist-shadow-sm text-xs">
                            复制 / Copy
                        </button>
                        <button onClick={() => setActiveModal(null)} className="px-6 py-2 bg-brand-red text-white border-2 border-black font-bold uppercase hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm transition-all text-xs">
                            完成 / Done
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
      )}

      {activeModal === 'styles' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4">
          <div className="w-[1000px] max-w-full bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col max-h-[98vh]">
            <ModalHeader title="艺术风格选择 / ART STYLES" icon={Palette} onClose={() => setActiveModal(null)} bgColor="bg-brand-blue" />
            <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar bg-[#f8fafc]">
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                {STYLES.map(style => (
                  <button 
                    key={style.zh} 
                    onClick={() => selectStyle(`${style.zh} ${style.en}`)}
                    className="group p-2 md:p-3 bg-white border-2 md:border-4 border-black flex flex-col items-center justify-center gap-0.5 md:gap-1 brutalist-shadow-sm hover:translate-y-[-2px] hover:translate-x-[-1px] hover:bg-brand-yellow transition-all duration-200"
                  >
                    <span className="font-black text-sm md:text-lg text-black tracking-tight italic uppercase block leading-tight text-center">
                      {style.zh}
                    </span>
                    <span className="font-bold text-[8px] md:text-[9px] text-slate-500 group-hover:text-black/60 uppercase tracking-tight italic block leading-none text-center">
                      {style.en}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 md:p-4 border-t-4 border-black bg-brand-cream flex justify-between items-center flex-shrink-0">
              <p className="text-[10px] md:text-xs font-bold text-slate-500 italic uppercase">点击风格即可追加至提示词尾部 | 不含隐藏参数</p>
              <button onClick={() => setActiveModal(null)} className="px-4 md:px-8 py-1.5 md:py-2.5 bg-black text-white border-2 border-black font-bold uppercase tracking-tighter italic text-xs md:text-sm brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all">
                取消 / CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'save-prompt-confirm' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-[500px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col">
             <ModalHeader title="保存提示词 / SAVE PROMPT" icon={Save} onClose={() => setActiveModal(null)} bgColor="bg-brand-green" />
             <div className="p-8 space-y-4">
               <div className="space-y-1">
                 <label className="text-sm font-bold uppercase">提示词名称 / NAME</label>
                 <input 
                   type="text" 
                   value={saveName} 
                   onChange={(e) => setSaveName(e.target.value)} 
                   className="w-full p-3 border-2 border-black font-normal bg-slate-50 focus:bg-white focus:outline-none brutalist-input"
                   placeholder="为您的提示词起个名字"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-sm font-bold uppercase">分类 / CATEGORY</label>
                 <div className="relative">
                    <input 
                        type="text" 
                        value={saveCategory} 
                        onChange={(e) => setSaveCategory(e.target.value)} 
                        className="w-full p-3 pr-10 border-2 border-black font-normal bg-slate-50 focus:bg-white focus:outline-none brutalist-input"
                        placeholder="输入新分类或选择现有"
                    />
                    <button 
                        onClick={() => setShowSaveCategoryDropdown(!showSaveCategoryDropdown)}
                        className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center hover:bg-slate-200 transition-colors border-l-2 border-black"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {showSaveCategoryDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white border-2 border-black border-t-0 max-h-40 overflow-y-auto z-50 brutalist-shadow-sm">
                            {categories.map(c => (
                                <div 
                                    key={c}
                                    onClick={() => { setSaveCategory(c); setShowSaveCategoryDropdown(false); }}
                                    className="p-2 hover:bg-brand-yellow cursor-pointer text-sm font-bold border-b border-slate-100 last:border-0"
                                >
                                    {c}
                                </div>
                            ))}
                            {categories.length === 0 && <div className="p-2 text-xs text-slate-500 italic">暂无分类</div>}
                        </div>
                    )}
                 </div>
               </div>
               <div className="p-4 bg-brand-cream border-2 border-black border-dashed mt-4 max-h-[150px] overflow-y-auto">
                 <p className="text-xs text-slate-500 italic mb-1">PREVIEW:</p>
                 <p className="text-sm italic text-slate-800 line-clamp-4">{prompt}</p>
               </div>
               <div className="flex gap-4 pt-4">
                 <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-white border-2 border-black font-bold uppercase hover:bg-slate-100 transition-colors brutalist-shadow-sm">取消</button>
                 <button onClick={confirmSavePrompt} disabled={!saveName.trim()} className="flex-1 py-3 bg-brand-green border-2 border-black font-bold uppercase hover:translate-y-0.5 hover:shadow-none transition-all brutalist-shadow-sm disabled:opacity-50">确认保存</button>
               </div>
             </div>
           </div>
         </div>
      )}

      {activeModal === 'library' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-[900px] max-w-full bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col max-h-[90vh]">
                <ModalHeader title="提示词库 / PROMPT LIBRARY" icon={BookOpen} onClose={() => setActiveModal(null)} bgColor="bg-brand-purple text-white" />
                <div className="flex flex-1 min-h-0">
                    {/* Sidebar: Categories */}
                    <div className="w-64 border-r-4 border-black bg-brand-cream p-4 flex flex-col gap-3 overflow-y-auto">
                        {/* Add Category */}
                        {!isAddingCategory ? (
                            <button onClick={handleStartAddCategory} className="w-full py-2 border-2 border-black border-dashed bg-white hover:bg-brand-green hover:text-white transition-colors text-sm font-bold uppercase flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4"/> 新建分类
                            </button>
                        ) : (
                            <div className="flex gap-1">
                                <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full p-1 border-2 border-black text-sm" placeholder="Name..." autoFocus />
                                <button onClick={handleSaveNewCategory} className="bg-brand-green text-black border-2 border-black p-1"><Check className="w-4 h-4"/></button>
                            </div>
                        )}
                        
                        {/* Category List */}
                        {categories.map(cat => (
                            <div key={cat} onClick={() => setSelectedCategory(cat)} className={`p-2 border-2 border-black cursor-pointer flex justify-between items-center group ${selectedCategory === cat ? 'bg-brand-yellow brutalist-shadow-sm' : 'bg-white hover:bg-slate-100'}`}>
                                {renamingCat === cat ? (
                                     <input 
                                        value={renameInput} 
                                        onChange={e => setRenameInput(e.target.value)} 
                                        onBlur={handleFinishRenameCat}
                                        onKeyDown={e => e.key === 'Enter' && handleFinishRenameCat()}
                                        className="w-full p-0 bg-transparent border-b border-black text-sm font-bold focus:outline-none"
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                     />
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            {cat === '全部' ? <LayoutGrid className="w-3.5 h-3.5"/> : <Folder className="w-3.5 h-3.5"/>}
                                            <span className="font-bold text-sm truncate">{cat}</span>
                                        </div>
                                        <div className="hidden group-hover:flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleStartRenameCat(cat); }} className="p-0.5 hover:text-blue-600"><Edit className="w-3 h-3"/></button>
                                            <button onClick={(e) => handleDeleteCategory(cat, e)} className="p-0.5 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Main: Prompts List */}
                    <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
                         {libraryPrompts.filter(p => selectedCategory === '全部' || p.category === selectedCategory).map((p, idx) => (
                            <div 
                                key={p.id}
                                draggable={selectedCategory === '全部' && !editingLibraryId}
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                className="bg-white border-2 border-black p-3 brutalist-shadow-sm group hover:-translate-y-0.5 transition-transform"
                            >
                                {editingLibraryId === p.id ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input value={editingLibraryName} onChange={e => setEditingLibraryName(e.target.value)} className="flex-1 border-2 border-black p-1 text-sm font-bold" placeholder="Name" />
                                            <select value={editingLibraryCategory} onChange={e => setEditingLibraryCategory(e.target.value)} className="border-2 border-black p-1 text-sm">
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <textarea value={editingLibraryText} onChange={e => setEditingLibraryText(e.target.value)} className="w-full border-2 border-black p-2 text-sm h-20 resize-none" />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={(e) => handleCancelLibraryEdit(e)} className="px-3 py-1 bg-slate-200 border-2 border-black text-xs font-bold">Cancel</button>
                                            <button onClick={(e) => handleSaveLibraryEdit(p.id, e)} className="px-3 py-1 bg-brand-green border-2 border-black text-xs font-bold">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 items-start">
                                        {selectedCategory === '全部' && (
                                            <div className="cursor-move text-slate-400 hover:text-black self-center"><GripVertical className="w-4 h-4"/></div>
                                        )}
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => usePromptFromLibrary(p.text)}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-black text-sm uppercase">{p.name}</span>
                                                <span className="text-[10px] bg-slate-100 border border-black px-1 flex items-center gap-1 text-slate-500"><Tag className="w-2.5 h-2.5"/> {p.category}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 line-clamp-2 italic">"{p.text}"</p>
                                        </div>
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => usePromptFromLibrary(p.text)} className="p-1 bg-brand-yellow border-2 border-black hover:scale-110"><Check className="w-3 h-3"/></button>
                                            <button onClick={(e) => handleStartLibraryEdit(p, e)} className="p-1 bg-white border-2 border-black hover:scale-110"><Edit className="w-3 h-3"/></button>
                                            <button onClick={(e) => removePromptFromLibrary(p.id, e)} className="p-1 bg-brand-red text-white border-2 border-black hover:scale-110"><Trash2 className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                         ))}
                         {libraryPrompts.length === 0 && <div className="text-center text-slate-400 italic mt-10">暂无提示词 / No Prompts</div>}
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeModal === 'video-remix' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-[500px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
                <ModalHeader title="视频重绘 / VIDEO REMIX" icon={Film} onClose={() => setActiveModal(null)} />
                <div className="p-6 space-y-4">
                    <div className="bg-slate-100 p-3 border-2 border-black text-xs text-slate-500 italic">
                        基于原视频: <span className="font-bold text-black">{remixingAsset?.id.slice(0,8)}...</span>
                    </div>
                    <textarea 
                        value={remixPrompt}
                        onChange={(e) => setRemixPrompt(e.target.value)}
                        className="w-full h-32 p-3 border-2 border-black focus:outline-none focus:bg-brand-cream resize-none text-sm"
                        placeholder="输入新的提示词进行重绘..."
                    />
                    <button onClick={executeVideoRemix} className="w-full py-3 bg-brand-red text-white border-2 border-black font-bold uppercase hover:shadow-none hover:translate-y-0.5 brutalist-shadow-sm transition-all">
                        开始重绘 / START REMIX
                    </button>
                </div>
            </div>
        </div>
      )}

      {previewAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8 animate-in fade-in" onClick={() => setPreviewAsset(null)}>
          <div className="bg-white border-4 border-black max-w-6xl w-full h-full max-h-[95vh] brutalist-shadow flex flex-col relative" onClick={e => e.stopPropagation()}>
            <div className="bg-brand-yellow p-4 border-b-4 border-black flex justify-between items-center relative flex-shrink-0">
              <span className="font-bold uppercase text-2xl text-black italic">PREVIEW ASSET</span>
              <button onClick={() => setPreviewAsset(null)} 
                      className="absolute -top-4 -right-4 bg-brand-red text-white p-2 border-4 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all z-[110]">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="flex-1 bg-slate-200 flex items-center justify-center overflow-hidden p-4">
              {previewAsset.type === 'image' ? (
                <img src={previewAsset.url} className="max-w-full max-h-full border-4 border-black shadow-2xl object-contain" />
              ) : (
                <video src={previewAsset.url} controls autoPlay className="max-w-full max-h-full border-4 border-black shadow-2xl" />
              )}
            </div>
            <div className="p-6 md:p-8 bg-white flex flex-col md:flex-row justify-between items-start md:items-end gap-6 flex-shrink-0">
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-widest italic">PROMPT:</p>
                <div className="relative group/preview-prompt">
                  <p className="text-lg md:text-2xl font-bold leading-tight line-clamp-2 italic" title={previewAsset.prompt}>"{previewAsset.prompt}"</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCopyPrompt(previewAsset.prompt, 'preview'); }}
                    className="absolute -top-1 -right-1 opacity-0 group-hover/preview-prompt:opacity-100 p-1.5 bg-brand-yellow border-2 border-black brutalist-shadow-sm transition-all"
                    title="复制完整提示词"
                  >
                    {copiedId === 'preview' ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs md:text-sm font-bold text-brand-red uppercase mt-2 italic">{previewAsset.modelName} | {previewAsset.genTimeLabel}</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                 <button onClick={() => setPreviewAsset(null)} className="flex-1 md:flex-none px-6 md:px-10 py-3 md:py-4 bg-white border-4 border-black font-bold text-lg md:text-xl uppercase hover:translate-y-1 transition-all tracking-tighter italic">关闭</button>
                 <a href={previewAsset.url} download className="flex-1 md:flex-none px-8 md:px-12 py-3 md:py-4 bg-brand-red text-white border-4 border-black brutalist-shadow-sm font-bold text-lg md:text-xl uppercase hover:shadow-none hover:translate-y-1 transition-all text-center tracking-tighter italic">DOWNLOAD</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewRefImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-8 animate-in fade-in" onClick={() => setPreviewRefImage(null)}>
          <div className="bg-white border-4 border-black max-w-6xl w-full brutalist-shadow flex flex-col relative" onClick={e => e.stopPropagation()}>
            <div className="bg-brand-purple text-white p-4 border-b-4 border-black flex justify-between items-center relative">
              <span className="font-bold uppercase text-2xl italic">REFERENCE PREVIEW</span>
              <button onClick={() => setPreviewRefImage(null)} 
                      className="absolute -top-4 -right-4 bg-brand-red text-white p-2 border-4 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all z-[120]">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="p-4 bg-slate-200 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img src={previewRefImage.data.startsWith('http') ? previewRefImage.data : `data:${previewRefImage.mimeType};base64,${previewRefImage.data}`} className="max-w-full max-h-full border-4 border-black shadow-2xl object-contain" />
            </div>
            <div className="p-8 bg-white flex justify-end">
                 <button onClick={() => setPreviewRefImage(null)} className="px-12 py-4 bg-brand-red text-white border-4 border-black brutalist-shadow-sm font-bold text-2xl uppercase hover:shadow-none hover:translate-y-1 transition-all text-center tracking-tighter italic">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);