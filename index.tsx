import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Settings2, Sparkles, Video, 
  Loader2, Download,
  Bot, X, AlertCircle, Plus,
  RefreshCw, Edit, Maximize2, Check,
  Square, CheckSquare, Megaphone, ExternalLink,
  History, Copy, ClipboardCheck, Trash2,
  AlertTriangle, Palette, Bookmark, Wand2, GripVertical, Save,
  Image as ImageIcon, BookOpen, Headset, Shield,
  Paperclip, FileText, Music, Mic, Volume2,
  User, VolumeX, AudioLines, MessageSquare,
  ChevronLeft, ChevronRight, MessageSquarePlus, Zap, Eraser, ArrowUp,
  ChevronDown, Brush, Brain, Monitor, ArrowDown, FolderOpen, Frown,
  MegaphoneOff, Link, Globe
} from 'lucide-react';

// --- Types & Declarations ---

declare var process: {
  env: {
    API_KEY?: string;
    [key: string]: any;
  }
};

type ModalType = 'settings' | 'links' | 'usage' | 'price' | 'support' | 'edit-prompt' | 'styles' | 'library' | 'save-prompt-confirm' | 'video-remix' | 'announcement' | null;
type MainCategory = 'image' | 'video' | 'proxy' | 'audio' | 'chat' | 'announcement' | 'resources';

interface AppConfig {
  baseUrl: string;
  apiKey: string;
}

interface GeneratedAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  prompt: string;
  modelName: string;
  durationText: string;
  genTimeLabel: string;
  modelId: string;
  timestamp: number;
  status?: 'queued' | 'processing' | 'completed' | 'failed' | 'loading';
  taskId?: string;
  config?: any;
  coverUrl?: string;
  title?: string;
}

interface ReferenceImage {
  id: string;
  data: string;
  mimeType: string;
  uploadStatus?: 'uploading' | 'success' | 'failed';
  duration?: number;
}

interface ReferenceAudio {
  id: string;
  data: string;
  mimeType: string;
  name: string;
  duration: number;
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

interface ChatMessage {
    role: 'user' | 'model' | 'system';
    text: string;
    files?: { type: string; data: string; file?: File }[];
    error?: boolean;
    isDivider?: boolean;
}

interface DialogueLine {
  id: string;
  speakerId: string;
  text: string;
}

// --- Constants ---

const FIXED_BASE_URL = 'https://www.vivaapi.cn';
const INITIAL_CHAT_MESSAGE_TEXT = '我可以帮你解答问题、分析文档或处理多媒体内容。支持上传: 文本, 图片, 音频, 视频, PDF以及更多格式。';

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
  '9:21': '9:21 (垂直全景)',
  '32:9': '32:9 (超级宽屏)',
  '1:3': '1:3 (长条图)',
  '3:1': '3:1 (长横图)',
  '1:4': '1:4 (极长图)',
  '4:1': '4:1 (长横幅)',
  '原图比例': '原图比例 (Source)',
  'Default': '默认比例 (Default)'
};

const EXTENDED_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const GPT1_RATIOS = ['1:1', '2:3', '3:2'];
const GPT15_RATIOS = ['1:1', '2:3', '3:2'];
const GROK_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const KLING_O1_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

const MODELS: ModelDefinition[] = [
  { 
    id: 'gemini-2.5-flash-image', 
    name: 'Gemini-2.5-Flash-Image', 
    cost: 'Flash',
    features: ['fast', 'multimodal'],
    maxImages: 4,
    supportedAspectRatios: EXTENDED_RATIOS,
    supportedResolutions: ['AUTO']
  },
  { 
    id: 'gemini-3-pro-image-preview', 
    name: 'Gemini-3-Pro-Image', 
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
    maxImages: 1,
    supportedAspectRatios: GROK_RATIOS,
    supportedResolutions: ['AUTO']
  }
];

const CHAT_MODELS = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
    { id: 'gpt-5-mini', name: 'GPT 5 Mini' },
];

const MODEL_CAPABILITIES: Record<string, { image: boolean; audio: boolean; video: boolean; pdf: boolean; any?: boolean }> = {
    'gemini-2.5-flash': { image: true, audio: true, video: true, pdf: true },
    'gemini-3-flash-preview': { image: true, audio: true, video: true, pdf: true },
    'gemini-3-pro-preview': { image: true, audio: true, video: true, pdf: true, any: true },
    'gpt-5.2': { image: true, audio: true, video: true, pdf: true },
    'gpt-5-mini': { image: true, audio: false, video: false, pdf: true },
    'grok-4.1': { image: true, audio: false, video: false, pdf: true },
};

const VIDEO_MODELS = [
  {
    id: 'seedance-2.0',
    name: 'Seedance 2.0',
    desc: '高清/多比例',
    supportedAspectRatios: ['9:16', '16:9', '1:1', '3:4', '4:3', '21:9'],
    options: [
      { q: '标清' },
      { q: '高清' }
    ]
  },
  { 
    id: 'sora-2-all', 
    name: 'Sora-2-All', 
    desc: '标清视频', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '10', q: '标清'}, 
      {s: '15', q: '标清'}
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
    id: 'grok-video-3',
    name: 'Grok Video 3',
    desc: '标清视频', 
    supportedAspectRatios: ['9:16', '16:9', '2:3', '3:2', '1:1'],
    options: [
      {s: '6', q: '标清'},
      {s: '10', q: '标清', modelIdOverride: 'grok-video-3-10s'},
      {s: '15', q: '标清', modelIdOverride: 'grok-video-3-15s'},
      {s: '15', q: '高清', modelIdOverride: 'grok-video-3-15s'}
    ] 
  },
  { 
    id: 'veo_3_1-fast-4K', 
    name: 'VEO 3.1 FAST 4K', 
    desc: '4K/高清/音视', 
    supportedAspectRatios: ['16:9', '9:16'],
    options: [
      {s: '8', q: '4K'}
    ] 
  },
  { 
    id: 'veo_3_1-fast-components-4K', 
    name: 'VEO 3.1 多图融合 4K', 
    desc: '3垫图/4K', 
    supportedAspectRatios: ['16:9', '9:16'],
    options: [
      {s: '8', q: '4K'}
    ] 
  },
  { 
    id: 'kling-motion-control', 
    name: 'KLING CONTROL动作转移', 
    desc: '自定义元素', 
    supportedAspectRatios: ['Default'],
    options: [
      {s: 'AUTO', q: '标准模式'},
      {s: 'AUTO', q: '高品质模式'} 
    ] 
  },
  { 
    id: 'kling-avatar-image2video', 
    name: 'KLING AVATAR数字人', 
    desc: '图生视频', 
    supportedAspectRatios: ['原图比例'],
    options: [
      {s: 'AUTO', q: '标准模式'}, {s: 'AUTO', q: '高品质模式'}
    ] 
  },
  { 
    id: 'sora-2-pro-all', 
    name: 'Sora-2-Pro-All', 
    desc: '高清/长效', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '15', q: '高清'}, 
      {s: '25', q: '标清'}
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
  }
];

const AUDIO_MODELS = [
  { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro TTS' }
];

const VOICES = [
  { id: 'Puck', name: 'Puck (男声 - 欢快/青年)' },
  { id: 'Charon', name: 'Charon (男声 - 沉稳/成熟)' },
  { id: 'Zephyr', name: 'Zephyr (女声 - 明亮/青年)' },
  { id: 'Aoede', name: 'Aoede (女声 - 温柔/治愈)' },
  { id: 'Fenrir', name: 'Fenrir (男声 - 激昂/充满活力)' },
  { id: 'Kore', name: 'Kore (女声 - 干练/冷静)' },
  { id: 'Orus', name: 'Orus (男声 - 商务/自信)' },
  { id: 'Leda', name: 'Leda (女声 - 甜美/少女)' }
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
  { zh: "折纸", en: "Knitted" },
  { zh: "毛毡", en: "Felt" },
  { zh: "针织", en: "Knitted" }
];

const CAMERA_MOVES = ["环绕下摇", "环绕推进", "上升推进", "围绕主体运镜", "固定镜头", "手持镜头", "拉远", "推进", "跟随", "右摇", "上摇", "下摇", "环绕"];
const CAMERA_SPEEDS = ["慢速"];
const SHOT_TYPES = ["近景", "中景", "远景", "仰视", "俯视", "景深", "正面视角", "侧面视角", "特写", "无人机拍摄"];
const LIGHTING_STYLES = ["阳光", "灯光", "柔和光", "霓虹光"];
const COMPOSITION_STYLES = ["丰富细节", "背景简约"];
const ATMOSPHERE_STYLES = ["神秘", "宁静", "温馨", "生动", "色彩艳丽"];

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

const base64PcmToWavBlob = (base64: string, sampleRate: number = 24000) => {
    try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        const numChannels = 1;
        
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + bytes.length, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); 
        view.setUint16(20, 1, true); 
        view.setUint16(22, numChannels, true); 
        view.setUint32(24, sampleRate, true); 
        view.setUint32(28, sampleRate * numChannels * 2, true); 
        view.setUint16(32, numChannels * 2, true); 
        view.setUint16(34, 16, true); 
        writeString(view, 36, 'data');
        view.setUint32(40, bytes.length, true);

        return new Blob([wavHeader, bytes], { type: 'audio/wav' });
    } catch (e) {
        console.error("PCM to WAV conversion failed", e);
        return null;
    }
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
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
const DB_VERSION = 4;

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

const renderMessageContent = (text: string) => {
    const codeBlockRegex = /(```[\s\S]*?```)/g;
    const segments = text.split(codeBlockRegex);
    
    return segments.map((segment, i) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
            return <span key={i}>{segment}</span>;
        }
        
        const parts = segment.split(/(\*\*[\s\S]+?\*\*)/g);
        return (
            <span key={i}>
                {parts.map((part, j) => {
                     if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                         return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
                     }
                     return part;
                })}
            </span>
        );
    });
};

// --- ChatView Component ---

interface ChatViewProps {
    config: AppConfig;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    attachments: { file: File, preview: string, type: string }[];
    setAttachments: React.Dispatch<React.SetStateAction<{ file: File, preview: string, type: string }[]>>;
    setActiveModal: (modal: ModalType) => void;
    modelId: string;
    setModelId: React.Dispatch<React.SetStateAction<string>>;
}

const ChatView = ({ 
    config, messages, setMessages, 
    input, setInput, isLoading, setIsLoading,
    attachments, setAttachments,
    setActiveModal,
    modelId, setModelId
}: ChatViewProps) => {
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        
        const capabilities = MODEL_CAPABILITIES[modelId];
        let hasUnsupported = false;

        const validFiles = Array.from(files).filter((file: File) => {
             // If model supports any file type, skip specific checks
             if (capabilities?.any) return true;

             let type = 'file';
             if (file.type.startsWith('image/')) type = 'image';
             else if (file.type.startsWith('audio/')) type = 'audio';
             else if (file.type.startsWith('video/')) type = 'video';
             else if (file.type === 'application/pdf') type = 'pdf';
             
             if (capabilities) {
                 if (type === 'image' && !capabilities.image) { hasUnsupported = true; return false; }
                 if (type === 'audio' && !capabilities.audio) { hasUnsupported = true; return false; }
                 if (type === 'video' && !capabilities.video) { hasUnsupported = true; return false; }
                 if (type === 'pdf' && !capabilities.pdf) { hasUnsupported = true; return false; }
             }
             return true;
        });

        if (hasUnsupported) {
            alert('该模型不支持该文件类型');
        }

        validFiles.forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                let type = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type === 'application/pdf') type = 'pdf';
                // else type remains 'file' for unsupported mime types if allowed by ANY
                
                setAttachments(prev => [...prev, { file, preview: result, type }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const removeAttachment = (idx: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const handleModelChange = (newModelId: string) => {
        if (newModelId === modelId) {
            setIsModelDropdownOpen(false);
            return;
        }
        const modelName = CHAT_MODELS.find(m => m.id === newModelId)?.name || newModelId;
        setModelId(newModelId);
        setMessages(prev => [...prev, { 
            role: 'system', 
            text: `已切换模型至 ${modelName}`, 
            isDivider: true 
        }]);
        setIsModelDropdownOpen(false);
    };

    const generateResponse = async (history: ChatMessage[]) => {
        setIsLoading(true);
        try {
            const key = (config.apiKey || (typeof process !== 'undefined' && process.env && process.env.API_KEY ? process.env.API_KEY : '')).trim();
            if (!key) throw new Error("请先设置API Key");

            // Context Clearing Logic: Find the last divider and only send messages after it
            const lastDividerIndex = history.map(m => !!m.isDivider).lastIndexOf(true);
            const activeHistory = history.slice(lastDividerIndex + 1).filter(m => !m.isDivider && m.role !== 'system');
            
            const systemPromptText = "你是一个智能助手。请严格遵守以下规则：\n1. **语言限制**：无论用户输入什么语言，你**必须全程使用中文**进行回复（代码片段除外）。\n2. **文件分析**：如果用户上传了文件，请仔细分析文件内容并用中文回答相关问题。\n3. **禁止思考内容**：直接输出最终答案，**严禁**输出思考过程、思维链(Chain of Thought)、<think>标签或内部独白。\n4. **直接回复**：不包含无意义的开场白或客套话。";
            let responseText = "";
            let targetModelId = modelId;

            // Handle Thinking Variant for Gemini 3 Pro
            if (modelId === 'gemini-3-pro-preview' && isThinking) {
                targetModelId = 'gemini-3-pro-preview-thinking';
            }

            // OpenAI Compatible format for all chat models (including Gemini via proxy)
            const messages: any[] = [
                { role: "system", content: systemPromptText }
            ];

            activeHistory.forEach(msg => {
                const role = msg.role === 'model' ? 'assistant' : 'user';
                if (msg.files && msg.files.length > 0) {
                    const content: any[] = [{ type: "text", text: msg.text }];
                    msg.files.forEach(f => {
                         // Support images for OpenAI endpoint compatibility. 
                         // For Gemini models via proxy, we also pass other supported types as image_url if the proxy supports multimodal input this way,
                         // but for safety we stick to images or check if it's a Gemini model to be more permissive.
                         const isGemini = targetModelId.startsWith('gemini');
                         if (f.type === 'image' || (f.file && f.file.type.startsWith('image/')) || isGemini) {
                             content.push({
                                 type: "image_url",
                                 image_url: { url: f.data }
                             });
                         }
                    });
                    messages.push({ role, content });
                } else {
                    messages.push({ role, content: msg.text });
                }
            });

            const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: targetModelId,
                    messages: messages,
                    stream: false
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.choices?.[0]?.message?.content || "No response";
            
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
            files: attachments.map(a => ({ type: a.type, data: a.preview, file: a.file }))
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
        const newHistory = messages.slice(0, idx);
        setMessages(newHistory);
        generateResponse(newHistory);
    };

    const handleNewTopic = () => {
        setMessages([{ role: 'model', text: INITIAL_CHAT_MESSAGE_TEXT }]);
        setInput('');
        setAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClearInput = () => {
        setInput('');
    };
    
    const handleClearContext = () => {
        // Prevent adding multiple dividers in a row
        if (messages.length > 0 && !messages[messages.length - 1].isDivider) {
             setMessages(prev => [...prev, { role: 'system', text: '上下文已清除 / Context Cleared', isDivider: true }]);
        }
    };

    const getIconForType = (type: string) => {
        switch(type) {
            case 'image': return <ImageIcon className="w-4 h-4"/>;
            case 'audio': return <Music className="w-4 h-4"/>;
            case 'video': return <Video className="w-4 h-4"/>;
            case 'pdf': return <FileText className="w-4 h-4"/>;
            default: return <FileText className="w-4 h-4"/>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#fdfdfd] border-t-0 border-black relative">
            {/* Top Bar - Model Selection */}
            <div className="border-b border-gray-100 bg-white relative z-50">
                <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-black font-medium text-base">选择模型</span>
                        <div className="relative">
                            <button 
                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                className="flex items-center gap-2 cursor-pointer hover:opacity-80 font-medium text-base text-black transition-opacity"
                            >
                                <span>{CHAT_MODELS.find(m => m.id === modelId)?.name || modelId}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isModelDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[240px] py-1 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                        {CHAT_MODELS.map(m => (
                                            <button 
                                                key={m.id}
                                                onClick={() => handleModelChange(m.id)}
                                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium flex items-center justify-between group transition-colors
                                                    ${modelId === m.id ? 'bg-gray-50 text-black' : 'text-gray-600'}
                                                `}
                                            >
                                                <span>{m.name}</span>
                                                {modelId === m.id && <Check className="w-4 h-4 text-green-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white no-scrollbar pb-48">
                <div className="max-w-6xl mx-auto p-4 space-y-6">
                {messages.map((msg, idx) => {
                    if (msg.isDivider) {
                        return (
                            <div key={idx} className="flex items-center justify-center my-6">
                                <div className="bg-gray-100 text-gray-500 text-xs px-4 py-1.5 rounded-full flex items-center gap-2 border border-gray-200 shadow-sm animate-in fade-in zoom-in-95">
                                    {msg.text.includes('切换') ? <Sparkles className="w-3 h-3 text-yellow-500" /> : <Eraser className="w-3 h-3" />}
                                    <span>{msg.text}</span>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2`}>
                            <div 
                                className={`max-w-[85%] p-4 text-base leading-relaxed shadow-sm rounded-2xl
                                ${msg.role === 'user' 
                                    ? 'bg-[#F4F4F5] text-gray-800' 
                                    : 'bg-white border border-gray-200 text-gray-700'
                                }`}
                            >
                                {msg.files && msg.files.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {msg.files.map((f, i) => (
                                            <div key={i} className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${msg.role === 'user' ? 'bg-white' : 'bg-gray-100'}`}>
                                                {getIconForType(f.type === 'application/pdf' ? 'pdf' : f.type.split('/')[0])}
                                                {f.type.includes('image') ? 'Image' : 'File'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className={`whitespace-pre-wrap font-sans ${msg.error ? 'text-red-500' : ''}`}>
                                    {renderMessageContent(msg.text)}
                                </div>
                            </div>
                            {msg.role === 'model' && !msg.error && (
                                <div className="flex items-center gap-2 mt-2 px-1 opacity-100 transition-opacity">
                                        <button onClick={() => handleCopy(msg.text, idx)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="复制">
                                            {copiedId === idx ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                                        </button>
                                        {idx > 0 && (
                                        <button onClick={() => handleRegenerate(idx)} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50" title="重新生成">
                                            <RefreshCw className={`w-4 h-4 ${isLoading && idx === messages.length -1 ? 'animate-spin' : ''}`}/>
                                        </button>
                                        )}
                                        <button onClick={() => handleDelete(idx)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors" title="删除">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-2 shadow-sm">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            <span className="text-xs text-gray-400">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
                </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white z-20">
                <div className="max-w-6xl mx-auto bg-[#F4F4F5] rounded-xl p-3 relative flex flex-col transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-gray-100 border border-transparent focus-within:border-gray-200">
                    <div className="flex-1 relative px-2 pt-2">
                         {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2 max-h-[120px] overflow-y-auto px-1">
                                {attachments.map((att, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-[#E0F2F1] text-[#00695C] px-3 py-2 rounded-xl text-sm border border-[#B2DFDB] max-w-full w-fit animate-in fade-in zoom-in-95">
                                        <div className="shrink-0">
                                           {getIconForType(att.type)}
                                        </div>
                                        <span className="truncate max-w-[150px] font-medium" title={att.file.name}>{att.file.name}</span>
                                        <button onClick={() => removeAttachment(i)} className="text-[#00695C] hover:text-[#D32F2F] ml-1 p-0.5 hover:bg-[#B2DFDB] rounded-full transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <textarea 
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="在这里输入消息，按 Enter 发送"
                            className="w-full bg-transparent border-none resize-none focus:ring-0 outline-none text-base text-gray-800 placeholder:text-gray-400 min-h-[72px] max-h-[144px] overflow-y-auto chat-input-scrollbar"
                        />
                    </div>
                    
                    <div className="flex items-center justify-between px-1 pb-1 mt-auto">
                         <div className="flex items-center gap-2">
                             <button onClick={handleNewTopic} className="text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-colors" title="新话题"><MessageSquarePlus className="w-5 h-5"/></button>
                             <button onClick={() => fileInputRef.current?.click()} className="text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-colors" title="上传">
                                 <Paperclip className="w-5 h-5"/>
                                 <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    multiple 
                                    accept={MODEL_CAPABILITIES[modelId]?.any ? "*" : "image/*,audio/*,video/*,application/pdf"}
                                    onChange={handleFileSelect}
                                 />
                             </button>
                             <button onClick={() => setActiveModal('library')} className="text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-colors" title="快捷短语"><Zap className="w-5 h-5"/></button>
                             <button onClick={handleClearInput} className="text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-colors" title="清空输入"><Brush className="w-5 h-5"/></button>
                             <button onClick={() => setActiveModal('edit-prompt')} className="text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-colors" title="展开"><Maximize2 className="w-5 h-5"/></button>
                             <button onClick={handleClearContext} className="text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-colors" title="清除上下文"><Eraser className="w-5 h-5"/></button>
                             {modelId === 'gemini-3-pro-preview' && (
                                <button
                                   onClick={() => setIsThinking(!isThinking)}
                                   className={`rounded-full p-2 transition-colors ${isThinking ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                                   title={isThinking ? "关闭深度思考" : "开启深度思考"}
                                >
                                   <Brain className="w-5 h-5" />
                                </button>
                             )}
                         </div>
                         
                         <button 
                            onClick={sendMessage}
                            disabled={isLoading || (!input.trim() && attachments.length === 0)}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200
                                ${isLoading 
                                    ? 'bg-gray-100 text-black cursor-not-allowed' 
                                    : (input.trim() || attachments.length > 0)
                                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-md transform hover:scale-105'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                         >
                             {isLoading ? (
                                 <Square className="w-3 h-3 animate-pulse fill-current" />
                             ) : (
                                 <ArrowUp className="w-6 h-6" strokeWidth={2} />
                             )}
                         </button>
                    </div>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-gray-300">AI生成内容仅供参考</p>
                </div>
            </div>
        </div>
    );
};

// ... (Sub-components: SectionLabel, CircularButton, ModalHeader remain the same)

const SectionLabel = ({ text, link }: { text: string, link?: { href: string, text: string } }) => (
  <div className="border-b border-black pb-1 mb-3 flex justify-between items-end">
    <label className="text-base font-medium uppercase italic tracking-wide cursor-default">
      {text}
    </label>
    {link && (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs font-normal uppercase tracking-normal text-blue-600 hover:text-black flex items-center gap-1 transition-colors">
        <BookOpen className="w-3 h-3"/> {link.text}
      </a>
    )}
  </div>
);

const ModalHeader = ({ title, icon: Icon, onClose, bgColor = "bg-brand-yellow" }: { title: string, icon: any, onClose: () => void, bgColor?: string }) => (
  <div className={`${bgColor} p-4 border-b-2 border-black flex justify-between items-center relative flex-shrink-0`}>
    <div className="flex items-center gap-3">
      {Icon && typeof Icon === 'string' ? <span className="text-3xl font-bold">{Icon}</span> : Icon && <Icon className="w-8 h-8" />}
      <h2 className="text-3xl font-bold italic tracking-wide uppercase">{title}</h2>
    </div>
    <button onClick={onClose} 
            className="absolute -top-4 -right-4 bg-brand-red text-white p-2 border-2 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all z-[80]">
      <X className="w-7 h-7" />
    </button>
  </div>
);

const PRICE_DATA = [
  {
    category: 'AI对话',
    items: [
      { m: 'Gemini-3-Flash-Preview', p: '提示0.3000/ 1M tokens，补全1.26/ 1M tokens' },
      { m: 'Gemini-3-Pro-Preview', p: '提示1.20/ 1M tokens，补全7.20/ 1M tokens' },
      { m: 'GPT-5-Mini', p: '提示0.15/ 1M tokens，补全1.20/ 1M tokens' }
    ]
  },
  {
    category: '图片创作',
    items: [
      { m: 'Gemini-2.5-Flash-Image', p: '0.06元/张' },
      { m: 'Gemini-3-Pro-Image', p: '1K/2K 0.14元/张，4K 0.25元/张' },
      { m: 'KLING Image O1', p: '0.24元/张' },
      { m: 'GPT Image 1', p: '0.06元/张' },
      { m: 'GPT Image 1.5', p: '0.06元/张' },
      { m: 'Grok 4 Image', p: '0.06元/张' },
    ]
  },
  {
    category: '视频创作',
    items: [
      { m: 'Sora 2', p: 'default分组 0.14元/条，sora-vip分组 0.56元/条' },
      { m: 'VEO 3.1 Fast', p: '0.126元/条' },
      { m: 'Grok Video 3', p: '6s 0.14元/条，10s 0.28元/条，15S 0.35元/条' },
      { m: 'VEO 3.1 Fast 4K', p: '0.181元/条' },
      { m: 'VEO 3.1 Mix 4K (多图融合)', p: '0.361元/条' },
      { m: 'KLING Control Std (动作转移)', p: '0.595元/秒' },
      { m: 'KLING Control Pro (动作转移)', p: '0.952元/秒' },
      { m: 'KLING Avatar Std (数字人)', p: '0.476元/秒' },
      { m: 'KLING Avatar Pro (数字人)', p: '0.952元/秒' },
      { m: 'Sora 2 Pro', p: '2.52元/条' },
      { m: 'VEO 3.1 Pro', p: '2.45元/条' },
    ]
  },
  {
    category: '语音合成',
    items: [
      { m: 'Gemini 2.5 Pro TTS', p: '提示0.50/ 1M tokens，补全12.00/ 1M tokens' },
    ]
  }
];

const PriceView = () => {
    const [expanded, setExpanded] = useState<Record<number, boolean>>(
        PRICE_DATA.reduce((acc, _, idx) => ({...acc, [idx]: true}), {})
    );

    const toggle = (idx: number) => {
        setExpanded(prev => ({...prev, [idx]: !prev[idx]}));
    };

    return (
        <div className="p-0 overflow-y-auto no-scrollbar flex-1 bg-[#F8FAFC]">
            {PRICE_DATA.map((cat, idx) => (
                <div key={idx} className="border-b-2 border-black last:border-b-0">
                  <div 
                    onClick={() => toggle(idx)}
                    className="bg-brand-yellow px-5 py-2 border-b border-black flex items-center justify-between gap-2 sticky top-0 z-10 shadow-sm cursor-pointer hover:bg-[#e6c000] transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-bold uppercase tracking-tight">{cat.category}</span>
                    </div>
                    <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${expanded[idx] ? 'rotate-180' : 'rotate-0'}`} />
                  </div>
                  
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded[idx] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="divide-y divide-black/5 bg-white">
                        {cat.items.map((item, iidx) => (
                          <div key={iidx} className="flex justify-between items-center px-6 py-4 hover:bg-brand-cream transition-colors group">
                            <span className="text-lg font-medium text-slate-800 group-hover:text-black">{item.m}</span>
                            <span className="text-base font-bold font-mono text-black bg-slate-100 px-3 py-1 border border-slate-200 rounded-sm group-hover:border-black group-hover:bg-white transition-colors">
                                {item.p}
                            </span>
                          </div>
                        ))}
                      </div>
                  </div>
                </div>
            ))}
        </div>
    );
};

const App = () => {
  const [mainCategory, setMainCategory] = useState<MainCategory>('image');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMarqueeVisible, setIsMarqueeVisible] = useState(true);
  
  // Chat state moved here for persistence
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: 'model', text: INITIAL_CHAT_MESSAGE_TEXT }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<{ file: File, preview: string, type: string }[]>([]);
  const [chatModelId, setChatModelId] = useState('gemini-3-flash-preview');

  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [selectedVideoModel, setSelectedVideoModel] = useState(VIDEO_MODELS[0].id);
  const [selectedAudioModel, setSelectedAudioModel] = useState(AUDIO_MODELS[0].id);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [audioGenMode, setAudioGenMode] = useState<'single' | 'multi'>('single');
  const [speakerMap, setSpeakerMap] = useState<{id: string, name: string, voice: string}[]>([
    { id: '1', name: '角色A', voice: 'Puck' },
    { id: '2', name: '角色B', voice: 'Zephyr' }
  ]);
  const [videoOptionIdx, setVideoOptionIdx] = useState(0);
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [isSyncAudio, setIsSyncAudio] = useState(false);
  const [klingOrientation, setKlingOrientation] = useState('video');
  const [klingKeepSound, setKlingKeepSound] = useState(false);
  const [klingDubVol, setKlingDubVol] = useState(1.0);
  const [klingSrcVol, setKlingSrcVol] = useState(0.0);
  const [isTransparent, setIsTransparent] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>('announcement');
  const [previewAsset, setPreviewAsset] = useState<GeneratedAsset | null>(null);
  const [previewRefImage, setPreviewRefImage] = useState<ReferenceImage | null>(null);
  const [config, setConfig] = useState<AppConfig>({ baseUrl: FIXED_BASE_URL, apiKey: '' });
  const [tempConfig, setTempConfig] = useState<AppConfig>(config);
  const [prompt, setPrompt] = useState('');
  const [libraryPrompts, setLibraryPrompts] = useState<SavedPrompt[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceVideos, setReferenceVideos] = useState<ReferenceImage[]>([]);
  const [referenceAudios, setReferenceAudios] = useState<ReferenceAudio[]>([]);
  const [imageSize, setImageSize] = useState('AUTO');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generationCount, setGenerationCount] = useState(1);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draggedPromptIdx, setDraggedPromptIdx] = useState<number | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([]);
  const [seedanceDuration, setSeedanceDuration] = useState(10);
  
  // Library State & other states...
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [editingLibraryText, setEditingLibraryText] = useState('');
  const [editingLibraryName, setEditingLibraryName] = useState('');
  const [editingLibraryCategory, setEditingLibraryCategory] = useState('');
  // const [selectedCategory, setSelectedCategory] = useState('全部');
  const [tempSelectedStyles, setTempSelectedStyles] = useState<string[]>([]);
  // const [renamingCat, setRenamingCat] = useState<string | null>(null);
  // const [renameInput, setRenameInput] = useState('');
  // const [isAddingCategory, setIsAddingCategory] = useState(false);
  // const [newCategoryName, setNewCategoryName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  // const [showSaveCategoryDropdown, setShowSaveCategoryDropdown] = useState(false);
  const [remixingAsset, setRemixingAsset] = useState<GeneratedAsset | null>(null);
  const [remixPrompt, setRemixPrompt] = useState('');
  
  const [resourceItems, setResourceItems] = useState([
    { id: 'tts', name: '文字转语音', desc: '免费TTS，多语言支持，无限次生成。', url: 'https://ttsmaker.cn/', icon: 'Mic' },
    { id: 'img-conv', name: '图片格式转换', desc: '支持JPG, PNG, BMP, WEBP等多种格式互转。', url: 'https://www.xunjietupian.com/', icon: 'ImageIcon' },
    { id: 'uu-remote', name: '网易UU远程', desc: '网易出品，免费高清流畅的远程控制软件。', url: 'https://uuyc.163.com', icon: 'Monitor' },
    { id: 'img-url', name: '图片转URL链接', desc: '快速将图片转换为在线URL链接。', url: 'https://lsky.zhongzhuan.chat', icon: 'Link' },
    { id: 'vpn', name: '科学上网（付费）', desc: '高速稳定的网络加速服务。', url: 'https://cm.caomeiyun.top/#/register?code=iPB4QjfQ', icon: 'Globe' }
  ]);
  const [draggedResourceIdx, setDraggedResourceIdx] = useState<number | null>(null);

  const galleryRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);

  const safeEnvKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

  const isVideoMode = mainCategory === 'video';
  const isProxyMode = mainCategory === 'proxy';
  const isAudioMode = mainCategory === 'audio';
  const isChatMode = mainCategory === 'chat';
  const isAnnouncementMode = mainCategory === 'announcement';
  const isResourcesMode = mainCategory === 'resources';
  
  // Determine if we should show the full-width view (like Chat, Proxy, Announcement)
  const isFullWidthMode = isChatMode || isProxyMode || isAnnouncementMode || isResourcesMode;

  const handleSaveShortcut = () => {
    const shortcut = `[InternetShortcut]
URL=${window.location.href}
`;
    const blob = new Blob([shortcut], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ViVa AI助手.url';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parsePromptToLines = (text: string, speakers: typeof speakerMap) => {
      const lines: DialogueLine[] = [];
      if (!text.trim()) return lines;
      
      const rawLines = text.split('\n');
      rawLines.forEach(line => {
          const match = line.match(/^([^:：]+)[:：]\s*(.+)$/);
          if (match) {
              const name = match[1].trim();
              const content = match[2].trim();
              const speaker = speakers.find(s => s.name === name);
              if (speaker) {
                  lines.push({ id: generateUUID(), speakerId: speaker.id, text: content });
              } else {
                  lines.push({ id: generateUUID(), speakerId: speakers[0]?.id || '1', text: content });
              }
          } else {
              if (line.trim()) {
                   if (lines.length === 0) {
                        lines.push({ id: generateUUID(), speakerId: speakers[0]?.id || '1', text: line.trim() });
                   } else {
                        lines[lines.length - 1].text += '\n' + line.trim();
                   }
              }
          }
      });
      return lines;
  };

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Sync Dialogue Lines to Prompt when in Multi Audio Mode
  useEffect(() => {
    if (isAudioMode && audioGenMode === 'multi') {
        const text = dialogueLines.map(line => {
             const speaker = speakerMap.find(s => s.id === line.speakerId);
             const name = speaker ? speaker.name : (speakerMap.length > 0 ? speakerMap[0].name : 'Unknown');
             return `${name}：${line.text}`;
        }).join('\n');
        if (text !== prompt) setPrompt(text);
    }
  }, [dialogueLines, speakerMap]);

  // ... (useEffects for models remain same) ...
  useEffect(() => {
    if (!isVideoMode && !isProxyMode && !isAudioMode && !isChatMode && !isAnnouncementMode && !isResourcesMode) {
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
          if (model.options && videoOptionIdx >= model.options.length) {
              setVideoOptionIdx(0);
          }
      }
    }
  }, [selectedModel, selectedVideoModel, mainCategory, aspectRatio, imageSize, videoRatio, isVideoMode]);

  useEffect(() => {
    if (error && error.includes('张参考图')) {
      const currentModel = MODELS.find(m => m.id === selectedModel);
      let max = 4;
      if (!isVideoMode) {
          max = currentModel?.maxImages || 4;
      } else {
          if (selectedVideoModel === 'kling-avatar-image2video' || selectedVideoModel === 'kling-motion-control') {
              max = 1;
          } else if (selectedVideoModel === 'veo_3_1-fast-components-4K') {
              max = 3;
          } else {
              max = selectedVideoModel.startsWith('veo') ? 2 : 1;
          }
      }

      if (referenceImages.length <= max) {
        setError(null);
      }
    }
  }, [referenceImages, selectedModel, selectedVideoModel, mainCategory, error, isVideoMode]);

  // ... (Other useEffects same) ...
  
  useEffect(() => {
    if (isVideoMode && selectedVideoModel === 'kling-motion-control') {
        setKlingKeepSound(true);
    }
  }, [isVideoMode, selectedVideoModel]);

  useEffect(() => {
    if (activeModal === 'edit-prompt') {
      if (mainCategory !== 'chat') {
         setPrompt(prev => prev.replace(/([。])(?!\s*\n)/g, '$1\n\n').replace(/(\. )/g, '.\n\n'));
      }
    }
  }, [activeModal, mainCategory]);

  useEffect(() => {
    getAllAssetsFromDB().then(assets => {
        // Filter out music assets to avoid issues
        const validAssets = assets.filter((a: any) => a.type !== 'music');
        const sorted = validAssets.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setGeneratedAssets(sorted);
        sorted.filter(a => a.type === 'video' && a.modelId !== 'kling-video' && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => startVideoPolling(v.taskId!, v.id, v.timestamp, v.modelId));
        
        sorted.filter(a => a.type === 'image' && a.modelId === 'kling-image-o1' && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => startKlingImagePolling(v.taskId!, v.id, v.timestamp));
        
        sorted.filter(a => a.type === 'video' && (a.modelId === 'kling-video' || a.modelId === 'kling-avatar-image2video' || a.modelId === 'kling-motion-control') && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => {
                  let endpointType = 'text2video';
                  if (v.modelId === 'kling-avatar-image2video') {
                     endpointType = 'avatar/image2video';
                  } else if (v.modelId === 'kling-motion-control') {
                     endpointType = 'motion-control';
                  } else {
                     endpointType = v.config?.referenceImages?.length > 0 ? 'image2video' : 'text2video';
                  }
                  startKlingVideoPolling(v.taskId!, v.id, v.timestamp, endpointType);
              });
    });

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

    const promptCats = new Set(loadedPrompts.map(p => p.category));
    const mergedCats = Array.from(new Set([...loadedCategories, ...promptCats])).sort();
    
    setLibraryPrompts(loadedPrompts);
    setCategories(mergedCats);
  }, []);

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

  // ... (Polling, helpers, upload functions - no changes needed, reusing existing)
  
  const saveConfig = () => {
    const normalized = { ...tempConfig, baseUrl: FIXED_BASE_URL };
    setConfig(normalized);
    setTempConfig(normalized);
    localStorage.setItem('viva_config', JSON.stringify(normalized));
    setActiveModal(null);
    setError(null);
  };
  
  const updateAssetStatus = async (id: string, status: 'completed' | 'failed', label: string, url?: string) => {
      setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status, label: label, ...(url ? { url } : {}) } : a));
      const assets = await getAllAssetsFromDB();
      const existing = assets.find(a => a.id === id);
      if (existing) {
          saveAssetToDB({ ...existing, status, genTimeLabel: label, ...(url ? { url } : {}) });
      }
  };

  const startKlingImagePolling = (taskId: string, assetId: string, startTime: number) => {
    const interval = setInterval(async () => {
        let key = (configRef.current.apiKey || safeEnvKey).trim();
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const url = `${configRef.current.baseUrl}/kling/v1/images/omni-image/${taskId}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } });
            
            if (res.status >= 400) {
                 updateAssetStatus(assetId, 'failed', '请求失败');
                 clearInterval(interval);
                 return;
            }

            const data = await res.json();
            
            if (data.code !== 0 && data.code !== 200) { 
                 if (!data.data) {
                      updateAssetStatus(assetId, 'failed', data.message || 'API Error');
                      clearInterval(interval);
                      return;
                 }
            }
            
            const taskStatus = data.data?.task_status || '';
            
            if (taskStatus === 'succeed') {
                 const images = data.data?.task_result?.images;
                 const imageUrl = images && images.length > 0 ? images[0].url : null;
                 
                 if (imageUrl) {
                    const finishTime = Date.now();
                    const diff = Math.round((finishTime - startTime) / 1000);
                    updateAssetStatus(assetId, 'completed', `${diff}s`, imageUrl);
                 } else {
                     updateAssetStatus(assetId, 'failed', '无图');
                 }
                 clearInterval(interval);
            } else if (taskStatus === 'failed') {
                 const errorMsg = data.data?.task_status_msg || '失败';
                 updateAssetStatus(assetId, 'failed', errorMsg);
                 clearInterval(interval);
            }
        } catch (e) {
            console.error("Polling error for kling task", taskId, e);
        }
    }, 2000);
  };

  const startKlingVideoPolling = (taskId: string, assetId: string, startTime: number, endpointType: string) => {
    const interval = setInterval(async () => {
        let key = (configRef.current.apiKey || safeEnvKey).trim();
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const url = `${configRef.current.baseUrl}/kling/v1/videos/${endpointType}/${taskId}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } });
            
            if (res.status >= 400) {
                 updateAssetStatus(assetId, 'failed', '请求失败');
                 clearInterval(interval);
                 return;
            }

            const data = await res.json();
            
            if (data.code !== 0 && data.code !== 200) { 
                 if (!data.data) {
                      updateAssetStatus(assetId, 'failed', data.message || 'API Error');
                      clearInterval(interval);
                      return;
                 }
            }

            const taskStatus = data.data?.task_status || '';
            const taskResult = data.data?.task_result;
            
            if (taskStatus === 'succeed') {
                 const videoUrl = taskResult?.videos?.[0]?.url;
                 if (videoUrl) {
                    const finishTime = Date.now();
                    const diff = Math.round((finishTime - startTime) / 1000);
                    updateAssetStatus(assetId, 'completed', `${diff}s`, videoUrl);
                 } else {
                     updateAssetStatus(assetId, 'failed', '无视频');
                 }
                 clearInterval(interval);
            } else if (taskStatus === 'failed') {
                 const errorMsg = data.data?.task_status_msg || '失败';
                 updateAssetStatus(assetId, 'failed', errorMsg);
                 clearInterval(interval);
            }
        } catch (e) {
            console.error("Polling error for kling video task", taskId, e);
        }
    }, 3000);
  };

  const startVideoPolling = (taskId: string, assetId: string, startTime: number, modelId: string) => {
    const interval = setInterval(async () => {
        let key = (configRef.current.apiKey || safeEnvKey).trim();
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const isVeoGrokJimeng = (modelId.startsWith('veo') && !modelId.includes('4K')) || modelId.startsWith('grok') || modelId.startsWith('jimeng') || modelId.startsWith('kling');
            const url = isVeoGrokJimeng ? `${configRef.current.baseUrl}/v1/video/query?id=${taskId}` : `${configRef.current.baseUrl}/v1/videos/${taskId}`;
            
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' } });
            
            if (res.status >= 400) {
                 const errText = await res.text();
                 try {
                    const errJson = JSON.parse(errText);
                    const msg = errJson.message || errJson.error?.message || `HTTP ${res.status}`;
                    updateAssetStatus(assetId, 'failed', msg);
                 } catch (e) {
                    updateAssetStatus(assetId, 'failed', `HTTP ${res.status}`);
                 }
                 clearInterval(interval);
                 return;
            }

            const data = await res.json();
            
            // Check for API level error objects
            if (data.error) {
                 updateAssetStatus(assetId, 'failed', data.error.message || 'API Error');
                 clearInterval(interval);
                 return;
            }

            const rawStatus = (data.status || data.state || data.data?.status || '').toLowerCase();
            const videoUrl = data.video_url || data.url || data.uri || data.data?.url || data.data?.video_url;

            const isSuccess = ['completed', 'succeeded', 'success', 'done'].includes(rawStatus);
            const isFailed = ['failed', 'error', 'rejected'].includes(rawStatus);

            if (isSuccess && videoUrl) {
                const finishTime = Date.now();
                const diff = Math.round((finishTime - startTime) / 1000);
                updateAssetStatus(assetId, 'completed', `${diff}s`, videoUrl);
                clearInterval(interval);
            } else if (isFailed) {
                const reason = data.fail_reason || data.error_msg || data.error || '失败';
                updateAssetStatus(assetId, 'failed', reason);
                clearInterval(interval);
            }
        } catch (e) { 
            console.error("Polling error for task", taskId, e); 
        }
    }, 3000);
  };
  
  const resetInputState = () => {
    setPrompt('');
    setReferenceImages([]);
    setReferenceVideos([]);
    setReferenceAudios([]);
    setError(null);
    setDialogueLines([]);
  };

  const handleAudioModeChange = (mode: 'single' | 'multi') => {
      setAudioGenMode(mode);
      if (mode === 'multi') {
          const lines = parsePromptToLines(prompt, speakerMap);
          setDialogueLines(lines);
      }
  };

  // ... (Other handlers are reused directly from original code) ...
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentModel = MODELS.find(m => m.id === selectedModel);
    
    let max = 4;
    if (!isVideoMode) {
        max = currentModel?.maxImages || 4;
    } else {
        if (selectedVideoModel === 'kling-avatar-image2video' || selectedVideoModel === 'kling-motion-control') {
            max = 1;
        } else if (selectedVideoModel === 'veo_3_1-fast-components-4K') {
            max = 3;
        } else if (selectedVideoModel === 'seedance-2.0') {
            max = 9;
        } else {
            max = selectedVideoModel.startsWith('veo') ? 2 : 1;
        }
    }

    if (isVideoMode && selectedVideoModel === 'seedance-2.0') {
        const totalFiles = referenceImages.length + referenceVideos.length + referenceAudios.length + files.length;
        if (totalFiles > 12) { setError('文件总数不能超过 12 个'); return; }
    }

    const remaining = max - referenceImages.length;
    if (remaining <= 0) { 
      setError(`当前模型最多支持 ${max} 张参考图`); 
      return; 
    }
    
    Array.from(files).slice(0, Math.max(0, remaining)).forEach((file: File) => {
      if (file.size > 10 * 1024 * 1024) {
          setError(`图片 ${file.name} 超过 10MB 限制`);
          return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
         setError(`图片 ${file.name} 格式不支持，请使用 JPG 或 PNG`);
         return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const matches = result.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            const mime = matches[1].toLowerCase();
            if (mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'image/jpg') {
                 setError(`不支持的图片格式: ${mime}。请使用 JPG/PNG。`);
                 return;
            }
            
            const newItem: ReferenceImage = { id: generateUUID(), mimeType: matches[1], data: matches[2] };
            setReferenceImages(prev => [...prev, newItem]);
        }
      };
      reader.readAsDataURL(file as Blob);
    });
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (selectedVideoModel === 'seedance-2.0') {
        const totalFiles = referenceImages.length + referenceVideos.length + referenceAudios.length + files.length;
        if (totalFiles > 12) { setError('文件总数不能超过 12 个'); return; }
        if (referenceVideos.length + files.length > 3) { setError('视频最多上传 3 个'); return; }
    } else {
        if (referenceVideos.length + files.length > 1) { setError('当前模型仅支持 1 个视频'); return; }
    }

    let currentTotalDuration = referenceVideos.reduce((acc, v) => acc + (v.duration || 0), 0);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 100 * 1024 * 1024) {
            setError(`视频 ${file.name} 超过 100MB 限制`);
            continue;
        }

        try {
            const duration = await new Promise<number>((resolve, reject) => {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                    URL.revokeObjectURL(video.src);
                    resolve(video.duration);
                };
                video.onerror = () => {
                    URL.revokeObjectURL(video.src);
                    reject(new Error('Load failed'));
                };
                video.src = URL.createObjectURL(file);
            });

            if (selectedVideoModel === 'seedance-2.0') {
                if (currentTotalDuration + duration > 15) {
                    setError(`视频总时长超过 15 秒 (当前: ${currentTotalDuration.toFixed(1)}s, 新增: ${duration.toFixed(1)}s)`);
                    break;
                }
                currentTotalDuration += duration;
            }

            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                const newVideo: ReferenceImage = { id: generateUUID(), mimeType: matches[1], data: matches[2], duration };
                setReferenceVideos(prev => [...prev, newVideo]);
                setError(null);
            }
        } catch (err) {
            setError(`无法读取视频文件 ${file.name}`);
        }
    }
    e.target.value = '';
  };
  
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (selectedVideoModel === 'seedance-2.0') {
        const totalFiles = referenceImages.length + referenceVideos.length + referenceAudios.length + files.length;
        if (totalFiles > 12) { setError('文件总数不能超过 12 个'); return; }
        if (referenceAudios.length + files.length > 3) { setError('音频最多上传 3 个'); return; }
    } else {
        if (referenceAudios.length + files.length > 1) { setError('当前模型仅支持 1 个音频'); return; }
    }

    let currentTotalDuration = referenceAudios.reduce((acc, a) => acc + (a.duration || 0), 0);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/x-m4a'];
        if (!validTypes.some(type => file.type.includes(type) || file.type.startsWith('audio/'))) {
            setError(`不支持的音频格式 ${file.name}，请上传 MP3, WAV, M4A 或 AAC`);
            continue;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            setError(`音频文件 ${file.name} 大小不能超过 5MB`);
            continue;
        }

        try {
            const duration = await new Promise<number>((resolve, reject) => {
                const audio = new Audio(URL.createObjectURL(file));
                audio.onloadedmetadata = () => {
                    URL.revokeObjectURL(audio.src);
                    resolve(audio.duration);
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(audio.src);
                    reject(new Error('Load failed'));
                };
            });

            if (selectedVideoModel === 'seedance-2.0') {
                if (currentTotalDuration + duration > 15) {
                    setError(`音频总时长超过 15 秒`);
                    break;
                }
                currentTotalDuration += duration;
            } else {
                if (duration < 2 || duration > 60) {
                    setError('音频时长需在 2~60 秒之间');
                    continue;
                }
            }

            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                setReferenceAudios(prev => [...prev, { 
                    id: generateUUID(), 
                    mimeType: matches[1], 
                    data: matches[2],
                    name: file.name,
                    duration: duration
                }]);
                setError(null);
            }
        } catch (err) {
             setError(`无法读取音频文件 ${file.name}`);
        }
    }
    e.target.value = '';
  };

  const removeReferenceImage = (id: string) => setReferenceImages(prev => prev.filter(img => img.id !== id));
  const removeReferenceVideo = (id: string) => setReferenceVideos(prev => prev.filter(v => v.id !== id));
  const removeReferenceAudio = (id: string) => setReferenceAudios(prev => prev.filter(a => a.id !== id));

  const optimizePrompt = async () => {
     // ... same as before
     if (!prompt.trim() && referenceImages.length === 0) return;
     
     let key = (config.apiKey || safeEnvKey).trim();
     if (!key) { setError("请先设置API Key"); return; }
     
     setIsOptimizing(true);
     const effectivePrompt = prompt.trim() || (referenceImages.length > 0 ? "请描述这张图片的内容，用于生成类似的创作。" : "");
     
     let sys = `你是一位专业的AI绘画提示词工程师。
请将用户的输入（可能是简短的中文或英文）结合提供的参考图片（如果有），改写成一段高质量、细节丰富的中文绘画提示词。
分析图片的主体、风格、构图，并将其与用户的文字描述融合。
扩展核心元素：主体、风格、光影、构图和氛围。
不要有多余的解释，只输出优化后的提示词文本。`;

     if (isVideoMode) {
       const modelList = VIDEO_MODELS;
       const selectedId = selectedVideoModel;
       const optionIdx = videoOptionIdx;
       
       const currentVideoModelDef = modelList.find(m => m.id === selectedId);
       const durationOption = currentVideoModelDef?.options[optionIdx];
       const durationSeconds = (durationOption as any)?.s || '未知';

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
     } else if (isAudioMode) {
       if (audioGenMode === 'multi') {
           sys = `你是一位精通多角色对话剧本创作的专家。你的任务是为对话添加表演指导。

请严格遵循以下规则：
1. **保持原义**：**绝对禁止**修改、润色或改写用户的原始对话内容。必须原封不动地保留原文。
2. **添加指导**：分析对话语境，在每一句台词内容的**最前方**添加关于【风格】、【语气】、【口音】或【节奏】的自然语言指导（使用括号包裹）。
3. **格式要求**：
   RoleName: (指导内容) 原始对话内容
   RoleName: (指导内容) 原始对话内容

RoleName必须严格对应用户输入中的角色名。`;
       } else {
           sys = `你是一位精通语音合成（TTS）的提示词优化专家。你的任务是为用户的输入添加语音风格、语气、口音和语速指令。

请严格遵循以下规则：
1. **保持原义**：**绝对禁止**修改、润色或改写用户的原始文本内容。必须原封不动地保留原文。
2. **前置指令**：根据文本内容分析情感，在文本的**最前方**添加自然语言指令（使用括号包裹），描述应采用的【风格】、【语气】、【口音】或【节奏】。
   - 格式必须为：“(指令描述) [原始文本]”
   - 例如用户输入“为什么会这样”，输出：“(用悲伤、缓慢且略带颤抖的语气说) 为什么会这样”
   - 例如用户输入“咱们今儿个真高兴”，输出：“(用欢快、急促的节奏，带有京腔口音说) 咱们今儿个真高兴”

只输出最终结果，不要包含任何解释。`;
       }
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
        if (optimized) { 
            if (isAudioMode && audioGenMode === 'multi') {
                const newLines = parsePromptToLines(optimized, speakerMap);
                setDialogueLines(newLines);
                // Prompt will be auto-updated by useEffect
            } else {
                setPrompt(optimized); 
            }
            setError(null); 
        }
     } catch (e: any) { setError("AI优化失败: " + (e.message || "未知错误")); } finally { setIsOptimizing(false); }
  };

  // ... (Styles, Library, Drag handlers remain the same) ...
  const toggleStyle = (style: string, categoryItems: string[], isMulti: boolean) => {
    setTempSelectedStyles(prev => {
      let newStyles = [...prev];
      if (!isMulti) {
        newStyles = newStyles.filter(s => !categoryItems.includes(s));
        const wasSelected = prev.includes(style);
        if (!wasSelected) {
            newStyles.push(style);
        }
        return newStyles;
      } else {
        if (prev.includes(style)) {
          return prev.filter(s => s !== style);
        } else {
          return [...prev, style];
        }
      }
    });
  };

  const applyStyles = () => {
    if (tempSelectedStyles.length === 0) {
      setActiveModal(null);
      return;
    }
    setPrompt(prev => {
      const trimmed = prev.trim();
      const toAdd = tempSelectedStyles.join(', ');
      if (!trimmed) return toAdd;
      
      const lastChar = trimmed.slice(-1);
      const separator = (['.', '。', ',', '，'].includes(lastChar)) ? ' ' : ', ';
      return trimmed + separator + toAdd;
    });
    setTempSelectedStyles([]);
    setActiveModal(null);
  };

  // ... (Style render function same) ...
  const renderStyleSection = (title: string, items: string[], isMulti: boolean = false) => (
      <div className="mb-5">
        <h4 className="font-normal text-lg mb-2 uppercase flex items-center gap-2">
            <span className="w-1.5 h-5 bg-black"></span>
            {title} {isMulti && <span className="text-xs text-slate-500 font-normal">(多选)</span>}
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {items.map(item => (
                <button 
                    key={item}
                    onClick={() => toggleStyle(item, items, isMulti)}
                    className={`py-1 px-1 border border-black text-sm font-normal transition-all duration-200 truncate ${
                        tempSelectedStyles.includes(item) 
                        ? 'bg-brand-yellow text-black' 
                        : 'bg-white hover:bg-brand-cream text-slate-700 hover:text-black'
                    }`}
                    title={item}
                >
                    {item}
                </button>
            ))}
        </div>
      </div>
  );
  
  // ... (Library handlers same) ...
  const handleOpenSaveModal = () => {
    if (!prompt.trim()) return;
    setSaveName(prompt.slice(0, 8));
    setSaveCategory('默认');
    // setShowSaveCategoryDropdown(false);
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
    
    const updated = [newPrompt, ...libraryPrompts];
    setLibraryPrompts(updated);
    localStorage.setItem('viva_library_prompts', JSON.stringify(updated));

    if (!categories.includes(cat)) {
        const newCats = [...categories, cat].sort();
        setCategories(newCats);
        localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    }
    // setSelectedCategory(cat);
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
    
    if (mainCategory === 'chat') {
        setChatInput(prev => prev ? prev + '\n' + text : text);
    } else {
        if (isAudioMode && audioGenMode === 'multi') {
            const lines = parsePromptToLines(text, speakerMap);
            setDialogueLines(lines);
        }
        setPrompt(text);
    }
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
    
    const updated = libraryPrompts.map(p => p.id === id ? { ...p, text: editingLibraryText, name: editingLibraryName, category: editingLibraryCategory } : p);
    setLibraryPrompts(updated);
    localStorage.setItem('viva_library_prompts', JSON.stringify(updated));
    setEditingLibraryId(null);
    
    let newCats = [...categories];
    let changed = false;

    if (editingLibraryCategory && !newCats.includes(editingLibraryCategory)) {
        newCats.push(editingLibraryCategory);
        newCats.sort();
        changed = true;
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
  
  /*
  const handleStartAddCategory = () => {
      setIsAddingCategory(false);
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

    const newPrompts = libraryPrompts.map(p => p.category === oldName ? {...p, category: newName} : p);
    setLibraryPrompts(newPrompts);
    localStorage.setItem('viva_library_prompts', JSON.stringify(newPrompts));

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
        const newPrompts = libraryPrompts.filter(p => p.category !== catName);
        setLibraryPrompts(newPrompts);
        localStorage.setItem('viva_library_prompts', JSON.stringify(newPrompts));
    }
    
    const newCats = categories.filter(c => c !== catName);
    setCategories(newCats);
    localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    if (selectedCategory === catName) setSelectedCategory('全部');
  };
  */

  const handleDragStart = (idx: number) => {
    if (editingLibraryId) return;
    setDraggedPromptIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (editingLibraryId) return;
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
  
  // Resource Drag Handlers
  const handleResourceDragStart = (idx: number) => {
    setDraggedResourceIdx(idx);
  };

  const handleResourceDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedResourceIdx === null || draggedResourceIdx === idx) return;
    
    const items = [...resourceItems];
    const draggedItem = items[draggedResourceIdx];
    items.splice(draggedResourceIdx, 1);
    items.splice(idx, 0, draggedItem);
    
    setDraggedResourceIdx(idx);
    setResourceItems(items);
  };

  const handleResourceDragEnd = () => {
    setDraggedResourceIdx(null);
  };

  // ... (Generation handlers reused) ...
  const executeAudioGeneration = async (overrideConfig?: any) => {
    // ... same as before
    const tPrompt = overrideConfig?.prompt ?? prompt;
    const tModelId = overrideConfig?.modelId ?? selectedAudioModel;
    const tVoice = overrideConfig?.selectedVoice ?? selectedVoice;
    const tAudioMode = overrideConfig?.audioGenMode ?? audioGenMode;
    const tSpeakerMap = overrideConfig?.speakerMap ?? speakerMap;
    // Removed unused tRefAudio declaration

    if (!tPrompt) { setError("请输入文本"); return; }
    
    let key = (config.apiKey || safeEnvKey).trim();
    if (!key) { setError("请先设置API Key"); return; }

    const placeholderId = generateUUID();
    const startTime = Date.now();
    
    // --- Standard TTS Logic ---
    let durationText = 'Audio';
    if (tAudioMode === 'single') {
        durationText = VOICES.find(v => v.id === tVoice)?.name || tVoice;
    } else {
        durationText = `Multi-Speaker (${tSpeakerMap.length})`;
    }

    const placeholder: GeneratedAsset = {
        id: placeholderId, url: '', type: 'audio', prompt: tPrompt,
        modelId: tModelId, modelName: MODELS.find(m => m.id === tModelId)?.name || AUDIO_MODELS.find(m => m.id === tModelId)?.name || tModelId,
        durationText: durationText,
        genTimeLabel: '生成中...',
        timestamp: startTime, status: 'loading',
        config: { 
            modelId: tModelId, 
            selectedVoice: tVoice, 
            prompt: tPrompt, 
            type: 'audio',
            audioGenMode: tAudioMode,
            speakerMap: tSpeakerMap
        }
    };

    setGeneratedAssets(prev => [placeholder, ...prev]);
    setError(null);

    try {
        const generationConfig: any = {
            responseModalities: ["AUDIO"]
        };

        if (tAudioMode === 'single') {
            generationConfig.speechConfig = {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: tVoice }
                }
            };
        } else {
             if (tSpeakerMap.length === 0) throw new Error("Please add at least one speaker");
             generationConfig.speechConfig = {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: tSpeakerMap.map((s: any) => ({
                        speaker: s.name,
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: s.voice }
                        }
                    }))
                }
            };
        }

        const res = await fetch(`${config.baseUrl}/v1beta/models/${tModelId}:generateContent`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: tPrompt }] }],
                generationConfig: generationConfig
            })
        });

        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message || "TTS Request Failed");

        const audioPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        
        if (audioPart && audioPart.inlineData) {
            const base64Audio = audioPart.inlineData.data;
            const wavBlob = base64PcmToWavBlob(base64Audio, 24000);
            if (!wavBlob) throw new Error("Audio conversion failed");
            
            const audioUrl = URL.createObjectURL(wavBlob);
            
            const diff = Math.round((Date.now() - startTime) / 1000);
            const updated: GeneratedAsset = {
                ...placeholder,
                url: audioUrl,
                genTimeLabel: `${diff}s`,
                status: 'completed',
                timestamp: Date.now()
            };
            
            setGeneratedAssets(prev => prev.map(a => a.id === placeholderId ? updated : a));
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                saveAssetToDB({ ...updated, url: base64data }); 
            };
            reader.readAsDataURL(wavBlob);

        } else {
            throw new Error("No audio data returned");
        }

    } catch (err: any) {
        setError(err.message);
        setGeneratedAssets(prev => prev.map(a => a.id === placeholderId ? { ...a, status: 'failed', genTimeLabel: '失败' } : a));
    }
  };

  const executeVideoGeneration = async (overrideConfig?: any) => {
    // ... same as before
    const tModelId = overrideConfig?.modelId ?? selectedVideoModel;
    const tPrompt = overrideConfig?.prompt ?? prompt;
    const isKlingModel = ['kling-motion-control', 'kling-avatar-image2video'].includes(tModelId) || tModelId === 'kling-video'; // Including kling-video if it exists implicitly or via older assets

    if (!tPrompt && tModelId !== 'kling-avatar-image2video' && tModelId !== 'kling-motion-control') { 
        setError("请输入提示词"); 
        return; 
    }
    
    let key = (config.apiKey || safeEnvKey).trim();
    if (!key) { setError("请先设置API Key"); return; }
    
    const modelList = VIDEO_MODELS;
    const modelDef = modelList.find(m => m.id === tModelId);
    
    if (!modelDef) {
       setError("模型配置未找到，可能已下架");
       return;
    }

    const placeholders: GeneratedAsset[] = [];
    const isSingleGenModel = tModelId === 'kling-avatar-image2video' || tModelId === 'kling-motion-control';
    const count = (overrideConfig || isSingleGenModel) ? 1 : generationCount;
    const startTime = Date.now();
    
    const tRatio = overrideConfig?.videoRatio ?? videoRatio;
    let tOptIdx = overrideConfig?.videoOptionIdx ?? videoOptionIdx;
    const tSeedanceDuration = overrideConfig?.seedanceDuration ?? seedanceDuration;
    
    if (modelDef && modelDef.options && tOptIdx >= modelDef.options.length) {
        tOptIdx = 0;
    }

    // Determine actual API model ID
    let apiModelId = tModelId;
    const selectedOption = modelDef?.options?.[tOptIdx] as any;
    if (selectedOption?.modelIdOverride) {
        apiModelId = selectedOption.modelIdOverride;
    }

    const tSyncAudio = overrideConfig?.isSyncAudio ?? isSyncAudio;
    const tRefs = overrideConfig?.referenceImages ?? referenceImages;
    const tRefVideos = overrideConfig?.referenceVideos ?? referenceVideos;
    const tRefAudios = overrideConfig?.referenceAudios ?? referenceAudios;
    const tKlingOrientation = overrideConfig?.klingOrientation ?? klingOrientation;
    const tKlingKeepSound = overrideConfig?.klingKeepSound ?? klingKeepSound;
    const tKlingDubVol = overrideConfig?.klingDubVol ?? klingDubVol;
    const tKlingSrcVol = overrideConfig?.klingSrcVol ?? klingSrcVol;

    for (let i = 0; i < count; i++) {
      placeholders.push({
        id: generateUUID(), url: '', type: 'video', prompt: tPrompt || '(无提示词)',
        modelId: tModelId, modelName: modelDef!.name,
        durationText: tModelId === 'seedance-2.0' ? `${tSeedanceDuration}s` : `${(modelDef!.options[tOptIdx] as any).s === 'AUTO' ? 'Auto' : (modelDef!.options[tOptIdx] as any).s + 's'}`,
        genTimeLabel: '生成中...',
        timestamp: startTime, status: 'loading',
        config: { modelId: tModelId, videoRatio: tRatio, videoOptionIdx: tOptIdx, prompt: tPrompt, referenceImages: [...tRefs], referenceVideos: [...tRefVideos], referenceAudios: [...tRefAudios], type: 'video', isKlingMode: isKlingModel, isSyncAudio: tSyncAudio, klingOrientation: tKlingOrientation, klingKeepSound: tKlingKeepSound, klingDubVol: tKlingDubVol, klingSrcVol: tKlingSrcVol, seedanceDuration: tSeedanceDuration }
      });
    }
    setGeneratedAssets(prev => [...placeholders, ...prev]);

    setError(null);
    try {
        const createOne = async (pId: string) => {
            let response;
            const isVeoModel = apiModelId.startsWith('veo') && !apiModelId.includes('4K');
            const isGrokModel = apiModelId.startsWith('grok');
            const isJimengModel = apiModelId.startsWith('jimeng');
            
            if (apiModelId === 'kling-motion-control') {
                if (tRefs.length === 0) throw new Error("请上传一张参考图片 (Image Required)");
                if (tRefVideos.length === 0) throw new Error("请上传参考视频 (Video Required)");

                const durationObj = modelDef!.options[tOptIdx];
                const mode = durationObj.q === '高品质模式' ? 'pro' : 'std';
                
                const payload: any = {
                    prompt: tPrompt || undefined,
                    keep_original_sound: tKlingKeepSound ? 'yes' : 'no',
                    character_orientation: tKlingOrientation,
                    mode: mode
                };

                if (tRefs[0].data.startsWith('http')) {
                    payload.image_url = tRefs[0].data;
                } else {
                    payload.image = tRefs[0].data;
                }

                if (tRefVideos[0].data.startsWith('http')) {
                    payload.video_url = tRefVideos[0].data;
                } else {
                    payload.video = tRefVideos[0].data;
                }

                response = await fetch(`${config.baseUrl}/kling/v1/videos/motion-control`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                if (!response.ok || (data.code && data.code !== 0)) throw new Error(data.message || data.error?.message || "Kling动作转移失败");
                
                const tid = data.data?.task_id;
                if (!tid) throw new Error("No Task ID returned from Kling API");
                
                const updatedAsset: any = { ...placeholders.find(x => x.id === pId), status: 'queued', taskId: tid };
                setGeneratedAssets(prev => prev.map(a => a.id === pId ? updatedAsset : a));
                saveAssetToDB(updatedAsset);
                
                startKlingVideoPolling(tid, pId, startTime, 'motion-control');
                return;
            }

            if (apiModelId === 'kling-avatar-image2video') {
                if (tRefs.length === 0) throw new Error("请上传一张人像参考图");
                if (tRefAudios.length === 0) throw new Error("请上传驱动音频 (MP3/WAV/M4A/AAC, 2-60s)");
                
                const durationObj = modelDef!.options[tOptIdx];
                const mode = durationObj.q === '高品质模式' ? 'pro' : 'std';
                
                const payload: any = {
                    sound_file: tRefAudios[0].data,
                    prompt: tPrompt || "",
                    mode: mode,
                    callback_url: "",
                    external_task_id: ""
                };

                if (tRefs[0].data.startsWith('http')) {
                    payload.image_url = tRefs[0].data;
                } else {
                    payload.image = tRefs[0].data;
                }

                response = await fetch(`${config.baseUrl}/kling/v1/videos/avatar/image2video`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!response.ok || (data.code && data.code !== 0)) throw new Error(data.message || data.error?.message || "Kling数字人生成失败");
                
                const tid = data.data?.task_id;
                if (!tid) throw new Error("No Task ID returned from Kling API");

                const updatedAsset: any = { ...placeholders.find(x => x.id === pId), status: 'queued', taskId: tid };
                setGeneratedAssets(prev => prev.map(a => a.id === pId ? updatedAsset : a));
                saveAssetToDB(updatedAsset);
                
                startKlingVideoPolling(tid, pId, startTime, 'avatar/image2video');
                return;
            }

            if (isVeoModel || isGrokModel || isJimengModel || isKlingModel) {
                const payload: any = {
                    model: apiModelId,
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
                    payload.duration = parseInt((modelDef!.options[tOptIdx] as any).s);
                }
                
                if (isKlingModel) {
                    // For other Kling models (like text2video or image2video)
                    payload.duration = parseInt((modelDef!.options[tOptIdx] as any).s);
                }

                if ((isKlingModel || isGrokModel) && tSyncAudio) {
                    payload.sync_audio = true;
                }

                response = await fetch(`${config.baseUrl}/v1/video/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                const formData = new FormData();
                formData.append('model', apiModelId);
                formData.append('prompt', tPrompt);
                
                if (apiModelId === 'seedance-2.0') {
                    formData.append('seconds', tSeedanceDuration.toString());
                } else {
                    formData.append('seconds', (modelDef!.options[tOptIdx] as any).s);
                }
                
                formData.append('size', tRatio.replace(':', 'x'));
                formData.append('watermark', 'false');
                
                if (tRefs && tRefs.length > 0) {
                    for (let i = 0; i < tRefs.length; i++) {
                         const img = tRefs[i];
                         let blob: Blob | null = null;
                         if (img.data.startsWith('http')) {
                             blob = await urlToBlob(img.data);
                         } else {
                             blob = base64ToBlob(img.data, img.mimeType);
                         }
                         if (blob) formData.append('input_reference', blob, `图片 ${i+1}.png`);
                    }
                }

                if (apiModelId === 'seedance-2.0') {
                    if (tRefVideos && tRefVideos.length > 0) {
                        for (let i = 0; i < tRefVideos.length; i++) {
                             const vid = tRefVideos[i];
                             let blob: Blob | null = null;
                             if (vid.data.startsWith('http')) {
                                 blob = await urlToBlob(vid.data);
                             } else {
                                 blob = base64ToBlob(vid.data, vid.mimeType);
                             }
                             if (blob) formData.append('input_reference', blob, `视频 ${i+1}.mp4`);
                        }
                    }
                    if (tRefAudios && tRefAudios.length > 0) {
                        for (let i = 0; i < tRefAudios.length; i++) {
                             const aud = tRefAudios[i];
                             let blob: Blob | null = null;
                             if (aud.data.startsWith('http')) {
                                 blob = await urlToBlob(aud.data);
                             } else {
                                 blob = base64ToBlob(aud.data, aud.mimeType);
                             }
                             if (blob) formData.append('input_reference', blob, `音频 ${i+1}.mp3`);
                        }
                    }
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
            
            if (isKlingModel) {
                 // Determine correct polling type for generic Kling
                 const endpoint = tRefs.length > 0 ? 'image2video' : 'text2video';
                 startKlingVideoPolling(tid, pId, startTime, endpoint);
            } else {
                startVideoPolling(tid, pId, startTime, apiModelId);
            }
        };
        
        placeholders.forEach(p => createOne(p.id));
    } catch (err: any) { 
        setError(err.message); 
        setGeneratedAssets(prev => prev.map(a => placeholders.some(p => p.id === a.id) ? { ...a, status: 'failed', genTimeLabel: '接口失败' } : a));
    }
  };

  const executeVideoRemix = async () => {
    // ... same as before
    if (!remixingAsset || !remixingAsset.taskId || !remixPrompt.trim()) return;
    let key = (config.apiKey || safeEnvKey).trim();
    if (!key) { setError("请先设置API Key"); return; }
    
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
    setActiveModal(null); 

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
    // ... same as before
    if (isAudioMode || overrideConfig?.type === 'audio') {
        executeAudioGeneration(overrideConfig);
        return;
    }
    if ((isVideoMode) && !overrideConfig) { executeVideoGeneration(); return; }
    if (overrideConfig?.type === 'video') { executeVideoGeneration(overrideConfig); return; }

    const tPrompt = overrideConfig?.prompt ?? prompt;
    if (!tPrompt) { setError("请输入提示词"); return; }
    let key = (config.apiKey || safeEnvKey).trim();
    if (!key) { setError("请先设置API Key"); return; }

    const tModelId = overrideConfig?.modelId ?? selectedModel;
    const tRatio = overrideConfig?.aspectRatio ?? aspectRatio;
    const tSize = overrideConfig?.imageSize ?? imageSize;
    const tRefs = overrideConfig?.referenceImages ?? referenceImages;
    const tTransparent = overrideConfig?.isTransparent ?? isTransparent;
    const count = overrideConfig ? 1 : generationCount;
    const startTime = Date.now();

    const placeholders: GeneratedAsset[] = [];
    for (let i = 0; i < count; i++) {
        placeholders.push({
            id: generateUUID(), url: '', type: 'image', prompt: tPrompt,
            modelId: tModelId, modelName: MODELS.find(m => m.id === tModelId)?.name || tModelId,
            durationText: tSize, genTimeLabel: '生成中...',
            timestamp: startTime, status: 'loading',
            config: { modelId: tModelId, aspectRatio: tRatio, imageSize: tSize, prompt: tPrompt, referenceImages: tRefs ? [...tRefs] : [], type: 'image', isTransparent: tTransparent }
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
                    image_list: tRefs.map((img: ReferenceImage) => {
                        if (img.data.startsWith('http')) {
                            return { image_url: img.data };
                        } else {
                            return { image: img.data };
                        }
                    })
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
                    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: tRatio, imageSize: tSize === 'AUTO' ? undefined : tSize } } })
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
                    
                    const bodyPayload: any = { 
                        model: tModelId, 
                        messages: [{ role: "user", content }], 
                        stream: false,
                        aspect_ratio: tRatio
                    };
                    if (tSize && tSize !== 'AUTO') { bodyPayload.size = tSize; bodyPayload.resolution = tSize; }

                    const res2 = await fetch(`${config.baseUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify(bodyPayload)
                    });
                    const data2 = await res2.json();
                    url = findImageUrlInObject(data2) || findImageUrlInObject(data2.choices?.[0]?.message?.content) || '';
                }
            } else {
                const content: any[] = [{ type: "text", text: `${tPrompt} --aspect-ratio ${tRatio}` }];
                if (tRefs && tRefs.length > 0) tRefs.forEach((img: ReferenceImage) => content.push({ type: "image_url", image_url: { url: img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}` } }));
                
                const bodyPayload: any = { 
                    model: tModelId, 
                    messages: [{ role: "user", content }], 
                    stream: false,
                    aspect_ratio: tRatio
                };
                if (tSize && tSize !== 'AUTO') { bodyPayload.size = tSize; bodyPayload.resolution = tSize; }
                
                if ((tModelId === 'gpt-image-1-all' || tModelId === 'gpt-image-1.5-all') && tTransparent) {
                    bodyPayload.transparency = 'alpha';
                }

                const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                    body: JSON.stringify(bodyPayload)
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

  // ... (Asset deletion handlers remain same) ...
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
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('[data-asset-card="true"]') || (e.target as HTMLElement).tagName === 'AUDIO') return;
      setIsSelecting(true);
      setSelectionStart({ x: e.clientX, y: e.clientY });
      if (!e.shiftKey) setSelectedAssetIds(new Set());
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    
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
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).tagName === 'AUDIO') return;
    
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

  const handleBatchDownload = async () => {
    const assets = generatedAssets.filter(a => selectedAssetIds.has(a.id) && a.url);
    if (assets.length === 0) return;

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        try {
            let downloadUrl = asset.url;
            let shouldRevoke = false;

            // Attempt to fetch as blob to bypass CORS/Content-Disposition issues
            try {
                const response = await fetch(asset.url);
                const blob = await response.blob();
                downloadUrl = window.URL.createObjectURL(blob);
                shouldRevoke = true;
            } catch (e) {
                console.warn("Fetch failed, using original URL", e);
            }

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `viva-${asset.id}.${asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'wav' : 'png'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (shouldRevoke) {
                setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 5000);
            }
        } catch (e) {
            console.error("Download failed for", asset.id, e);
        }

        // Add delay to avoid browser blocking multiple downloads
        if (i < assets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
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
        link.download = `viva-${asset.id}.${asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'wav' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed, using fallback", error);
        const link = document.createElement('a');
        link.href = asset.url;
        link.download = `viva-${asset.id}.${asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'wav' : 'png'}`;
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
        if (asset.config.referenceVideos) {
            setReferenceVideos(asset.config.referenceVideos);
        } else if (asset.config.referenceVideo) {
            setReferenceVideos([asset.config.referenceVideo]);
        }
        if (asset.config.referenceAudios) {
            setReferenceAudios(asset.config.referenceAudios);
        } else if (asset.config.referenceAudio) {
            setReferenceAudios([asset.config.referenceAudio]);
        }
        if (asset.type === 'image') {
           setMainCategory('image');
           setSelectedModel(asset.config.modelId);
           setAspectRatio(asset.config.aspectRatio);
           setImageSize(asset.config.imageSize);
           setIsTransparent(asset.config.isTransparent || false);
           executeGeneration(asset.config);
        } else if (asset.type === 'audio') {
           setMainCategory('audio');
           setSelectedAudioModel(asset.config.modelId);
           setSelectedVoice(asset.config.selectedVoice);
           if (asset.config.audioGenMode) {
               setAudioGenMode(asset.config.audioGenMode);
               if (asset.config.audioGenMode === 'multi') {
                   const lines = parsePromptToLines(asset.config.prompt, asset.config.speakerMap || speakerMap);
                   setDialogueLines(lines);
               }
           }
           if (asset.config.speakerMap) setSpeakerMap(asset.config.speakerMap);
           executeAudioGeneration(asset.config);
        } else if (asset.config.isKlingMode) {
           // Handle legacy Kling Mode assets by mapping to Video mode
           setMainCategory('video');
           setSelectedVideoModel(asset.config.modelId);
           setVideoRatio(asset.config.videoRatio);
           setVideoOptionIdx(asset.config.videoOptionIdx);
           setIsSyncAudio(asset.config.isSyncAudio);
           setKlingOrientation(asset.config.klingOrientation || 'video');
           setKlingKeepSound(asset.config.klingKeepSound || false);
           setKlingDubVol(asset.config.klingDubVol ?? 1.0);
           setKlingSrcVol(asset.config.klingSrcVol ?? 0.0);
           executeVideoGeneration(asset.config);
        } else {
           setMainCategory('video');
           setSelectedVideoModel(asset.config.modelId);
           setVideoRatio(asset.config.videoRatio);
           setVideoOptionIdx(asset.config.videoOptionIdx);
           if (asset.config.seedanceDuration) setSeedanceDuration(asset.config.seedanceDuration);
           executeVideoGeneration(asset.config);
        }
     }
  };

  const handleAssetEdit = (asset: GeneratedAsset) => {
     if (asset.type === 'video') {
        if (asset.modelId.includes('sora-2')) {
            setRemixingAsset(asset);
            setRemixPrompt(''); // User requested no preset prompt
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
    if (asset.type === 'video' || asset.type === 'audio') return;
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
  
  const labelClass = "font-normal text-sm text-black uppercase tracking-normal mb-1.5 flex items-center gap-1.5";
  const selectClass = "w-full h-10 px-3 border border-black font-normal bg-white brutalist-shadow-sm focus:outline-none text-sm appearance-none";

  const renderNavRail = () => (
      <div className="w-full md:w-20 bg-white border-b-2 md:border-b-0 border-black flex md:flex-col justify-between md:justify-start items-center z-30 shrink-0 overflow-x-auto md:overflow-visible">
          
          <div className="hidden md:flex h-16 w-full items-center justify-center border-b-2 border-black bg-brand-yellow shrink-0">
             <Bot className="w-10 h-10 text-black" strokeWidth={2} />
          </div>

          <div className="flex md:flex-col items-center gap-2 md:gap-4 w-full overflow-x-auto md:overflow-visible no-scrollbar px-4 md:px-0 py-4 md:py-6 md:flex-1 md:border-r-2 border-black">
              {[
                  { id: 'chat', icon: MessageSquare, label: '对话', action: () => { setMainCategory('chat'); resetInputState(); }, active: mainCategory === 'chat' },
                  { id: 'image', icon: ImageIcon, label: '绘画', action: () => { setMainCategory('image'); resetInputState(); }, active: mainCategory === 'image' },
                  { id: 'video', icon: Video, label: '视频', action: () => { setMainCategory('video'); resetInputState(); }, active: mainCategory === 'video' },
                  { id: 'audio', icon: Mic, label: '语音', action: () => { setMainCategory('audio'); resetInputState(); }, active: mainCategory === 'audio' },
                  { id: 'resources', icon: FolderOpen, label: '资源', action: () => { setMainCategory('resources'); resetInputState(); }, active: mainCategory === 'resources' },
                  { id: 'proxy', icon: Shield, label: '代理', action: () => { setMainCategory('proxy'); resetInputState(); }, active: mainCategory === 'proxy' },
                  { id: 'announcement', icon: Megaphone, label: '公告', action: () => { setMainCategory('announcement'); resetInputState(); }, active: mainCategory === 'announcement' },
              ].map(item => (
                  <button 
                      key={item.id}
                      onClick={item.action}
                      className={`group relative w-16 h-16 flex flex-col items-center justify-center border transition-all rounded-lg shrink-0 
                        ${item.active 
                            ? 'bg-brand-yellow border-black brutalist-shadow-sm' 
                            : 'bg-transparent border-transparent hover:bg-slate-200'}`}
                      title={item.label}
                  >
                      <item.icon className="w-7 h-7 transition-colors text-black" strokeWidth={2} />
                      <span className="text-xs font-normal mt-1 transition-colors text-black">{item.label}</span>
                  </button>
              ))}
          </div>

          <div className="hidden md:flex flex-col items-center mb-6 mt-auto w-full md:border-r-2 border-black pt-4">
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-8 h-8 flex items-center justify-center border border-black bg-white hover:bg-brand-yellow transition-all rounded-full brutalist-shadow-sm hover:shadow-none"
                title={isSidebarOpen ? "收起" : "展开"}
            >
                {isSidebarOpen ? <ChevronLeft className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
            </button>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F1F5F9] md:h-screen overflow-hidden text-black font-sans" 
         onMouseMove={handleContainerMouseMove} 
         onMouseUp={handleContainerMouseUp}>
      
      {renderNavRail()}

      <div className={`bg-white flex flex-col z-20 brutalist-shadow transition-all duration-300 ${isFullWidthMode ? 'flex-1 w-full border-r-0' : (isSidebarOpen ? 'w-full md:w-[450px] border-r-2 border-black' : 'w-0 md:w-0 overflow-hidden border-r-0 opacity-0')}`}>
        <header className="bg-brand-yellow pl-3 pr-5 border-b-2 border-black h-14 md:h-16 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold italic tracking-tight text-black">ViVa AI助手</h1>
            <button 
                onClick={handleSaveShortcut} 
                className="ml-2 w-8 h-8 flex items-center justify-center bg-white border border-black rounded-md hover:bg-black hover:text-white transition-all brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none" 
                title="保存到桌面"
            >
                <Monitor className="w-4 h-4" />
            </button>
          </div>
          {isFullWidthMode && (
          <div className="flex items-center gap-2 md:gap-3">
               <button onClick={() => setActiveModal('settings')} title="系统设置" className="w-9 h-9 md:w-10 md:h-10 bg-white border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                    <Settings2 className="w-5 h-5 md:w-6 md:h-6"/>
                </button>
                 <button onClick={() => setActiveModal('price')} title="价格说明" className="w-9 h-9 md:w-10 md:h-10 bg-brand-green border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                    <span className="text-xl font-bold text-white">¥</span>
                </button>
                <button onClick={() => setActiveModal('links')} title="联系客服" className="w-9 h-9 md:w-10 md:h-10 bg-white border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                    <Headset className="w-5 h-5 md:w-6 md:h-6"/>
                </button>
                <a href="https://www.vivaapi.cn/console/log" target="_blank" title="使用日志" className="w-9 h-9 md:w-10 md:h-10 bg-white border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                  <History className="w-5 h-5 md:w-6 md:h-6" />
                </a>
          </div>
          )}
        </header>
        
        {/* Sidebar Content */}
        {/* Conditionally render content based on mainCategory */}
        {mainCategory === 'chat' ? (
             <div className="flex-1 min-h-0 flex flex-col">
                <ChatView 
                    config={config} 
                    messages={chatMessages} 
                    setMessages={setChatMessages}
                    input={chatInput}
                    setInput={setChatInput}
                    isLoading={isChatLoading}
                    setIsLoading={setIsChatLoading}
                    attachments={chatAttachments}
                    setAttachments={setChatAttachments}
                    setActiveModal={setActiveModal}
                    modelId={chatModelId}
                    setModelId={setChatModelId}
                />
             </div>
        ) : mainCategory === 'announcement' ? (
            <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 md:p-8 min-h-0">
                <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    {/* Header */}
                    <div className="bg-brand-yellow border-2 border-black p-6 md:p-10 brutalist-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Megaphone className="w-32 h-32 rotate-[-15deg]" />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <div className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider border border-transparent">
                                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                                Notice Board
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">最新公告</h2>
                            <p className="text-lg font-medium opacity-80">了解 ViVa AI 的最新动态与功能更新</p>
                        </div>
                    </div>

                    {/* Alert Box */}
                    <div className="bg-white border-2 border-black p-6 brutalist-shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden">
                        <div className="shrink-0 bg-brand-red text-white p-3 border border-black">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg text-brand-red uppercase">重要提示 / IMPORTANT</h3>
                            <p className="text-sm text-slate-700 font-medium">首次使用前，请务必在设置中配置您的 <a href="https://www.vivaapi.cn/console/token" target="_blank" className="bg-brand-yellow px-1 border border-black text-xs hover:opacity-80 transition-opacity">API令牌</a>，否则无法生成内容。</p>
                        </div>
                    </div>

                    {/* Updates List */}
                    <div className="bg-white border-2 border-black p-6 md:p-8 brutalist-shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b-2 border-black pb-4 mb-4">
                            <Sparkles className="w-6 h-6 text-brand-yellow fill-black" />
                            <h3 className="text-xl font-bold uppercase italic">版本更新日志</h3>
                        </div>
                        
                        <div className="space-y-4">
                             {[
                               { title: "Grok Video 3 升级", desc: "新增15S生成时长，支持音频同步功能。" },
                               { title: "语音功能优化", desc: "语音多人模式输入方式已优化，支持直观的剧本编辑。" }
                            ].map((item, idx) => (
                                 <div key={idx} className="group relative py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-2">
                                     <h4 className="font-bold text-base md:text-lg mb-2">{item.title}</h4>
                                     <p className="text-sm md:text-base text-slate-600 leading-relaxed">{item.desc}</p>
                                 </div>
                             ))}
                        </div>
                        
                        <div className="pt-6 mt-6 border-t border-dashed border-black/20 text-center">
                            <span className="inline-block bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-widest">More updates coming soon</span>
                        </div>
                    </div>
                </div>
            </div>
        ) : mainCategory === 'resources' ? (
            <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 md:p-8 min-h-0">
                <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    {/* Header Hero */}
                    <div className="bg-[#4ADE80] border-2 border-black p-8 md:p-12 brutalist-shadow text-white relative overflow-hidden group">
                         <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-black/10 skew-x-[-20deg] translate-x-1/2 group-hover:translate-x-1/3 transition-transform duration-700"></div>
                         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 bg-white text-[#4ADE80] border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider">
                                    <FolderOpen className="w-4 h-4 fill-current" />
                                    Useful Tools
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
                                    免费资源<br/><span className="text-brand-yellow text-stroke-black">Free Resources</span>
                                </h2>
                            </div>
                            <div className="bg-black/20 p-4 border border-white/30 backdrop-blur-sm max-w-sm">
                                <p className="text-sm font-medium leading-relaxed">
                                    精选各类免费实用的在线工具与资源，助力您的创作。可拖动卡片进行排序。
                                </p>
                            </div>
                         </div>
                    </div>

                    {/* Resources Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                         {resourceItems.map((item, idx) => (
                             <a 
                                key={item.id}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                draggable
                                onDragStart={() => handleResourceDragStart(idx)}
                                onDragOver={(e) => handleResourceDragOver(e, idx)}
                                onDragEnd={handleResourceDragEnd}
                                className="group bg-white border-2 border-black brutalist-shadow transition-all hover:-translate-y-1 cursor-pointer flex flex-col h-full relative"
                             >
                                 <div className="p-6 flex-1 space-y-4">
                                     <div className="flex justify-between items-start">
                                         <div className="w-12 h-12 bg-brand-yellow border border-black flex items-center justify-center shrink-0">
                                             {item.icon === 'Mic' ? <Mic className="w-6 h-6" /> : 
                                              item.icon === 'Monitor' ? <Monitor className="w-6 h-6" /> : 
                                              item.icon === 'Link' ? <Link className="w-6 h-6" /> :
                                              item.icon === 'Globe' ? <Globe className="w-6 h-6" /> :
                                              <ImageIcon className="w-6 h-6" />}
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <ExternalLink className="w-5 h-5 text-brand-blue opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                             <div onClick={(e) => e.preventDefault()} className="cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded p-1 -mr-1 transition-colors" title="拖动排序">
                                                 <GripVertical className="w-5 h-5 text-slate-300 hover:text-black transition-colors" />
                                             </div>
                                         </div>
                                     </div>
                                     <div className="space-y-2">
                                         <h3 className="text-xl font-bold uppercase italic tracking-tight">{item.name}</h3>
                                         <p className="text-sm text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                                     </div>
                                 </div>
                             </a>
                         ))}
                    </div>
                </div>
            </div>
        ) : mainCategory === 'proxy' ? (
            <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 md:p-8 min-h-0">
                <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    
                    {/* Header Hero */}
                    <div className="bg-brand-blue border-2 border-black p-8 md:p-12 brutalist-shadow text-white relative overflow-hidden group">
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-black/10 skew-x-[-20deg] translate-x-1/2 group-hover:translate-x-1/3 transition-transform duration-700"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 bg-white text-brand-blue border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider">
                                    <Shield className="w-4 h-4 fill-current" />
                                    Partner Program
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
                                    代理合作<br/><span className="text-brand-yellow text-stroke-black">Cooperation</span>
                                </h2>
                            </div>
                            <div className="bg-black/20 p-4 border border-white/30 backdrop-blur-sm max-w-sm">
                                <p className="text-sm font-medium leading-relaxed">
                                    加入 Viva API 合作伙伴计划，开启您的 AI 创业之旅。零门槛，高回报。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2 bg-black text-white p-4 border-2 border-black mb-4">
                            <h3 className="text-xl font-bold uppercase italic tracking-wider flex items-center gap-2">
                                <Zap className="w-6 h-6 text-brand-yellow fill-current" />
                                核心优势 / Core Advantages
                            </h3>
                        </div>
                        {[
                            "提供超低的成本使用价，自用省米，运营赚米",
                            "部署搭建同 www.vivaapi.cn 一样的AI聚合API平台",
                            "部署搭建同 p.vivaapi.cn 一样的AI应用平台",
                            "无需服务器、无需后续管理、只需提供一个域名",
                            "最快一天部署上线，代理费达标后可全额返还",
                            "2026弯道超车的机会，望君把握"
                        ].map((text, i) => (
                            <div key={i} className="group bg-white border-2 border-black p-5 transition-all duration-300 flex gap-4 items-start hover:-translate-y-1">
                                <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-brand-yellow border border-black font-black text-lg">
                                    {i + 1}
                                </span>
                                <p className="font-bold text-sm md:text-base text-slate-800 pt-1">{text}</p>
                            </div>
                        ))}
                    </div>

                    {/* CTA Section */}
                    <a href="https://ai.feishu.cn/wiki/O6Q9wrxxci898Wkj6ndcFnlknJd?from=from_copylink" target="_blank" className="block group relative">
                        <div className="relative bg-white border-2 border-black p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:-translate-y-1 transition-transform cursor-pointer">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic">立即加入代理计划</h3>
                                <p className="text-slate-600 font-medium">查看详细招募文档，获取更多权益详情</p>
                            </div>
                            <div className="w-16 h-16 bg-brand-green border-2 border-black flex items-center justify-center rounded-full group-hover:rotate-45 transition-transform duration-300">
                                <ExternalLink className="w-8 h-8 text-black" />
                            </div>
                        </div>
                    </a>

                </div>
            </div>
        ) : (
        // ... (Main generation config panel code remains same) ...
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 space-y-6 no-scrollbar">
          
          {!isAudioMode && (
          <section className="space-y-3">
             {/* ... (Upload sections kept same) ... */}
              <div className={`p-3 bg-brand-cream border border-black brutalist-shadow-sm ${referenceImages.length > 0 || referenceVideos.length > 0 || referenceAudios.length > 0 ? 'solid-box-green' : 'solid-box-purple'}`}>
                  {isVideoMode && selectedVideoModel === 'kling-motion-control' ? (
                      // ... (Motion control content same)
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className={labelClass}>
                                动作迁移素材 (MOTION TRANSFER)
                            </h3>
                            <div className="flex gap-2">
                                {referenceImages.length > 0 && <span className="text-brand-green text-xs font-normal flex items-center gap-1"><Check className="w-3 h-3"/> IMAGE READY</span>}
                                {referenceVideos.length > 0 && <span className="text-brand-green text-xs font-normal flex items-center gap-1"><Check className="w-3 h-3"/> VIDEO READY</span>}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className={`${labelClass} flex items-center gap-1`}>
                                <User className="w-3 h-3"/> 人物参考 (CHARACTER)
                            </label>
                            {referenceImages.length > 0 ? (
                                <div className="relative w-24 h-24 border border-black bg-white brutalist-shadow-sm flex-shrink-0 cursor-pointer"
                                     onDoubleClick={() => setPreviewRefImage(referenceImages[0])}>
                                    <img src={referenceImages[0].data.startsWith('http') ? referenceImages[0].data : `data:${referenceImages[0].mimeType};base64,${referenceImages[0].data}`} className="w-full h-full object-cover" />
                                    {referenceImages[0].uploadStatus === 'uploading' && (
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-20">
                                            <Loader2 className="w-6 h-6 animate-spin mb-1"/>
                                            <span className="text-[10px] font-normal uppercase">...</span>
                                        </div>
                                    )}
                                    {referenceImages[0].uploadStatus === 'failed' && (
                                        <div className="absolute inset-0 bg-red-500/50 flex flex-col items-center justify-center text-white z-20">
                                            <span className="text-[10px] font-normal uppercase">FAILED</span>
                                        </div>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setReferenceImages([]); }} 
                                            className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            ) : (
                                <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-purple text-white border border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-sm hover:translate-y-1 hover:shadow-none transition-all">
                                    <span>上传人物图片 / UPLOAD IMAGE</span>
                                    <input type="file" accept=".jpg, .jpeg, .png" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-dashed border-black/10">
                            <label className={`${labelClass} flex items-center gap-1`}>
                                <Video className="w-3 h-3"/> 动作视频 (MOTION VIDEO)
                            </label>
                            {referenceVideos.length > 0 ? (
                                <div className="relative w-full border border-black bg-white brutalist-shadow-sm p-2 group">
                                     <div className="flex items-center justify-between mb-2">
                                         <span className="text-xs font-normal truncate max-w-[200px] bg-slate-100 px-2 py-0.5 border border-black/20 rounded-sm">VIDEO REFERENCE</span>
                                         <button onClick={() => setReferenceVideos([])} className="bg-brand-red text-white border border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform">
                                            <X className="w-3 h-3"/>
                                         </button>
                                     </div>
                                     <div className="relative bg-black border border-black h-32 flex items-center justify-center overflow-hidden">
                                        <video 
                                            src={referenceVideos[0].data.startsWith('http') ? referenceVideos[0].data : `data:${referenceVideos[0].mimeType};base64,${referenceVideos[0].data}`} 
                                            className="w-full h-full object-contain" 
                                            controls
                                        />
                                        {referenceVideos[0].uploadStatus === 'uploading' && (
                                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-20">
                                                <Loader2 className="w-8 h-8 animate-spin mb-2"/>
                                                <span className="text-xs font-normal uppercase">UPLOADING...</span>
                                            </div>
                                        )}
                                        {referenceVideos[0].uploadStatus === 'failed' && (
                                            <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-white z-20">
                                                <X className="w-8 h-8 mb-2"/>
                                                <span className="text-xs font-normal uppercase">UPLOAD FAILED</span>
                                            </div>
                                        )}
                                     </div>
                                </div>
                            ) : (
                                <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-blue text-white border border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-sm hover:translate-y-1 hover:shadow-none transition-all">
                                    <span>上传动作视频 / UPLOAD VIDEO</span>
                                    <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleVideoUpload} />
                                </label>
                            )}
                        </div>

                        {/* Additional Options */}
                            <div className="space-y-3 pt-2">
                                    <div className="flex gap-4">
                                    <div className="flex-1 space-y-1">
                                        <label className={labelClass}>人物朝向 ORIENTATION</label>
                                        <div className="flex border border-black bg-white brutalist-shadow-sm">
                                            <button 
                                                onClick={() => setKlingOrientation('video')}
                                                className={`flex-1 py-1.5 text-sm font-normal transition-colors ${klingOrientation === 'video' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
                                            >
                                                与视频一致
                                            </button>
                                            <div className="w-px bg-black"></div>
                                            <button 
                                                onClick={() => setKlingOrientation('image')}
                                                className={`flex-1 py-1.5 text-sm font-normal transition-colors ${klingOrientation === 'image' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
                                            >
                                                与图片一致
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 space-y-1">
                                        <label className={labelClass}>音频设置 AUDIO</label>
                                        <label className={`flex items-center justify-center gap-2 cursor-pointer border border-black py-1.5 px-2 brutalist-shadow-sm transition-all ${klingKeepSound ? 'bg-brand-yellow text-black' : 'bg-white hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={klingKeepSound} onChange={(e) => setKlingKeepSound(e.target.checked)} className="hidden" />
                                            <span className="text-sm font-normal uppercase flex items-center gap-1">
                                                {klingKeepSound ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
                                                {klingKeepSound ? '保留原声 (ON)' : '不保留 (OFF)'}
                                            </span>
                                        </label>
                                    </div>
                                    </div>
                                    <div className="text-xs text-black font-normal italic leading-relaxed mt-2">
                                        <span className="font-bold text-brand-red">注意：</span>
                                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                            <li>人物图：全身/半身，占比&gt;5%，避免遮挡。</li>
                                            <li>视频：写实风格，单人，动作清晰，无镜头切换。</li>
                                            <li>生成时长限制：人物朝向跟随视频(≤30s)，人物跟随图片(≤10s)。</li>
                                        </ul>
                                    </div>
                        </div>
                    </div>
                  ) : (
                      <>
                          <div className="flex justify-between items-center mb-1">
                              <h3 className={labelClass}>
                                  {isVideoMode && selectedVideoModel === 'seedance-2.0' ? '参考图片（限9张）' : `参考底稿 (可选) ${!isVideoMode ? '' : `(限${selectedVideoModel === 'kling-avatar-image2video' || selectedVideoModel === 'kling-motion-control' ? '1' : ((selectedVideoModel === 'veo_3_1-fast-components-4K' ? '3' : (selectedVideoModel.startsWith('veo')) ? '2' : '1'))}张)`}`}
                              </h3>
                              {(referenceImages.length > 0) && <span className="text-brand-green text-xs font-normal flex items-center gap-1"><Check className="w-3 h-3"/> READY</span>}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {/* Images OR Video Loop */}
                            {!isAudioMode && (
                                referenceImages.length > 0 ? (
                                    <div className="flex gap-3 overflow-x-auto pb-1.5 pt-4 pr-4 pl-1">
                                        {referenceImages.map((img: ReferenceImage, idx: number) => (
                                            <div key={img.id} 
                                                className="relative w-24 h-24 border border-black bg-white brutalist-shadow-sm flex-shrink-0 cursor-pointer"
                                                onDoubleClick={() => setPreviewRefImage(img)}>
                                            <img src={img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center uppercase py-0.5">
                                                {(isVideoMode && selectedVideoModel === 'seedance-2.0') ? `图片 ${idx + 1}` : (isVideoMode && selectedVideoModel.startsWith('veo') && selectedVideoModel !== 'veo_3_1-fast-components-4K') ? (idx === 0 ? '首帧' : '尾帧') : 'REF'}
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); removeReferenceImage(img.id); }} 
                                                    className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                                <X className="w-4 h-4"/>
                                            </button>
                                            </div>
                                        ))}
                                        {((!isVideoMode ? referenceImages.length < (currentImageModel?.maxImages || 4) : referenceImages.length < (selectedVideoModel === 'seedance-2.0' ? 9 : (selectedVideoModel === 'kling-avatar-image2video' || selectedVideoModel === 'kling-motion-control' ? 1 : (selectedVideoModel === 'veo_3_1-fast-components-4K' ? 3 : (selectedVideoModel.startsWith('veo')) ? 2 : 1))))) && (
                                            <label className="w-24 h-24 border border-black flex items-center justify-center cursor-pointer bg-white brutalist-shadow-sm">
                                            <Plus className="w-6 h-6" /><input type="file" multiple={!isVideoMode || selectedVideoModel === 'seedance-2.0'} accept=".jpg, .jpeg, .png" className="hidden" onChange={handleImageUpload} />
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-purple text-white border border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-sm hover:translate-y-1 hover:shadow-none transition-all">
                                        <input type="file" multiple={!isVideoMode || selectedVideoModel === 'seedance-2.0'} accept=".jpg, .jpeg, .png" className="hidden" onChange={handleImageUpload} />
                                        {isVideoMode && selectedVideoModel === 'kling-motion-control' ? "添加人物图" : "上传图片/UPLOAD"}
                                    </label>
                                )
                            )}
                            
                            {/* ... (Video warning and audio upload same) */}
                            {/* Videos Section for Seedance 2.0 */}
                            {isVideoMode && selectedVideoModel === 'seedance-2.0' && (
                                <div className="mt-2 pt-2 border-t border-black/10">
                                    <label className={labelClass}>参考视频（限3个，总时长≤ 15秒） {referenceVideos.length > 0 && <span className="text-brand-green text-[10px]"><Check className="inline w-3 h-3"/> {referenceVideos.length}/3</span>}</label>
                                    {referenceVideos.length > 0 ? (
                                        <div className="flex gap-3 overflow-x-auto pb-1.5 pt-2 pr-4 pl-1">
                                            {referenceVideos.map((vid, idx) => (
                                                <div key={vid.id} className="relative w-32 h-24 border border-black bg-white brutalist-shadow-sm flex-shrink-0 cursor-pointer group">
                                                    <video src={vid.data.startsWith('http') ? vid.data : `data:${vid.mimeType};base64,${vid.data}`} className="w-full h-full object-cover" />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center uppercase py-0.5">
                                                        视频 {idx + 1}
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); removeReferenceVideo(vid.id); }} 
                                                            className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                                        <X className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            ))}
                                            {referenceVideos.length < 3 && (
                                                <label className="w-24 h-24 border border-black flex items-center justify-center cursor-pointer bg-white brutalist-shadow-sm flex-shrink-0">
                                                    <Plus className="w-6 h-6" /><input type="file" multiple accept="video/mp4,video/quicktime" className="hidden" onChange={handleVideoUpload} />
                                                </label>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="mt-2 w-full py-2.5 flex flex-col items-center justify-center bg-brand-blue text-white border border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-sm hover:translate-y-1 hover:shadow-none transition-all">
                                            <input type="file" multiple accept="video/mp4,video/quicktime" className="hidden" onChange={handleVideoUpload} />
                                            上传视频/UPLOAD VIDEO
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* Audios Section for Seedance 2.0 */}
                            {isVideoMode && selectedVideoModel === 'seedance-2.0' && (
                                <div className="mt-2 pt-2 border-t border-black/10">
                                    <label className={labelClass}>参考音频（限3个，总时长 ≤ 15 秒） {referenceAudios.length > 0 && <span className="text-brand-green text-[10px]"><Check className="inline w-3 h-3"/> {referenceAudios.length}/3</span>}</label>
                                    {referenceAudios.length > 0 ? (
                                        <div className="flex flex-col gap-2 mt-2">
                                            {referenceAudios.map((aud, idx) => (
                                                <div key={aud.id} className="relative p-2 bg-white border border-black brutalist-shadow-sm flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-brand-yellow flex items-center justify-center border border-black shrink-0">
                                                        <Music className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold truncate">音频 {idx + 1}</div>
                                                        <div className="text-[10px] text-slate-500 truncate">{aud.name} ({Math.round(aud.duration)}s)</div>
                                                    </div>
                                                    <button onClick={() => removeReferenceAudio(aud.id)} className="bg-brand-red text-white p-1 border border-black hover:scale-110 transition-transform shrink-0">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {referenceAudios.length < 3 && (
                                                <label className="w-full py-2 flex flex-col items-center justify-center bg-brand-blue text-white border border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-xs hover:translate-y-1 hover:shadow-none transition-all">
                                                    <input type="file" multiple accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                                                    <Plus className="w-4 h-4 inline mr-1"/> 添加音频/ADD AUDIO
                                                </label>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="mt-2 w-full py-2.5 flex flex-col items-center justify-center bg-brand-blue text-white border border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-sm hover:translate-y-1 hover:shadow-none transition-all">
                                            <input type="file" multiple accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                                            上传音频/UPLOAD AUDIO
                                        </label>
                                    )}
                                </div>
                            )}
                            
                            {isVideoMode && selectedVideoModel !== 'grok-video-3' && selectedVideoModel !== 'kling-avatar-image2video' && (
                                <div className="text-xs text-brand-red font-normal mt-1">
                                    {(() => {
                                        if (selectedVideoModel === 'seedance-2.0') return '请勿上传真人，混合上传文件总数≤12个';
                                        if (selectedVideoModel === 'sora-2-all' || selectedVideoModel === 'sora-2-pro-all') return '请勿上传真人';
                                        if (selectedVideoModel.startsWith('veo')) return '请勿上传未成年';
                                        return 'Sora2请勿上传真人，Veo请勿上传未成年';
                                    })()}
                                </div>
                            )}
                            
                            {(isVideoMode && selectedVideoModel === 'kling-avatar-image2video') && (
                                <div className={`mt-2 pt-2 border-t border-black/10`}>
                                    <label className={labelClass}>驱动音频 (AUDIO) {referenceAudios.length > 0 && <span className="text-brand-green text-[10px]"><Check className="inline w-3 h-3"/></span>}</label>
                                    {referenceAudios.length > 0 ? (
                                        <div className="relative mt-2 p-2 bg-white border border-black brutalist-shadow-sm flex flex-col gap-2">
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="w-8 h-8 bg-brand-yellow flex items-center justify-center border border-black shrink-0">
                                                    <Music className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-normal truncate flex-1">{referenceAudios[0].name}</span>
                                                <button onClick={() => setReferenceAudios([])} className="bg-brand-red text-white p-1 border border-black hover:scale-110 transition-transform shrink-0">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <audio controls src={`data:${referenceAudios[0].mimeType};base64,${referenceAudios[0].data}`} className="w-full h-8 mt-2" />
                                            <div className="flex justify-between text-[10px] text-slate-400">
                                                <span>{Math.round(referenceAudios[0].duration)}s</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="mt-2 w-full py-2.5 flex flex-col items-center justify-center bg-brand-blue text-white border border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-sm hover:translate-y-1 hover:shadow-none transition-all">
                                            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                                            上传音频/UPLOAD AUDIO
                                        </label>
                                    )}
                                </div>
                            )}
                          </div>
                      </>
                  )}
              </div>
          </section>
          )}

          {!isChatMode && !isAnnouncementMode && !isProxyMode && !isResourcesMode && (
          <section className="space-y-3">
             <SectionLabel 
                text={isAudioMode ? "语音配置 / Voice Config" : "生成配置 / Generation Config"} 
                link={(isVideoMode && selectedVideoModel.startsWith('kling')) ? {
                    text: '文档案例',
                    href: (() => {
                        if (selectedVideoModel === 'kling-motion-control') return 'https://docs.qingque.cn/d/home/eZQAl5y8xNSkr0iYUS8-bpGvP?identityId=1uX4dFq8Jtr#section=h.cfsywvlr0mjt';
                        if (selectedVideoModel === 'kling-avatar-image2video') return 'https://docs.qingque.cn/d/home/eZQCNHbAH5WUzp1SCYw0uTUcQ?identityId=2MueRKz7Jhc&via=notHome#section=h.7ozleilbvjpu';
                        return 'https://docs.qingque.cn/d/home/eZQBMUXCmLjb57bpfsVk2jNvx?identityId=2EHxhIU9lxL';
                    })()
                } : undefined}
            />
            {/* ... (Existing logic for displaying options based on mode, kept identical) ... */}
            
                {/* ... (The main generation configuration form) ... */}
                <div className="p-3 bg-brand-cream border border-black brutalist-shadow-sm space-y-4">
                  {/* ... (Model selectors and options same as original) ... */}
                  <div className="space-y-1">
                  <label className={labelClass}>选择生成模型 GENRE</label>
                  <select 
                    value={!isVideoMode && !isAudioMode ? selectedModel : (isAudioMode ? selectedAudioModel : selectedVideoModel)} 
                    onChange={(e) => {
                        resetInputState();
                        if (isAudioMode) setSelectedAudioModel(e.target.value);
                        else if (!isVideoMode) setSelectedModel(e.target.value);
                        else setSelectedVideoModel(e.target.value);
                    }} 
                    className={selectClass}
                  >
                    {(!isVideoMode && !isAudioMode ? MODELS : (isAudioMode ? AUDIO_MODELS : VIDEO_MODELS)).map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                </div>

                {isAudioMode && (
                    <div className="space-y-3 pt-2">
                        <div className="flex bg-white border border-black brutalist-shadow-sm">
                            <button 
                                onClick={() => handleAudioModeChange('single')}
                                className={`flex-1 py-1.5 text-xs font-normal uppercase transition-colors ${audioGenMode === 'single' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
                            >
                                单人 (Single)
                            </button>
                            <div className="w-px bg-black"></div>
                            <button 
                                onClick={() => handleAudioModeChange('multi')}
                                className={`flex-1 py-1.5 text-xs font-normal uppercase transition-colors ${audioGenMode === 'multi' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
                            >
                                多人 (Multi)
                            </button>
                        </div>

                        {audioGenMode === 'single' ? (
                            <div className="space-y-1">
                                <label className={labelClass}>声音角色 VOICE</label>
                                <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className={selectClass}>
                                    {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className={labelClass}>角色配置 CHARACTERS</label>
                                <div className="space-y-2">
                                    {speakerMap.map((speaker, idx) => (
                                        <div key={speaker.id} className="flex gap-2 items-center">
                                            <input 
                                                value={speaker.name}
                                                onChange={(e) => {
                                                    const newMap = [...speakerMap];
                                                    newMap[idx].name = e.target.value;
                                                    setSpeakerMap(newMap);
                                                }}
                                                placeholder="角色名 (如: 孙悟空)"
                                                className="w-1/3 p-1.5 border border-black text-xs font-normal outline-none"
                                            />
                                            <select 
                                                value={speaker.voice}
                                                onChange={(e) => {
                                                    const newMap = [...speakerMap];
                                                    newMap[idx].voice = e.target.value;
                                                    setSpeakerMap(newMap);
                                                }}
                                                className="flex-1 p-1.5 border border-black text-xs font-normal outline-none bg-white"
                                            >
                                                {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                            <button 
                                                onClick={() => {
                                                    if (speakerMap.length > 1) {
                                                        setSpeakerMap(speakerMap.filter((_, i) => i !== idx));
                                                    }
                                                }}
                                                className="bg-brand-red text-white p-1 border border-black hover:translate-y-0.5 hover:shadow-none transition-all"
                                                disabled={speakerMap.length <= 1}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setSpeakerMap([...speakerMap, { id: generateUUID(), name: `角色${String.fromCharCode(65 + speakerMap.length)}`, voice: VOICES[speakerMap.length % VOICES.length].id }])}
                                        className="w-full py-2 border border-dashed border-black bg-white hover:bg-slate-50 text-xs font-normal uppercase flex items-center justify-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> 添加角色 (Add Speaker)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isVideoMode && selectedVideoModel !== 'kling-avatar-image2video' && selectedVideoModel !== 'kling-motion-control' && (selectedVideoModel.startsWith('kling') || selectedVideoModel.startsWith('grok')) && (
                    <div className="space-y-1 mt-2">
                       <label className="flex items-center gap-2 cursor-pointer bg-white border border-black p-2 brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                           <input type="checkbox" checked={isSyncAudio} onChange={(e) => setIsSyncAudio(e.target.checked)} className="w-4 h-4 accent-black" />
                           <span className="text-xs font-normal uppercase flex items-center gap-1"><Mic className="w-3 h-3"/> 音画同步 / AUDIO SYNC</span>
                       </label>
                    </div>
                )}

                {!isVideoMode && !isAudioMode && currentImageModel && (
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

                {isVideoMode && (
                    <>
                        {(selectedVideoModel === 'kling-avatar-image2video' || selectedVideoModel === 'kling-motion-control') ? (
                            <div className="space-y-1">
                                <label className={labelClass}>模式 MODE</label>
                                <select 
                                    value={videoOptionIdx} 
                                    onChange={(e) => setVideoOptionIdx(parseInt(e.target.value))} 
                                    className={`${selectClass} h-[40px]`}
                                >
                                    {(selectedVideoModel === 'kling-avatar-image2video' || selectedVideoModel === 'kling-motion-control') ? (
                                        <>
                                            <option value={0}>标准模式</option>
                                            <option value={1}>高品质模式</option>
                                        </>
                                    ) : (
                                        currentVideoModel?.options.map((opt, idx) => (
                                            <option key={idx} value={idx}>{opt.q === '高品质模式' ? 'PRO (高品质)' : 'STD (标准)'}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                        ) : selectedVideoModel === 'seedance-2.0' ? (
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className={labelClass}>比例 ASPECT</label>
                                    <select value={videoRatio} onChange={(e) => setVideoRatio(e.target.value)} className={selectClass}>
                                        {(currentVideoModel)?.supportedAspectRatios.map(r => <option key={r} value={r}>{ASPECT_RATIO_LABELS[r] || r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>质量 QUALITY</label>
                                    <select value={videoOptionIdx} onChange={(e) => setVideoOptionIdx(parseInt(e.target.value))} className={selectClass}>
                                        {currentVideoModel?.options.map((opt, idx) => (
                                            <option key={idx} value={idx}>{opt.q}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Hide Aspect Ratio for Kling Avatar or Motion Control */}
                                {!(selectedVideoModel === 'kling-avatar-image2video' || selectedVideoModel === 'kling-motion-control') && (
                                    <div className="space-y-1">
                                        <label className={labelClass}>比例 ASPECT</label>
                                        <select value={videoRatio} onChange={(e) => setVideoRatio(e.target.value)} className={selectClass}>
                                            {(currentVideoModel)?.supportedAspectRatios.map(r => <option key={r} value={r}>{ASPECT_RATIO_LABELS[r] || r}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                <div className={`space-y-1`}>
                                <label className={labelClass}>
                                    {selectedVideoModel === 'kling-avatar-image2video' ? '质量 QUALITY' : '时长/质量 DURATION'}
                                </label>
                                <select value={videoOptionIdx} onChange={(e) => setVideoOptionIdx(parseInt(e.target.value))} className={selectClass}>
                                    {selectedVideoModel === 'kling-avatar-image2video' ? (
                                        <>
                                            <option value={0}>标准模式</option>
                                            <option value={1}>高品质模式</option>
                                        </>
                                    ) : (
                                        currentVideoModel?.options.map((opt, idx) => (
                                            <option key={idx} value={idx} disabled={isSyncAudio && opt.q === '标准模式'}>
                                                {(opt as any).s === 'AUTO' ? '自动时长' : (opt as any).s + 'S'} ({opt.q})
                                            </option>
                                        ))
                                    )}
                                </select>
                                </div>
                            </div>
                        )}
                        
                        {/* Seedance Slider */}
                        {selectedVideoModel === 'seedance-2.0' && (
                             <div className="space-y-1 mt-2">
                                <label className={labelClass}>视频时长 DURATION (4-15S)</label>
                                <div className="flex items-center gap-2.5 bg-white border border-black p-1.5 brutalist-shadow-sm h-10">
                                    <input type="range" min="4" max="15" value={seedanceDuration} onChange={(e) => setSeedanceDuration(parseInt(e.target.value))} className="flex-1 accent-black h-4" />
                                    <span className="font-normal text-black text-xs">{seedanceDuration}S</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
                
                {/* Render Generation Count separately if NOT Motion Control or Avatar (since they are handled above) */}
                {!(isVideoMode && (selectedVideoModel === 'kling-motion-control' || selectedVideoModel === 'kling-avatar-image2video')) && !isAudioMode && (
                    <div className="space-y-1">
                        <label className={labelClass}>生成数量 BATCH</label>
                        <div className="flex items-center gap-2.5 bg-white border border-black p-1.5 brutalist-shadow-sm h-10">
                            <input type="range" min="1" max={10} value={generationCount} onChange={(e) => setGenerationCount(parseInt(e.target.value))} className="flex-1 accent-black h-4" />
                            <span className="font-normal text-black text-xs">{generationCount}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                  {/* Red Instruction Text for GPT Models */}
                  {(!isVideoMode && !isAudioMode && (selectedModel === 'gpt-image-1-all' || selectedModel === 'gpt-image-1.5-all')) && (
                      <div className="text-xs text-brand-red font-normal mb-1">
                          提示词输入透明背景可生成透明背景图片
                      </div>
                  )}

                  <div className="flex justify-between items-end mb-1.5">
                    <label className={labelClass}>{isAudioMode ? "文本内容 TEXT" : "提示词描述 PROMPT"}</label>
                  </div>
                  
                  {/* Updated Toolbar matching the provided image style */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button onClick={optimizePrompt} disabled={isOptimizing} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F7CE00] text-black border border-black font-normal text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap">
                      {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><Wand2 className="w-3.5 h-3.5"/> AI</>}
                    </button>
                    {!isAudioMode && (
                        <button onClick={() => { setTempSelectedStyles([]); setActiveModal('styles'); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#3B82F6] text-white border border-black font-normal text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap">
                        <Palette className="w-3.5 h-3.5"/> 风格镜头
                        </button>
                    )}
                    <button onClick={() => setActiveModal('library')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#A855F7] text-white border border-black font-normal text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap">
                      <Bookmark className="w-3.5 h-3.5"/> 词库
                    </button>
                    
                    <div className="flex gap-2 ml-auto">
                      <button onClick={handleOpenSaveModal} disabled={!prompt.trim()} className="w-9 h-9 flex items-center justify-center bg-[#F472B6] text-white border border-black font-normal text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm" title="保存">
                        <Save className="w-4 h-4"/>
                      </button>
                      <button onClick={() => setActiveModal('edit-prompt')} className="w-9 h-9 flex items-center justify-center bg-[#4ADE80] text-black border border-black font-normal text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all" title="展开">
                        <Maximize2 className="w-4 h-4"/>
                      </button>
                      <button onClick={() => { setPrompt(''); setDialogueLines([]); }} className="w-9 h-9 flex items-center justify-center bg-white text-black border border-black font-normal text-xs brutalist-shadow-sm hover:bg-brand-red hover:text-white hover:translate-y-0.5 hover:shadow-none transition-all" title="清空">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>

                  {isVideoMode && selectedVideoModel === 'kling-avatar-image2video' && (
                        <div className="mb-2 text-xs text-brand-red font-normal italic">
                            * 请输入角色动作、情绪、运镜等（非必填）
                        </div>
                  )}
                  {isVideoMode && selectedVideoModel === 'kling-motion-control' && (
                        <div className="mb-2 text-xs text-brand-red font-normal italic">
                            * 提示词用于增加元素。（非必填）
                        </div>
                  )}

                  {isAudioMode && (
                       <div className="mb-2 text-xs text-brand-red font-normal">您可以使用自然语言来控制风格、语气、口音和节奏。也可点击AI一键生成</div>
                  )}

                  <div className="relative group">
                      {isAudioMode && audioGenMode === 'multi' ? (
                          <div className="flex flex-col gap-2 h-48 overflow-y-auto border border-black bg-slate-50 p-2">
                             {dialogueLines.map((line, idx) => (
                                 <div key={line.id} className="bg-white border border-black p-2 shadow-sm flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in">
                                    <div className="flex justify-between items-center bg-brand-cream border-b border-black/10 pb-1 mb-1 px-1">
                                        <select 
                                            value={line.speakerId} 
                                            onChange={e => {
                                                const newLines = [...dialogueLines];
                                                newLines[idx].speakerId = e.target.value;
                                                setDialogueLines(newLines);
                                            }}
                                            className="text-xs font-bold bg-transparent outline-none w-32 truncate"
                                        >
                                            {speakerMap.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <div className="flex gap-1 items-center">
                                           <button 
                                                onClick={() => {
                                                    if (idx === 0) return;
                                                    const newLines = [...dialogueLines];
                                                    [newLines[idx - 1], newLines[idx]] = [newLines[idx], newLines[idx - 1]];
                                                    setDialogueLines(newLines);
                                                }}
                                                disabled={idx === 0}
                                                className="p-1 text-slate-400 hover:text-black disabled:opacity-30"
                                            >
                                                <ArrowUp className="w-3 h-3"/>
                                            </button>
                                           <button 
                                                onClick={() => {
                                                    if (idx === dialogueLines.length - 1) return;
                                                    const newLines = [...dialogueLines];
                                                    [newLines[idx + 1], newLines[idx]] = [newLines[idx], newLines[idx + 1]];
                                                    setDialogueLines(newLines);
                                                }}
                                                disabled={idx === dialogueLines.length - 1}
                                                className="p-1 text-slate-400 hover:text-black disabled:opacity-30"
                                            >
                                                <ArrowDown className="w-3 h-3"/>
                                            </button>
                                           <button 
                                                onClick={() => setDialogueLines(dialogueLines.filter(l => l.id !== line.id))}
                                                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={line.text} 
                                        onChange={e => {
                                            const newLines = [...dialogueLines];
                                            newLines[idx].text = e.target.value;
                                            setDialogueLines(newLines);
                                        }}
                                        className="w-full h-12 p-1 text-sm outline-none resize-none bg-transparent font-normal" 
                                        placeholder="输入台词..." 
                                    />
                                 </div>
                             ))}
                             {dialogueLines.length === 0 && (
                                 <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                                     点击下方按钮添加对话
                                 </div>
                             )}
                             <div className="flex gap-2 flex-wrap pt-2 mt-auto">
                                 {speakerMap.map(s => (
                                    <button 
                                        key={s.id}
                                        onClick={() => setDialogueLines([...dialogueLines, { id: generateUUID(), speakerId: s.id, text: '' }])}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-black text-xs font-bold uppercase hover:bg-brand-yellow transition-colors brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none"
                                    >
                                        <Plus className="w-3 h-3"/> {s.name} 说...
                                    </button>
                                 ))}
                             </div>
                          </div>
                      ) : (
                          <textarea 
                              value={prompt} 
                              onChange={(e) => setPrompt(e.target.value)} 
                              placeholder={isAudioMode ? (audioGenMode === 'single' ? "阴森低语地说：指尖阵阵刺痛……我想定是那邪祟，正悄然近矣。" : "") : "描述您的创作奇想..."} 
                              className="w-full h-48 p-3 border border-black font-normal text-base bg-white focus:outline-none brutalist-input resize-y leading-relaxed" 
                          />
                      )}
                      
                      {showSaveSuccess && (
                        <div className="absolute top-2 right-2 bg-brand-green text-black border border-black px-2 py-1 text-[10px] font-normal brutalist-shadow-sm animate-in fade-in slide-in-from-right-2 z-20 italic">
                          保存成功
                        </div>
                      )}
                  </div>
                </div>
              </div>
          </section>
          )}

          <div className="space-y-3">
            {!isChatMode && !isAnnouncementMode && !isProxyMode && !isResourcesMode && (
              <>
                <button onClick={() => executeGeneration()} className="w-full py-3 bg-brand-red text-white text-xl font-normal border border-black brutalist-shadow hover:translate-y-1.5 hover:shadow-none transition-all uppercase tracking-tighter">
                  开始创作/Start Creating
                </button>
                
                <div className="bg-white border border-black p-4 brutalist-shadow-sm space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-brand-red" />
                    <span className="font-normal text-xs">温馨提示 / TIPS</span>
                  </div>
                  <div className="space-y-1.5 font-['Microsoft_YaHei','微软雅黑',sans-serif]">
                    <p className="text-sm font-normal leading-tight text-slate-700">1、首次使用请在设置中输入API令牌；</p>
                    <p className="text-sm font-normal leading-tight text-slate-700">2、如遇到多次请求失败请联系客服；</p>
                    <p className="text-sm font-normal leading-tight text-slate-700">3、欢迎提供优化建议。</p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {error && <div className="bg-white border-2 border-brand-red p-3 text-brand-red font-normal text-[11px] brutalist-shadow-sm">ERROR: {error}</div>}
        </div>
        )}
      </div>

      {!isFullWidthMode && (
      <div ref={galleryRef} className="flex-1 flex flex-col relative h-full overflow-hidden" onMouseDown={handleContainerMouseDown}>
        {/* ... (Existing JSX for gallery header and items remains the same) */}
        <div className="bg-brand-yellow border-b-2 border-black px-6 h-14 md:h-16 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-4">
              {selectedAssetIds.size > 0 && (
                <div className="flex gap-2 mr-4">
                  <button onClick={handleBatchDownload} className="bg-brand-blue text-white border border-black px-4 py-2 text-xs font-normal brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none uppercase">下载 ({selectedAssetIds.size})</button>
                  <button onClick={() => { selectedAssetIds.forEach(id => { deleteAssetFromDB(id); setGeneratedAssets(prev => prev.filter(a => a.id !== id)); }); setSelectedAssetIds(new Set()); }} className="bg-brand-red text-white border border-black px-4 py-2 text-xs font-normal brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none uppercase">删除 ({selectedAssetIds.size})</button>
                </div>
              )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
               <button onClick={() => setActiveModal('settings')} title="系统设置" className="w-9 h-9 md:w-10 md:h-10 bg-white border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                    <Settings2 className="w-5 h-5 md:w-6 md:h-6"/>
                </button>
                 <button onClick={() => setActiveModal('price')} title="价格说明" className="w-9 h-9 md:w-10 md:h-10 bg-brand-green border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                    <span className="text-xl font-bold text-white">¥</span>
                </button>
                <button onClick={() => setActiveModal('links')} title="联系客服" className="w-9 h-9 md:w-10 md:h-10 bg-white border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                    <Headset className="w-5 h-5 md:w-6 md:h-6"/>
                </button>
                <a href="https://www.vivaapi.cn/console/log" target="_blank" title="使用日志" className="w-9 h-9 md:w-10 md:h-10 bg-white border border-black flex items-center justify-center brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                  <History className="w-5 h-5 md:w-6 md:h-6" />
                </a>
          </div>
        </div>

        <div className="py-2 px-6 flex items-center shrink-0 overflow-hidden gap-4">
           <button onClick={handleSelectAll} className="flex-shrink-0 flex items-center gap-2 border border-black px-3 py-1.5 text-xs font-normal brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all bg-white uppercase">
              {selectedAssetIds.size === generatedAssets.length && generatedAssets.length > 0 ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>} 全选
            </button>
           
           <button 
              onClick={() => setIsMarqueeVisible(!isMarqueeVisible)} 
              className="flex-shrink-0 flex items-center justify-center border border-black px-2 py-1.5 text-xs font-normal brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all bg-white uppercase"
              title={isMarqueeVisible ? "关闭滚动公告" : "显示滚动公告"}
           >
              {isMarqueeVisible ? <MegaphoneOff className="w-4 h-4"/> : <Megaphone className="w-4 h-4"/>}
           </button>

           {isMarqueeVisible && (
           <div className="flex-1 overflow-hidden">
             <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
               <span className="text-base font-medium text-brand-red flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  本应用资产仅存储于用户本地浏览器中，请及时下载保存。
               </span>
               <span className="text-base font-medium text-brand-red flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  生成内容时请勿刷新页面，否则容易中断。
               </span>
               <span className="text-base font-medium text-brand-red flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  使用sora-2模型，请确保令牌分组包含sora-vip，但依旧不保证成功率
               </span>
               <span className="text-base font-medium text-brand-red flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  如遇模型不能使用，优先尝试切换API令牌分组。
               </span>
             </div>
           </div>
           )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-10">
            {generatedAssets.map((asset) => (
              <div key={asset.id} 
                   data-asset-id={asset.id} 
                   data-asset-card="true" 
                   onClick={(e) => toggleAssetSelection(asset.id, e)}
                   className={`group bg-white border-2 border-black brutalist-shadow transition-all hover:-translate-y-1 cursor-pointer relative ${selectedAssetIds.has(asset.id) ? 'border-brand-blue ring-4 ring-brand-blue/30' : ''}`}>
                
                <button 
                  onClick={(e) => handleAssetDelete(asset.id, e)} 
                  className="absolute top-2 right-2 bg-brand-red text-white p-2 border border-black brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all z-40"
                  title="删除此内容"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="aspect-square bg-slate-100 border-b-2 border-black relative overflow-hidden">
                  {(asset.status === 'loading' || asset.status === 'queued' || asset.status === 'processing') ? (
                     <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-50 relative">
                        <div className="flex flex-col items-center animate-pulse">
                            <Loader2 className="w-12 h-12 mb-4 animate-spin text-brand-black" />
                            <span className="font-normal text-xs uppercase tracking-tighter italic">Rendering...</span>
                        </div>
                        {asset.type === 'video' && (
                            <a 
                                href="https://www.vivaapi.cn/console/task" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="mt-4 px-3 py-1.5 bg-white border border-black text-sm font-normal uppercase hover:bg-brand-yellow transition-all brutalist-shadow-sm z-20 hover:-translate-y-0.5 hover:shadow-none flex items-center gap-1"
                            >
                                <ExternalLink className="w-4 h-4"/> 查询进度
                            </a>
                        )}
                     </div>
                  ) : asset.status === 'failed' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#f8fafc]">
                        <Frown className="w-16 h-16 text-[#808080] mb-3" strokeWidth={1.5} />
                        <span className="font-normal text-sm text-[#808080] tracking-wide">生成失败</span>
                     </div>
                  ) : asset.type === 'image' ? (
                    <img src={asset.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : asset.type === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      {asset.status === 'completed' ? <video src={asset.url} className="w-full h-full object-cover" muted loop autoPlay /> : <Loader2 className="w-12 h-12 animate-spin text-brand-red" />}
                    </div>
                  ) : (
                    // Audio Card Content
                    <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#E0E7FF] p-6">
                        {asset.coverUrl ? (
                            <img src={asset.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-[2px]" />
                        ) : null}
                        <div className={`w-20 h-20 bg-brand-purple border-2 border-black rounded-full flex items-center justify-center brutalist-shadow mb-4 relative z-10 overflow-hidden`}>
                             {asset.coverUrl ? <img src={asset.coverUrl} className="w-full h-full object-cover" /> : <AudioLines className="w-10 h-10 text-white" />}
                        </div>
                        <audio src={asset.url} controls className="w-full h-8 mt-2 relative z-10" />
                    </div>
                  )}
                  <div className={`absolute top-3 left-3 ${asset.status === 'failed' ? 'bg-black text-white' : asset.type === 'video' ? 'bg-brand-red text-white' : asset.type === 'audio' ? 'bg-brand-purple text-white' : 'bg-brand-yellow'} border border-black px-2 py-0.5 font-normal text-xs uppercase z-10`}>{asset.type}</div>
                  {asset.status === 'completed' && asset.type !== 'audio' && (
                    <div className="absolute inset-0 bg-brand-yellow/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
                        <button onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }} className="p-3 bg-white border border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none"><Maximize2 className="w-6 h-6"/></button>
                        <button onClick={(e) => handleAssetDownload(asset, e)} className="p-3 bg-white border border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none"><Download className="w-6 h-6"/></button>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white space-y-3">
                  <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-2">
                    <span className="font-bold text-xs text-black uppercase truncate max-w-[65%]" title={asset.modelName}>
                      {asset.modelName}
                    </span>
                    <span className="font-bold text-xs text-black uppercase">
                       {asset.config?.aspectRatio || asset.config?.videoRatio || 'AUTO'}
                    </span>
                  </div>
                  
                  <div className="relative group/prompt">
                    <p className="text-sm font-normal line-clamp-2 leading-tight pr-6 transition-colors group-hover/prompt:text-brand-blue" title={asset.prompt}>
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
                     <button disabled={asset.status !== 'completed' && asset.status !== 'failed'} onClick={(e) => { e.stopPropagation(); handleAssetRefresh(asset); }} className="flex-1 py-1.5 bg-white border border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-yellow hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-normal uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                        <RefreshCw className="w-3 h-3" /> 重绘
                     </button>
                     {(asset.type === 'video' || asset.type === 'image') && (
                        <button disabled={asset.status !== 'completed' || (asset.type === 'video' && !asset.modelId.includes('sora-2'))} onClick={(e) => { e.stopPropagation(); handleAssetEdit(asset); }} className="flex-1 py-1.5 bg-white border border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-yellow hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-normal uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                            <Edit className="w-3 h-3" /> 编辑
                        </button>
                     )}
                     {(asset.type === 'audio') && (
                        <button onClick={(e) => handleAssetDownload(asset, e)} className="flex-1 py-1.5 bg-white border border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-green hover:text-black hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-normal uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                            <Download className="w-3 h-3" /> 下载
                        </button>
                     )}
                     <button disabled={asset.status !== 'completed' || asset.type === 'video' || asset.type === 'audio'} onClick={(e) => { e.stopPropagation(); handleAssetGenVideo(asset); }} className="flex-1 py-1.5 bg-white border border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-red hover:text-white hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-normal uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                        <Video className="w-3 h-3" /> 视频
                     </button>
                  </div>
                </div>
              </div>
            ))}

            {generatedAssets.length === 0 && (
              <div className="col-span-full h-[400px] border-2 border-dashed border-slate-300 flex flex-col items-center justify-center">
                <Bot className="w-32 h-32 opacity-10 mb-4" />
                <span className="font-normal text-4xl uppercase tracking-tighter opacity-10 italic">READY FOR ADVENTURE</span>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ... (Other modals: settings, links, usage, price, edit-prompt, styles, library, save-prompt-confirm, video-remix, previewAsset, previewRefImage - all remain unchanged) */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[600px] bg-white border-2 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="系统设置 / SETTINGS" icon={Settings2} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
              
              <div className="font-bold text-brand-red text-xl">
                 API令牌分组：限时特价→default→优质gemini→逆向→sora-vip
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <a href={FIXED_BASE_URL} target="_blank" className="text-lg font-bold uppercase italic flex items-center gap-2 hover:underline decoration-2 underline-offset-4">
                        API令牌获取地址 <ExternalLink className="w-5 h-5"/>
                    </a>
                </div>
                <input 
                    type="text" 
                    value="https://www.vivaapi.cn" 
                    readOnly 
                    className="w-full h-14 px-4 border border-black bg-slate-50 text-slate-600 text-lg font-normal font-mono outline-none" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-lg font-bold uppercase italic block">
                    API令牌 (KEY)
                </label>
                <input 
                    type="password" 
                    value={tempConfig.apiKey} 
                    onChange={e => setTempConfig({...tempConfig, apiKey: e.target.value})} 
                    className="w-full h-14 px-4 border border-black text-xl font-normal font-mono outline-none focus:bg-brand-cream transition-colors tracking-widest" 
                />
              </div>

              <button onClick={saveConfig} className="w-full h-16 bg-brand-yellow border-2 border-black font-bold text-xl uppercase tracking-tighter hover:translate-y-1 hover:shadow-none brutalist-shadow transition-all flex items-center justify-center gap-2 mt-2">
                保存设置/SAVE SETTINGS
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ... remaining modals kept identical ... */}
      {activeModal === 'links' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[500px] bg-white border-2 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="联系客服 / CONTACT SUPPORT" icon={Headset} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
               <div className="bg-brand-cream border-2 border-black p-6 flex flex-col items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                  <div className="absolute top-0 right-0 bg-brand-yellow px-3 py-1 border-l border-b border-black font-normal text-[10px] uppercase">Online</div>
                  <div className="w-16 h-16 bg-brand-blue text-white border border-black rounded-full flex items-center justify-center brutalist-shadow-sm mb-2">
                      <Headset className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-2 w-full">
                      <h3 className="font-bold text-sm uppercase italic text-slate-500 tracking-widest">WeChat Support</h3>
                      <div className="flex w-full items-stretch">
                          <div className="bg-brand-green text-black px-4 flex items-center justify-center border border-black border-r-0 font-bold text-xl whitespace-nowrap tracking-tighter">
                            微信客服
                          </div>
                          <div className="bg-white border border-black px-4 py-3 text-2xl font-bold uppercase tracking-wider select-all cursor-text hover:bg-slate-50 transition-colors flex-1 text-center">
                              viva-api
                          </div>
                      </div>
                      <p className="text-[10px] font-normal text-slate-400 uppercase italic">Click text to copy / Long press</p>
                  </div>
               </div>

               <div className="w-full h-0.5 bg-slate-100 border-t border-dashed border-slate-300"></div>

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

                  <a href="https://ai.feishu.cn/wiki/O6Q9wrxxci898Wkj6ndcFnlknJd?from=from_copylink" target="_blank" className="flex items-center justify-center w-full py-4 bg-brand-red text-white border-2 border-transparent outline outline-2 outline-black font-bold text-lg uppercase hover:bg-black hover:translate-y-1 hover:shadow-none brutalist-shadow transition-all italic gap-2 group">
                      查看更多详情 <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform"/>
                  </a>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'usage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[550px] bg-brand-cream border-2 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="使用流程 / USAGE FLOW" icon={BookOpen} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
              {[
                { n: '1', t: '注册与令牌', d: <>
                  前往主站 <a href="https://www.vivaapi.cn" target="_blank" className="text-blue-600 font-medium underline italic">www.vivaapi.cn</a> 注册并创建您的专属令牌。
                  <div className="mt-2 text-brand-red font-normal text-sm">API令牌分组：限时特价→default→优质gemini→逆向→sora-vip</div>
                </> },
                { n: '2', t: '配置使用', d: '点击本站上方设置 按钮，输入令牌即可开始创作。' },
                { n: '3', t: '查询日志', d: '使用记录及额度消耗情况请在主站后台查询。' }
              ].map(step => (
                <div key={step.n} className="relative bg-white border border-black p-6 pt-8 brutalist-shadow-sm">
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-lg italic font-medium border-2 border-white">{step.n}</div>
                  <h3 className="font-medium text-xl mb-2 italic uppercase">{step.t}</h3>
                  <p className="text-base font-normal text-slate-500 leading-relaxed italic">{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'price' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[600px] bg-white border-2 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col max-h-[85vh]">
            <ModalHeader title="价格说明 / PRICING" icon="¥" onClose={() => setActiveModal(null)} />
            <PriceView />
            <div className="p-3 bg-brand-cream border-t-2 border-black shrink-0 text-center">
                <p className="text-sm text-slate-500 font-normal italic">
                   此价格为最低分组价格，详细可在API站点模型广场查看
                </p>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'edit-prompt' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl h-[80vh] bg-white border-2 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col">
            <ModalHeader title="提示词编辑 / PROMPT EDITOR" icon={Edit} onClose={() => setActiveModal(null)} />
            <div className="flex-1 p-6 flex flex-col gap-4 min-h-0">
                <textarea 
                    value={mainCategory === 'chat' ? chatInput : prompt} 
                    onChange={(e) => mainCategory === 'chat' ? setChatInput(e.target.value) : setPrompt(e.target.value)} 
                    placeholder="在此输入详细的提示词..." 
                    className="flex-1 w-full p-4 border border-black font-normal text-xl bg-[#F8FAFC] focus:outline-none brutalist-input resize-none leading-relaxed italic" 
                />
                <div className="flex justify-between items-center pt-2">
                    <div className="text-xs text-slate-500 font-normal uppercase italic">
                        {(mainCategory === 'chat' ? chatInput : prompt).length} CHARS
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => mainCategory === 'chat' ? setChatInput('') : setPrompt('')} className="px-4 py-2 bg-white border border-black font-normal uppercase hover:bg-slate-100 transition-colors brutalist-shadow-sm text-xs">
                            清空 / Clear
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(mainCategory === 'chat' ? chatInput : prompt); }} className="px-4 py-2 bg-white border border-black font-normal uppercase hover:bg-brand-yellow transition-colors brutalist-shadow-sm text-xs">
                            复制 / Copy
                        </button>
                        <button onClick={() => setActiveModal(null)} className="px-6 py-2 bg-brand-red text-white border border-black font-normal uppercase hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm transition-all text-xs">
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
          <div className="w-[900px] max-w-full bg-white border-2 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col max-h-[85vh]">
            <ModalHeader title="风格与镜头 / STYLES & CAMERA" icon={Palette} onClose={() => setActiveModal(null)} />
            <div className="flex-1 p-4 md:p-5 overflow-y-auto no-scrollbar bg-[#f8fafc]">
              
              {renderStyleSection('艺术风格 (Art Styles)', STYLES.map(s => s.zh), false)}
              
              <div className="w-full border-t border-dashed border-slate-300 my-4"></div>

              {renderStyleSection('镜头 (Camera)', CAMERA_MOVES)}
              {renderStyleSection('运镜速度 (Speed)', CAMERA_SPEEDS)}
              {renderStyleSection('景别 (Shot)', SHOT_TYPES)}
              {renderStyleSection('光影 (Lighting)', LIGHTING_STYLES, true)}
              {renderStyleSection('画面 (Composition)', COMPOSITION_STYLES, true)}
              {renderStyleSection('氛围 (Atmosphere)', ATMOSPHERE_STYLES, true)}
            </div>
            <div className="p-3 border-t-2 border-black bg-brand-cream flex justify-end items-center flex-shrink-0">
              <button onClick={applyStyles} className="px-6 py-2 bg-brand-red text-white border border-black font-normal uppercase tracking-tighter italic text-xs brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all">
                完成 / DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ... (Library, Save Confirm, Video Remix, Preview Modals remain unchanged) ... */}
      {activeModal === 'library' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[900px] h-[80vh] bg-white border-2 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col">
            <ModalHeader title="提示词库 / PROMPT LIBRARY" icon={Bookmark} onClose={() => setActiveModal(null)} />
            
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Main Content */}
                <div className="flex-1 bg-white p-6 overflow-y-auto">
                    <div className="flex flex-col gap-3">
                        {libraryPrompts
                          .map((p) => {
                            const isEditing = editingLibraryId === p.id;
                            const globalIndex = libraryPrompts.indexOf(p); // Use absolute index for drag
                            return (
                              <div 
                                key={p.id}
                                draggable={!editingLibraryId}
                                onDragStart={() => handleDragStart(globalIndex)}
                                onDragOver={(e) => handleDragOver(e, globalIndex)}
                                onDragEnd={handleDragEnd}
                                className={`border border-black p-4 transition-all ${isEditing ? 'bg-brand-cream ring-4 ring-black/10' : 'bg-white hover:bg-brand-cream'}`}
                              >
                                {isEditing ? (
                                    <div className="space-y-3" onClick={e => e.stopPropagation()}>
                                      <div className="flex gap-2">
                                          <input value={editingLibraryName} onChange={e => setEditingLibraryName(e.target.value)} className="flex-1 font-normal border-b border-black bg-transparent outline-none pb-1 text-sm" placeholder="名称" />
                                      </div>
                                      <textarea value={editingLibraryText} onChange={e => setEditingLibraryText(e.target.value)} className="w-full h-24 text-xs border border-black p-2 resize-none outline-none focus:bg-white" placeholder="提示词..." />
                                      <div className="flex items-center gap-2 justify-end">
                                          <button onClick={handleCancelLibraryEdit} className="px-3 py-1 bg-white border border-black text-xs font-normal hover:bg-slate-100">取消</button>
                                          <button onClick={(e) => handleSaveLibraryEdit(p.id, e)} className="px-4 py-1 bg-brand-green border border-black text-xs font-normal hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm transition-all">保存</button>
                                      </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                      <div className="cursor-grab active:cursor-grabbing flex flex-col justify-center text-slate-300 hover:text-black transition-colors">
                                        <GripVertical className="w-5 h-5"/>
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-2">
                                          <div className="flex justify-between items-start">
                                            <h4 className="font-normal text-base truncate pr-2">{p.name}</h4>
                                          </div>
                                          <p className="text-sm text-slate-500 line-clamp-2 cursor-pointer hover:text-black transition-colors leading-relaxed" onClick={() => usePromptFromLibrary(p.text)} title={p.text}>{p.text}</p>
                                          
                                          <div className="flex items-center gap-4 pt-1">
                                            <button onClick={() => usePromptFromLibrary(p.text)} className="flex items-center gap-1 text-[10px] font-normal text-slate-400 hover:text-brand-green transition-colors uppercase">
                                                <Zap className="w-3 h-3" /> Use
                                            </button>
                                            <button onClick={(e) => handleStartLibraryEdit(p, e)} className="flex items-center gap-1 text-[10px] font-normal text-slate-400 hover:text-brand-blue transition-colors uppercase">
                                                <Edit className="w-3 h-3" /> Edit
                                            </button>
                                            <button onClick={(e) => removePromptFromLibrary(p.id, e)} className="flex items-center gap-1 text-[10px] font-normal text-slate-400 hover:text-brand-red transition-colors uppercase">
                                                <Trash2 className="w-3 h-3" /> Del
                                            </button>
                                          </div>
                                      </div>
                                    </div>
                                )}
                              </div>
                            );
                          })}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'save-prompt-confirm' && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="bg-white border-2 border-black p-6 brutalist-shadow animate-in zoom-in-95 w-[400px] space-y-4">
                <h3 className="font-bold text-lg uppercase italic">保存到词库 / SAVE PROMPT</h3>
                <div className="space-y-3">
                    <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} className="w-full border border-black p-2 text-sm outline-none" placeholder="名称 (Name)" />
                    
                    {/* Category selection removed */}

                    <div className="bg-slate-50 p-2 text-xs text-slate-500 border border-black line-clamp-3 italic">
                        {prompt}
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-white border border-black text-xs font-normal hover:bg-slate-100">取消</button>
                    <button onClick={confirmSavePrompt} className="px-6 py-2 bg-brand-green border border-black text-xs font-normal hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm transition-all">确认保存</button>
                </div>
            </div>
         </div>
      )}

      {activeModal === 'video-remix' && remixingAsset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-[500px] bg-white border-2 border-black brutalist-shadow animate-in zoom-in-95 relative">
                 <ModalHeader title="视频重绘 / VIDEO REMIX" icon={RefreshCw} onClose={() => { setActiveModal(null); setRemixingAsset(null); }} />
                 <div className="p-6 space-y-4">
                     <div className="bg-brand-cream border border-black p-3 text-xs">
                         <span className="font-bold">原提示词：</span> {remixingAsset.prompt}
                     </div>
                     <textarea 
                        value={remixPrompt} 
                        onChange={e => setRemixPrompt(e.target.value)}
                        className="w-full h-32 border border-black p-3 text-sm outline-none resize-none focus:bg-slate-50"
                        placeholder="请输入新的提示词用于重绘..."
                        autoFocus
                     />
                     <div className="flex justify-end gap-3">
                         <button onClick={() => { setActiveModal(null); setRemixingAsset(null); }} className="px-4 py-2 bg-white border border-black text-xs hover:bg-slate-100">取消</button>
                         <button onClick={executeVideoRemix} disabled={!remixPrompt.trim()} className="px-6 py-2 bg-brand-green border border-black text-xs hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm transition-all disabled:opacity-50">开始重绘</button>
                     </div>
                 </div>
            </div>
        </div>
      )}

      {previewAsset && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setPreviewAsset(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-[110]" onClick={() => setPreviewAsset(null)}>
            <X className="w-8 h-8 drop-shadow-md" />
          </button>
          
          <div className="w-full h-full flex items-center justify-center p-2 md:p-4" onClick={e => e.stopPropagation()}>
             {previewAsset.type === 'image' ? (
                <img src={previewAsset.url} className="max-w-full max-h-full object-contain shadow-2xl" />
             ) : (
                <video src={previewAsset.url} controls autoPlay className="max-w-full max-h-full shadow-2xl" />
             )}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleAssetDownload(previewAsset, e); }} 
            className="absolute bottom-8 right-8 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20 group z-[110]"
            title="下载原图"
          >
            <Download className="w-8 h-8 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {previewRefImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-10" onClick={() => setPreviewRefImage(null)}>
            <div className="relative max-w-full max-h-full">
                <img src={previewRefImage.data.startsWith('http') ? previewRefImage.data : `data:${previewRefImage.mimeType};base64,${previewRefImage.data}`} className="max-w-full max-h-[90vh] object-contain border-4 border-white" />
                <button onClick={() => setPreviewRefImage(null)} className="absolute -top-12 right-0 text-white hover:text-red-500">
                    <X className="w-8 h-8"/>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);