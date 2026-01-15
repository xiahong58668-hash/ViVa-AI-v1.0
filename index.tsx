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
  Image as ImageIcon, Film, BookOpen, Headset, Shield,
  Paperclip, Send, FileText, Music, Rocket, Mic, Volume2,
  User, VolumeX, Sliders, AudioLines, Users
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
}

interface ReferenceImage {
  id: string;
  data: string;
  mimeType: string;
  uploadStatus?: 'uploading' | 'success' | 'failed';
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

// --- Constants ---

const FIXED_BASE_URL = 'https://www.vivaapi.cn';
const UPLOAD_PROXY_URL = "https://imageproxy.zhongzhuan.chat/api/upload";

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
  '原图比例': '原图比例 (Source)',
  'Default': '默认比例 (Default)'
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
    name: 'Sora-2-All', 
    desc: '标清视频', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '10', q: '标清'}, 
      {s: '15', q: '标清'}
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

const KLING_MODELS = [
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
    name: 'KING AVATAR数字人', 
    desc: '图生视频', 
    supportedAspectRatios: ['原图比例'],
    options: [
      {s: 'AUTO', q: '标准模式'}, {s: 'AUTO', q: '高品质模式'}
    ] 
  },
  { 
    id: 'kling-advanced-lip-sync', 
    name: 'KING ADVANCED对口型', 
    desc: '口型同步', 
    supportedAspectRatios: ['Default'],
    options: [
      {s: 'AUTO', q: '标准模式'}
    ] 
  }
];

const AUDIO_MODELS = [
  { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro TTS' }
];

const VOICES = [
  { id: 'Zephyr', name: 'Zephyr (明亮)' },
  { id: 'Puck', name: 'Puck (欢快)' },
  { id: 'Charon', name: 'Charon (信息丰富)' },
  { id: 'Kore', name: 'Kore (Firm)' },
  { id: 'Fenrir', name: 'Fenrir (Excitable)' },
  { id: 'Orus', name: 'Orus (公司)' },
  { id: 'Autonoe', name: 'Autonoe (明亮)' },
  { id: 'Umbriel', name: 'Umbriel (轻松自在)' },
  { id: 'Erinome', name: 'Erinome (清除)' },
  { id: 'Laomedeia', name: 'Laomedeia (欢快)' },
  { id: 'Schedar', name: 'Schedar (Even)' },
  { id: 'Achird', name: 'Achird (友好)' },
  { id: 'Sadachbia', name: 'Sadachbia (活泼)' },
  { id: 'Aoede', name: 'Aoede (Breezy)' },
  { id: 'Enceladus', name: 'Enceladus (气声)' },
  { id: 'Algieba', name: 'Algieba (平滑)' },
  { id: 'Algenib', name: 'Algenib (Gravelly)' },
  { id: 'Achernar', name: 'Achernar (软)' },
  { id: 'Gacrux', name: 'Gacrux (成熟)' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi (随意)' },
  { id: 'Sadaltager', name: 'Sadaltager (知识渊博)' },
  { id: 'Leda', name: 'Leda (青春)' },
  { id: 'Callirrhoe', name: 'Callirrhoe (轻松)' },
  { id: 'Iapetus', name: 'Iapetus (清晰)' },
  { id: 'Despina', name: 'Despina (平滑)' },
  { id: 'Rasalgethi', name: 'Rasalgethi (信息丰富)' },
  { id: 'Alnilam', name: 'Alnilam (Firm)' },
  { id: 'Pulcherrima', name: 'Pulcherrima (直率)' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix (温柔)' },
  { id: 'Sulafat', name: 'Sulafat (偏高)' }
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

// New constants from PDF/OCR
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

// PCM to WAV converter for Gemini TTS raw output
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
        
        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + bytes.length, true);
        writeString(view, 8, 'WAVE');
        
        // fmt sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
        view.setUint16(22, numChannels, true); // NumChannels
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
        view.setUint16(32, numChannels * 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        
        // data sub-chunk
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

const uploadFileToProxy = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(UPLOAD_PROXY_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const json = await res.json();
        return json.url || json.data?.url || json.link || json.data?.link || '';
    } catch(e) {
        console.error("Proxy upload error", e);
        return "";
    }
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
// ... (ChatBot component code remains the same)

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
            const key = (config.apiKey || (typeof process !== 'undefined' && process.env && process.env.API_KEY ? process.env.API_KEY : '')).trim();
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
                                        <button onClick={() => removeAttachment(i)} className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border-2 border-black w-5 h-5 flex items-center justify-center text-[10px] z-10">
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

// ... (Sub-components: SectionLabel, CircularButton, ModalHeader remain the same)

const SectionLabel = ({ text, link }: { text: string, link?: { href: string, text: string } }) => (
  <div className="border-b-2 border-black pb-0.5 mb-1.5 flex justify-between items-end">
    <label className="text-sm font-normal uppercase tracking-tighter cursor-default">
      {text}
    </label>
    {link && (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm font-normal uppercase tracking-tighter text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors underline decoration-auto underline-offset-2">
        <BookOpen className="w-4 h-4"/> {link.text}
      </a>
    )}
  </div>
);

interface CircularButtonProps {
  children?: React.ReactNode;
  onClick: () => void;
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
  const [mainCategory, setMainCategory] = useState<'image' | 'video' | 'proxy' | 'kling' | 'audio'>('image');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [selectedVideoModel, setSelectedVideoModel] = useState(VIDEO_MODELS[0].id);
  const [selectedKlingModel, setSelectedKlingModel] = useState(KLING_MODELS[0].id);
  const [selectedAudioModel, setSelectedAudioModel] = useState(AUDIO_MODELS[0].id);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [audioGenMode, setAudioGenMode] = useState<'single' | 'multi'>('single');
  const [speakerMap, setSpeakerMap] = useState<{id: string, name: string, voice: string}[]>([
    { id: '1', name: '角色A', voice: 'Puck' },
    { id: '2', name: '角色B', voice: 'Zephyr' }
  ]);
  const [videoOptionIdx, setVideoOptionIdx] = useState(0);
  const [klingOptionIdx, setKlingOptionIdx] = useState(0);
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [klingRatio, setKlingRatio] = useState('16:9');
  const [isSyncAudio, setIsSyncAudio] = useState(false);
  const [klingOrientation, setKlingOrientation] = useState('video');
  const [klingKeepSound, setKlingKeepSound] = useState(false);
  const [klingDubVol, setKlingDubVol] = useState(1.0);
  const [klingSrcVol, setKlingSrcVol] = useState(0.0);
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
  const [referenceAudio, setReferenceAudio] = useState<ReferenceAudio | null>(null);
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
  
  // Library State & other states...
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [editingLibraryText, setEditingLibraryText] = useState('');
  const [editingLibraryName, setEditingLibraryName] = useState('');
  const [editingLibraryCategory, setEditingLibraryCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [tempSelectedStyles, setTempSelectedStyles] = useState<string[]>([]);
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [showSaveCategoryDropdown, setShowSaveCategoryDropdown] = useState(false);
  const [remixingAsset, setRemixingAsset] = useState<GeneratedAsset | null>(null);
  const [remixPrompt, setRemixPrompt] = useState('');
  
  const galleryRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);

  const safeEnvKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

  const isVideoMode = mainCategory === 'video';
  const isProxyMode = mainCategory === 'proxy';
  const isKlingMode = mainCategory === 'kling';
  const isAudioMode = mainCategory === 'audio';

  // ... (useEffects remain same) ...
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!isVideoMode && !isProxyMode && !isKlingMode && !isAudioMode) {
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
    } else if (isKlingMode) {
        const model = KLING_MODELS.find(m => m.id === selectedKlingModel);
        if (model) {
            if (model.supportedAspectRatios && !model.supportedAspectRatios.includes(klingRatio)) {
                setKlingRatio(model.supportedAspectRatios[0]);
            }
            if (klingOptionIdx >= model.options.length) {
                setKlingOptionIdx(0);
            }
        }
    }
  }, [selectedModel, selectedVideoModel, selectedKlingModel, mainCategory, aspectRatio, imageSize, videoRatio, klingRatio, isVideoMode, isProxyMode, isKlingMode, isAudioMode, klingOptionIdx, isSyncAudio]);

  useEffect(() => {
    if (error && error.includes('张参考图')) {
      const currentModel = MODELS.find(m => m.id === selectedModel);
      let max = 4;
      if (!isVideoMode && !isKlingMode) {
          max = currentModel?.maxImages || 4;
      } else if (isKlingMode) {
          if (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control') {
              max = 1;
          } else if (selectedKlingModel === 'kling-video') {
              max = isSyncAudio ? 1 : 2;
          } else {
              max = 2;
          }
      } else {
          max = (selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1;
      }

      if (referenceImages.length <= max) {
        setError(null);
      }
    }
  }, [referenceImages, selectedModel, selectedVideoModel, selectedKlingModel, mainCategory, error, isVideoMode, isKlingMode, isSyncAudio]);

  useEffect(() => {
    if (isKlingMode && isSyncAudio) {
        const model = KLING_MODELS.find(m => m.id === selectedKlingModel);
        if (model) {
            if (klingOptionIdx < model.options.length) {
                const currentOption = model.options[klingOptionIdx];
                if (currentOption && currentOption.q === '标准模式') {
                    const hqIdx = model.options.findIndex(o => o.s === currentOption.s && o.q === '高品质模式');
                    if (hqIdx !== -1) {
                        setKlingOptionIdx(hqIdx);
                    } else {
                        const anyHqIdx = model.options.findIndex(o => o.q === '高品质模式');
                        if (anyHqIdx !== -1) setKlingOptionIdx(anyHqIdx);
                    }
                }
            }
        }
    }
  }, [isKlingMode, isSyncAudio, selectedKlingModel, klingOptionIdx]);
  
  useEffect(() => {
    if (isKlingMode && selectedKlingModel === 'kling-motion-control') {
        setKlingKeepSound(true);
    }
  }, [isKlingMode, selectedKlingModel]);

  useEffect(() => {
    if (activeModal === 'edit-prompt') {
      setPrompt(prev => prev.replace(/([。])(?!\s*\n)/g, '$1\n\n').replace(/(\. )/g, '.\n\n'));
    }
  }, [activeModal]);

  useEffect(() => {
    getAllAssetsFromDB().then(assets => {
        const sorted = assets.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setGeneratedAssets(sorted);
        sorted.filter(a => a.type === 'video' && a.modelId !== 'kling-video' && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => startVideoPolling(v.taskId!, v.id, v.timestamp, v.modelId));
        
        sorted.filter(a => a.type === 'image' && a.modelId === 'kling-image-o1' && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => startKlingImagePolling(v.taskId!, v.id, v.timestamp));

        sorted.filter(a => a.type === 'video' && (a.modelId === 'kling-video' || a.modelId === 'kling-avatar-image2video' || a.modelId === 'kling-motion-control' || a.modelId === 'kling-advanced-lip-sync') && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => {
                  let endpointType = 'text2video';
                  if (v.modelId === 'kling-avatar-image2video') {
                     endpointType = 'avatar/image2video';
                  } else if (v.modelId === 'kling-motion-control') {
                     endpointType = 'motion-control';
                  } else if (v.modelId === 'kling-advanced-lip-sync') {
                     endpointType = 'advanced-lip-sync';
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

  // ... (all other helper functions remain the same) ...
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
        let key = (configRef.current.apiKey || safeEnvKey).trim();
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

  const startKlingVideoPolling = (taskId: string, assetId: string, startTime: number, endpointType: string) => {
    const interval = setInterval(async () => {
        let key = (configRef.current.apiKey || safeEnvKey).trim();
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const url = `${configRef.current.baseUrl}/kling/v1/videos/${endpointType}/${taskId}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } });
            const data = await res.json();
            
            const taskStatus = data.data?.task_status || '';
            const taskResult = data.data?.task_result;
            
            if (taskStatus === 'succeed') {
                 const videoUrl = taskResult?.videos?.[0]?.url;
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
            console.error("Polling error for kling video task", taskId, e);
        }
    }, 5000);
  };

  const startVideoPolling = (taskId: string, assetId: string, startTime: number, modelId: string) => {
    const interval = setInterval(async () => {
        let key = (configRef.current.apiKey || safeEnvKey).trim();
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const isVeoGrokJimeng = modelId.startsWith('veo') || modelId.startsWith('grok') || modelId.startsWith('jimeng') || modelId.startsWith('kling');
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

  // ... (Image/Video Upload handlers) ...
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentModel = MODELS.find(m => m.id === selectedModel);
    
    let max = 4;
    if (!isVideoMode && !isKlingMode) {
        max = currentModel?.maxImages || 4;
    } else if (isKlingMode) {
        if (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control') {
            max = 1;
        } else if (selectedKlingModel === 'kling-video') {
            max = isSyncAudio ? 1 : 2;
        } else {
            max = 2;
        }
    } else {
        max = (selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1;
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
            
            if (isKlingMode && selectedKlingModel === 'kling-motion-control') {
                newItem.uploadStatus = 'uploading';
                setReferenceImages(prev => [...prev, newItem]);
                
                uploadFileToProxy(file).then(url => {
                    if (url) {
                        setReferenceImages(prev => prev.map(img => img.id === newItem.id ? { ...img, data: url, uploadStatus: 'success' } : img));
                    } else {
                         setReferenceImages(prev => prev.map(img => img.id === newItem.id ? { ...img, uploadStatus: 'failed' } : img));
                         setError('图片上传失败，请重试');
                    }
                }).catch(e => {
                     setReferenceImages(prev => prev.map(img => img.id === newItem.id ? { ...img, uploadStatus: 'failed' } : img));
                     setError('图片上传失败: ' + e.message);
                });
            } else {
                setReferenceImages(prev => [...prev, newItem]);
            }
        }
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
        setError(`视频 ${file.name} 超过 100MB 限制`);
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        const matches = result.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            const newVideo: ReferenceImage = { id: generateUUID(), mimeType: matches[1], data: matches[2] };
            
            if (isKlingMode && (selectedKlingModel === 'kling-motion-control' || selectedKlingModel === 'kling-advanced-lip-sync')) {
                newVideo.uploadStatus = 'uploading';
                setReferenceVideo(newVideo);
                
                uploadFileToProxy(file).then(url => {
                    if (url) {
                         setReferenceVideo(prev => prev ? { ...prev, data: url, uploadStatus: 'success' } : null);
                    } else {
                         setReferenceVideo(prev => prev ? { ...prev, uploadStatus: 'failed' } : null);
                         setError('视频上传失败，请重试');
                    }
                }).catch(e => {
                     setReferenceVideo(prev => prev ? { ...prev, uploadStatus: 'failed' } : null);
                     setError('视频上传失败: ' + e.message);
                });
            } else {
                setReferenceVideo(newVideo);
            }
        }
    };
    reader.readAsDataURL(file);
  };
  
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/x-m4a'];
    if (!validTypes.some(type => file.type.includes(type) || file.type.startsWith('audio/'))) {
        setError('不支持的音频格式，请上传 MP3, WAV, M4A 或 AAC');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        setError('音频文件大小不能超过 5MB');
        return;
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    
    audio.onloadedmetadata = () => {
        const duration = audio.duration;
        URL.revokeObjectURL(url);

        if (duration < 2 || duration > 60) {
            setError('音频时长需在 2~60 秒之间');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const matches = result.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                setReferenceAudio({ 
                    id: generateUUID(), 
                    mimeType: matches[1], 
                    data: matches[2],
                    name: file.name,
                    duration: duration
                });
                setError(null);
            }
        };
        reader.readAsDataURL(file);
    };
    audio.onerror = () => {
        setError('无法读取音频文件');
        URL.revokeObjectURL(url);
    }
    e.target.value = '';
  };

  // ... (Other handlers like addVideoLink, removeReference, optimizePrompt, etc. remain the same) ...
  
  const removeReferenceImage = (id: string) => setReferenceImages(prev => prev.filter(img => img.id !== id));
  const removeReferenceAudio = () => setReferenceAudio(null);

  const optimizePrompt = async () => {
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

     if (isVideoMode || isKlingMode) {
       const modelList = isKlingMode ? KLING_MODELS : VIDEO_MODELS;
       const selectedId = isKlingMode ? selectedKlingModel : selectedVideoModel;
       const optionIdx = isKlingMode ? klingOptionIdx : videoOptionIdx;
       
       const currentVideoModelDef = modelList.find(m => m.id === selectedId);
       const durationOption = currentVideoModelDef?.options[optionIdx];
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
     } else if (isAudioMode) {
       sys = `你是一位专业的语音合成文本润色专家。
请将用户的输入文本进行优化，使其更适合朗读，语调自然流畅。
如果用户输入的是简短的主题，请扩写成一段适合语音合成的完整文本。
要求：
1. 保持原意。
2. 适合口语表达。
3. 仅输出优化后的文本。`;
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

  const renderStyleSection = (title: string, items: string[], isMulti: boolean = false) => (
      <div className="mb-5">
        <h4 className="font-bold text-lg mb-2 uppercase flex items-center gap-2">
            <span className="w-1.5 h-5 bg-black"></span>
            {title} {isMulti && <span className="text-xs text-slate-500 font-normal">(多选)</span>}
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {items.map(item => (
                <button 
                    key={item}
                    onClick={() => toggleStyle(item, items, isMulti)}
                    className={`py-1 px-1 border-2 border-black text-base font-bold transition-all duration-200 truncate ${
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

  const handleOpenSaveModal = () => {
    if (!prompt.trim()) return;
    setSaveName(prompt.slice(0, 8));
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
    
    const updated = [newPrompt, ...libraryPrompts];
    setLibraryPrompts(updated);
    localStorage.setItem('viva_library_prompts', JSON.stringify(updated));

    if (!categories.includes(cat)) {
        const newCats = [...categories, cat].sort();
        setCategories(newCats);
        localStorage.setItem('viva_library_categories', JSON.stringify(newCats));
    }
    setSelectedCategory(cat);
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

  const handleDragStart = (idx: number) => {
    if (editingLibraryId || selectedCategory !== '全部') return;
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

  const executeAudioGeneration = async (overrideConfig?: any) => {
    const tPrompt = overrideConfig?.prompt ?? prompt;
    const tModelId = overrideConfig?.modelId ?? selectedAudioModel;
    const tVoice = overrideConfig?.selectedVoice ?? selectedVoice;
    const tAudioMode = overrideConfig?.audioGenMode ?? audioGenMode;
    const tSpeakerMap = overrideConfig?.speakerMap ?? speakerMap;

    if (!tPrompt) { setError("请输入文本"); return; }
    
    let key = (config.apiKey || safeEnvKey).trim();
    if (!key) { setError("请先设置API Key"); return; }

    const placeholderId = generateUUID();
    const startTime = Date.now();
    
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
            // Gemini Audio is typically 24kHz PCM mono.
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
    const isKling = overrideConfig?.isKlingMode ?? (mainCategory === 'kling');
    const tModelId = overrideConfig?.modelId ?? (isKling ? selectedKlingModel : selectedVideoModel);
    const tPrompt = overrideConfig?.prompt ?? prompt;

    // Prompt is optional only for kling-avatar-image2video and advanced-lip-sync and motion-control
    if (!tPrompt && tModelId !== 'kling-avatar-image2video' && tModelId !== 'kling-motion-control' && tModelId !== 'kling-advanced-lip-sync') { 
        setError("请输入提示词"); 
        return; 
    }
    
    let key = (config.apiKey || safeEnvKey).trim();
    if (!key) { setError("请先设置API Key"); return; }
    
    const modelList = isKling ? KLING_MODELS : VIDEO_MODELS;
    const modelDef = modelList.find(m => m.id === tModelId);
    
    if (!modelDef) {
       setError("模型配置未找到，可能已下架");
       return;
    }

    const placeholders: GeneratedAsset[] = [];
    const count = overrideConfig ? 1 : generationCount;
    const startTime = Date.now();
    
    const tRatio = overrideConfig?.videoRatio ?? (isKling ? klingRatio : videoRatio);
    const tOptIdx = overrideConfig?.videoOptionIdx ?? (isKling ? klingOptionIdx : videoOptionIdx);
    const tSyncAudio = overrideConfig?.isSyncAudio ?? isSyncAudio;
    const tRefs = overrideConfig?.referenceImages ?? referenceImages;
    const tRefVideo = overrideConfig?.referenceVideo ?? referenceVideo;
    const tRefAudio = overrideConfig?.referenceAudio ?? referenceAudio;
    const tKlingOrientation = overrideConfig?.klingOrientation ?? klingOrientation;
    const tKlingKeepSound = overrideConfig?.klingKeepSound ?? klingKeepSound;
    const tKlingDubVol = overrideConfig?.klingDubVol ?? klingDubVol;
    const tKlingSrcVol = overrideConfig?.klingSrcVol ?? klingSrcVol;

    for (let i = 0; i < count; i++) {
      placeholders.push({
        id: generateUUID(), url: '', type: 'video', prompt: tPrompt || '(无提示词)',
        modelId: tModelId, modelName: modelDef!.name,
        durationText: `${modelDef!.options[tOptIdx].s === 'AUTO' ? 'Auto' : modelDef!.options[tOptIdx].s + 's'}`,
        genTimeLabel: '生成中...',
        timestamp: startTime, status: 'loading',
        config: { modelId: tModelId, videoRatio: tRatio, videoOptionIdx: tOptIdx, prompt: tPrompt, referenceImages: [...tRefs], referenceVideo: tRefVideo ? {...tRefVideo} : null, referenceAudio: tRefAudio ? {...tRefAudio} : null, type: 'video', isKlingMode: isKling, isSyncAudio: tSyncAudio, klingOrientation: tKlingOrientation, klingKeepSound: tKlingKeepSound, klingDubVol: tKlingDubVol, klingSrcVol: tKlingSrcVol }
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
            
            // Kling Advanced Lip Sync
            if (isKling && tModelId === 'kling-advanced-lip-sync') {
                if (!tRefVideo) throw new Error("请上传包含人脸的视频 (Video Required)");
                if (!tRefAudio) throw new Error("请上传配音音频 (Audio Required)");
                
                // 1. Identify Face
                const identifyPayload: any = {};
                // According to docs, identify-face takes video_url (from proxy) or video_id.
                // We strongly prefer video_url from the proxy upload.
                if (tRefVideo.data.startsWith('http')) {
                    identifyPayload.video_url = tRefVideo.data;
                } else {
                    // Fallback to sending base64 in 'video' field if API supports it, though docs say video_url.
                    // Given our upload logic handles auto-upload, this branch should be rare/fallback.
                    identifyPayload.video = tRefVideo.data;
                }
                
                const identifyRes = await fetch(`${config.baseUrl}/kling/v1/videos/identify-face`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
                    body: JSON.stringify(identifyPayload)
                });
                
                const identifyData = await identifyRes.json();
                if (!identifyRes.ok || (identifyData.code && identifyData.code !== 0)) {
                     throw new Error(identifyData.message || identifyData.error?.message || "Kling人脸识别失败");
                }
                
                const sessionId = identifyData.data?.session_id;
                const faces = identifyData.data?.face_list || identifyData.data?.faces; 
                
                if (!sessionId || !faces || faces.length === 0) {
                     throw new Error("视频中未检测到可用人脸");
                }
                
                const faceId = faces[0].face_id || faces[0].id;
                
                // 2. Lip Sync
                const audioDurationMs = Math.floor((tRefAudio.duration || 10) * 1000);
                
                const syncPayload = {
                    session_id: sessionId,
                    face_choose: [{
                        face_id: faceId,
                        sound_file: tRefAudio.data, // Base64 or URL is fine here per docs
                        sound_start_time: 0,
                        sound_end_time: audioDurationMs,
                        sound_insert_time: 0,
                        sound_volume: tKlingDubVol,
                        original_audio_volume: tKlingSrcVol
                    }]
                };
                
                response = await fetch(`${config.baseUrl}/kling/v1/videos/advanced-lip-sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
                    body: JSON.stringify(syncPayload)
                });
                
                const data = await response.json();
                if (!response.ok || (data.code && data.code !== 0)) throw new Error(data.message || data.error?.message || "Kling对口型任务失败");
                
                const tid = data.data?.task_id;
                if (!tid) throw new Error("No Task ID returned");
                
                const updatedAsset: any = { ...placeholders.find(x => x.id === pId), status: 'queued', taskId: tid };
                setGeneratedAssets(prev => prev.map(a => a.id === pId ? updatedAsset : a));
                saveAssetToDB(updatedAsset);
                
                startKlingVideoPolling(tid, pId, startTime, 'advanced-lip-sync');
                return;
            }

            // Kling Motion Control
            if (isKling && tModelId === 'kling-motion-control') {
                if (tRefs.length === 0) throw new Error("请上传一张参考图片 (Image Required)");
                if (!tRefVideo) throw new Error("请上传参考视频 (Video Required)");

                const durationObj = modelDef!.options[tOptIdx];
                const mode = durationObj.q === '高品质模式' ? 'pro' : 'std';
                
                const payload: any = {
                    prompt: tPrompt || undefined,
                    keep_original_sound: tKlingKeepSound ? 'yes' : 'no',
                    character_orientation: tKlingOrientation,
                    mode: mode
                };

                // Handle Image URL/Base64
                if (tRefs[0].data.startsWith('http')) {
                    payload.image_url = tRefs[0].data;
                } else {
                    payload.image = tRefs[0].data;
                }

                // Handle Video URL/Base64
                if (tRefVideo.data.startsWith('http')) {
                    payload.video_url = tRefVideo.data;
                } else {
                    payload.video = tRefVideo.data;
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

            // Kling Avatar Video Handling
            if (isKling && tModelId === 'kling-avatar-image2video') {
                if (tRefs.length === 0) throw new Error("请上传一张人像参考图");
                if (!tRefAudio) throw new Error("请上传驱动音频 (MP3/WAV/M4A/AAC, 2-60s)");
                
                const durationObj = modelDef!.options[tOptIdx];
                const mode = durationObj.q === '高品质模式' ? 'pro' : 'std';
                
                const payload: any = {
                    sound_file: tRefAudio.data,
                    prompt: tPrompt || "", // Ensure it's a string even if empty
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

            // Generic Video Handling for other models
            if (isVeoModel || isGrokModel || isJimengModel || isKling) {
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
                    payload.duration = parseInt(modelDef!.options[tOptIdx].s);
                }
                
                if (isKling) {
                    payload.duration = parseInt(modelDef!.options[tOptIdx].s);
                    if (tSyncAudio) {
                        payload.sync_audio = true;
                    }
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
                formData.append('seconds', modelDef!.options[tOptIdx].s);
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
            
            startVideoPolling(tid, pId, startTime, tModelId);
        };
        
        placeholders.forEach(p => createOne(p.id));
    } catch (err: any) { 
        setError(err.message); 
        setGeneratedAssets(prev => prev.map(a => placeholders.some(p => p.id === a.id) ? { ...a, status: 'failed', genTimeLabel: '接口失败' } : a));
    }
  };

  const executeVideoRemix = async () => {
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
    if (isAudioMode || overrideConfig?.type === 'audio') {
        executeAudioGeneration(overrideConfig);
        return;
    }
    if ((isVideoMode || isKlingMode) && !overrideConfig) { executeVideoGeneration(); return; }
    if (overrideConfig?.type === 'video') { executeVideoGeneration(overrideConfig); return; }

    const tPrompt = overrideConfig?.prompt ?? prompt;
    if (!tPrompt) { setError("请输入提示词"); return; }
    let key = (config.apiKey || safeEnvKey).trim();
    if (!key) { setError("请先设置API Key"); return; }

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

  const handleBatchDownload = () => {
    selectedAssetIds.forEach(id => {
      const asset = generatedAssets.find(a => a.id === id);
      if (asset && asset.url) {
        const link = document.createElement('a');
        link.href = asset.url;
        link.download = `asset-${asset.id}.${asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'wav' : 'png'}`;
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
        if (asset.config.referenceVideo) setReferenceVideo(asset.config.referenceVideo);
        if (asset.config.referenceAudio) setReferenceAudio(asset.config.referenceAudio);
        if (asset.type === 'image') {
           setMainCategory('image');
           setSelectedModel(asset.config.modelId);
           setAspectRatio(asset.config.aspectRatio);
           setImageSize(asset.config.imageSize);
           executeGeneration(asset.config);
        } else if (asset.type === 'audio') {
           setMainCategory('audio');
           setSelectedAudioModel(asset.config.modelId);
           setSelectedVoice(asset.config.selectedVoice);
           if (asset.config.audioGenMode) setAudioGenMode(asset.config.audioGenMode);
           if (asset.config.speakerMap) setSpeakerMap(asset.config.speakerMap);
           executeAudioGeneration(asset.config);
        } else if (asset.config.isKlingMode) {
           setMainCategory('kling');
           setSelectedKlingModel(asset.config.modelId);
           setKlingRatio(asset.config.videoRatio);
           setKlingOptionIdx(asset.config.videoOptionIdx);
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
  const currentKlingModel = KLING_MODELS.find(m => m.id === selectedKlingModel);
  const labelClass = "font-normal text-[13px] text-black uppercase";
  const selectClass = "w-full p-1.5 border-2 border-black font-normal bg-white brutalist-shadow-sm focus:outline-none text-xs";
  
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
        
        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
          
          <section className="space-y-3">
            <SectionLabel text="1.创作类型 / Creation Type" />
            <div className="flex gap-2">
              <button 
                onClick={() => setMainCategory('image')} 
                className={`relative flex-1 h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'image' ? 'bg-brand-yellow brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-yellow/20'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'image' ? 'block' : 'hidden'}`}><Check className="w-3 h-3"/></div>
                <ImageIcon className={`w-6 h-6 mb-1 ${mainCategory === 'image' ? 'text-black scale-110' : 'text-slate-400 group-hover:text-black group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-xs font-black uppercase italic tracking-tighter ${mainCategory === 'image' ? 'text-black' : 'text-slate-500 group-hover:text-black'}`}>图片创作</span>
              </button>

              <button 
                onClick={() => setMainCategory('video')} 
                className={`relative flex-1 h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'video' ? 'bg-brand-red brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-red/10'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'video' ? 'block' : 'hidden'}`}><Check className="w-3 h-3"/></div>
                <Film className={`w-6 h-6 mb-1 ${mainCategory === 'video' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-brand-red group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-xs font-black uppercase italic tracking-tighter ${mainCategory === 'video' ? 'text-white' : 'text-slate-500 group-hover:text-brand-red'}`}>视频制作</span>
              </button>

              <button 
                onClick={() => setMainCategory('kling')} 
                className={`relative flex-1 h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'kling' ? 'bg-brand-green brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-green/10'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'kling' ? 'block' : 'hidden'}`}><Check className="w-3 h-3"/></div>
                <Rocket className={`w-6 h-6 mb-1 ${mainCategory === 'kling' ? 'text-black scale-110' : 'text-slate-400 group-hover:text-brand-green group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-xs font-black uppercase italic tracking-tighter ${mainCategory === 'kling' ? 'text-black' : 'text-slate-500 group-hover:text-brand-green'}`}>可灵专区</span>
              </button>

              <button 
                onClick={() => setMainCategory('audio')} 
                className={`relative flex-1 h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'audio' ? 'bg-brand-purple brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-purple/10'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'audio' ? 'block' : 'hidden'}`}><Check className="w-3 h-3"/></div>
                <AudioLines className={`w-6 h-6 mb-1 ${mainCategory === 'audio' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-brand-purple group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-xs font-black uppercase italic tracking-tighter ${mainCategory === 'audio' ? 'text-white' : 'text-slate-500 group-hover:text-brand-purple'}`}>语音合成</span>
              </button>

              <button 
                onClick={() => setMainCategory('proxy')} 
                className={`relative w-[60px] h-24 flex flex-col items-center justify-center border-2 border-black transition-all duration-300 group overflow-hidden ${mainCategory === 'proxy' ? 'bg-brand-blue brutalist-shadow -translate-y-1' : 'bg-white hover:bg-brand-blue/10'}`}
              >
                <div className={`absolute top-0 right-0 p-1 bg-black text-white text-[10px] font-bold uppercase ${mainCategory === 'proxy' ? 'block' : 'hidden'}`}><Check className="w-3 h-3"/></div>
                <Shield className={`w-6 h-6 mb-1 ${mainCategory === 'proxy' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-brand-blue group-hover:scale-110'} transition-transform duration-300`} strokeWidth={2.5} />
                <span className={`text-xs font-black uppercase italic tracking-tighter ${mainCategory === 'proxy' ? 'text-white' : 'text-slate-500 group-hover:text-brand-blue'}`}>代理</span>
              </button>
            </div>
            
            {/* Reference Images Section - Only show if NOT proxy mode AND NOT audio mode */}
            {!isProxyMode && !isAudioMode && (
              <div className={`p-3 bg-brand-cream border-2 border-black brutalist-shadow-sm ${referenceImages.length > 0 || referenceVideo ? 'solid-box-green' : 'solid-box-purple'}`}>
                  {isKlingMode && selectedKlingModel === 'kling-motion-control' ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className={labelClass}>
                                动作迁移素材 (MOTION TRANSFER)
                            </h3>
                            <div className="flex gap-2">
                                {referenceImages.length > 0 && <span className="text-brand-green text-[10px] font-bold flex items-center gap-1"><Check className="w-3 h-3"/> IMAGE READY</span>}
                                {referenceVideo && <span className="text-brand-green text-[10px] font-bold flex items-center gap-1"><Check className="w-3 h-3"/> VIDEO READY</span>}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className={`${labelClass} flex items-center gap-1`}>
                                <User className="w-3 h-3"/> 人物参考 (CHARACTER)
                            </label>
                            {referenceImages.length > 0 ? (
                                <div className="relative w-24 h-24 border-2 border-black bg-white brutalist-shadow-sm flex-shrink-0 cursor-pointer"
                                     onDoubleClick={() => setPreviewRefImage(referenceImages[0])}>
                                    <img src={referenceImages[0].data.startsWith('http') ? referenceImages[0].data : `data:${referenceImages[0].mimeType};base64,${referenceImages[0].data}`} className="w-full h-full object-cover" />
                                    {referenceImages[0].uploadStatus === 'uploading' && (
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-20">
                                            <Loader2 className="w-6 h-6 animate-spin mb-1"/>
                                            <span className="text-[10px] font-bold uppercase">...</span>
                                        </div>
                                    )}
                                    {referenceImages[0].uploadStatus === 'failed' && (
                                        <div className="absolute inset-0 bg-red-500/50 flex flex-col items-center justify-center text-white z-20">
                                            <span className="text-[10px] font-bold uppercase">FAILED</span>
                                        </div>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setReferenceImages([]); }} 
                                            className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            ) : (
                                <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-purple text-white border-2 border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-[13px] hover:translate-y-1 hover:shadow-none transition-all">
                                    <span>上传人物图片 / UPLOAD IMAGE</span>
                                    <input type="file" accept=".jpg, .jpeg, .png" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t-2 border-dashed border-black/10">
                            <label className={`${labelClass} flex items-center gap-1`}>
                                <Video className="w-3 h-3"/> 动作视频 (MOTION VIDEO)
                            </label>
                            {referenceVideo ? (
                                <div className="relative w-full border-2 border-black bg-white brutalist-shadow-sm p-2 group">
                                     <div className="flex items-center justify-between mb-2">
                                         <span className="text-[10px] font-bold truncate max-w-[200px] bg-slate-100 px-2 py-0.5 border border-black/20 rounded-sm">VIDEO REFERENCE</span>
                                         <button onClick={() => setReferenceVideo(null)} className="bg-brand-red text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform">
                                            <X className="w-3 h-3"/>
                                         </button>
                                     </div>
                                     <div className="relative bg-black border border-black h-32 flex items-center justify-center overflow-hidden">
                                        <video 
                                            src={referenceVideo.data.startsWith('http') ? referenceVideo.data : `data:${referenceVideo.mimeType};base64,${referenceVideo.data}`} 
                                            className="w-full h-full object-contain" 
                                            controls
                                        />
                                        {referenceVideo.uploadStatus === 'uploading' && (
                                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-20">
                                                <Loader2 className="w-8 h-8 animate-spin mb-2"/>
                                                <span className="text-xs font-bold uppercase">UPLOADING...</span>
                                            </div>
                                        )}
                                        {referenceVideo.uploadStatus === 'failed' && (
                                            <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-white z-20">
                                                <X className="w-8 h-8 mb-2"/>
                                                <span className="text-xs font-bold uppercase">UPLOAD FAILED</span>
                                            </div>
                                        )}
                                     </div>
                                </div>
                            ) : (
                                <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-blue text-white border-2 border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-[13px] hover:translate-y-1 hover:shadow-none transition-all">
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
                                        <div className="flex border-2 border-black bg-white brutalist-shadow-sm">
                                            <button 
                                                onClick={() => setKlingOrientation('video')}
                                                className={`flex-1 py-1.5 text-xs font-bold transition-colors ${klingOrientation === 'video' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
                                            >
                                                与视频一致
                                            </button>
                                            <div className="w-0.5 bg-black"></div>
                                            <button 
                                                onClick={() => setKlingOrientation('image')}
                                                className={`flex-1 py-1.5 text-xs font-bold transition-colors ${klingOrientation === 'image' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
                                            >
                                                与图片一致
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 space-y-1">
                                        <label className={labelClass}>音频设置 AUDIO</label>
                                        <label className={`flex items-center justify-center gap-2 cursor-pointer border-2 border-black py-1.5 px-2 brutalist-shadow-sm transition-all ${klingKeepSound ? 'bg-brand-yellow text-black' : 'bg-white hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={klingKeepSound} onChange={(e) => setKlingKeepSound(e.target.checked)} className="hidden" />
                                            <span className="text-xs font-bold uppercase flex items-center gap-1">
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
                                  {isKlingMode && selectedKlingModel === 'kling-advanced-lip-sync' 
                                    ? "视频素材 (Source)" 
                                    : `参考底稿 (可选) ${(!isVideoMode && !isKlingMode) ? '' : `(限${isKlingMode ? (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control' ? '1' : (selectedKlingModel === 'kling-video' && isSyncAudio ? '1' : '2')) : ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? '2' : '1')}张)`}`}
                              </h3>
                              {((referenceImages.length > 0) || (referenceVideo && isKlingMode && selectedKlingModel === 'kling-advanced-lip-sync')) && <span className="text-brand-green text-[10px] font-normal flex items-center gap-1"><Check className="w-3 h-3"/> READY</span>}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {/* Images OR Video for Lip Sync */}
                            {isKlingMode && selectedKlingModel === 'kling-advanced-lip-sync' ? (
                                <div className="pt-2">
                                    {referenceVideo ? (
                                        <div className="relative p-2 bg-white border-2 border-black brutalist-shadow-sm flex flex-col gap-2">
                                            <div className="flex items-center gap-2 w-full bg-brand-purple text-white px-2 py-1 border border-black">
                                                <Video className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Source Video</span>
                                                <button onClick={(e) => { e.stopPropagation(); setReferenceVideo(null); }} className="ml-auto bg-brand-red text-white p-0.5 border border-black hover:scale-110"><X className="w-3 h-3"/></button>
                                            </div>
                                            <video 
                                                src={referenceVideo.data.startsWith('http') ? referenceVideo.data : `data:${referenceVideo.mimeType};base64,${referenceVideo.data}`} 
                                                className="w-full h-auto max-h-[500px] object-contain bg-black border border-black" 
                                                controls
                                                playsInline
                                            />
                                            {referenceVideo.uploadStatus === 'uploading' && (
                                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-20">
                                                    <Loader2 className="w-6 h-6 animate-spin"/>
                                                    <span className="text-xs font-bold">UPLOADING...</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-purple text-white border-2 border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-[13px] hover:translate-y-1 hover:shadow-none transition-all">
                                            <span>上传视频 / UPLOAD VIDEO (包含清晰人脸)</span>
                                            <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleVideoUpload} />
                                        </label>
                                    )}
                                </div>
                            ) : (
                                /* Existing Image Loop */
                                referenceImages.length > 0 ? (
                                    <div className="flex gap-3 overflow-x-auto pb-1.5 pt-4 pr-4 pl-1">
                                        {referenceImages.map((img: ReferenceImage, idx: number) => (
                                            <div key={img.id} 
                                                className="relative w-24 h-24 border-2 border-black bg-white brutalist-shadow-sm flex-shrink-0 cursor-pointer"
                                                onDoubleClick={() => setPreviewRefImage(img)}>
                                            <img src={img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center uppercase py-0.5">
                                                {(isVideoMode && (selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok'))) || isKlingMode ? (selectedKlingModel === 'kling-motion-control' ? '参考图' : (idx === 0 ? '首帧' : '尾帧')) : 'REF'}
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); removeReferenceImage(img.id); }} 
                                                    className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                                                <X className="w-4 h-4"/>
                                            </button>
                                            </div>
                                        ))}
                                        {((!isVideoMode && !isKlingMode ? referenceImages.length < (currentImageModel?.maxImages || 4) : referenceImages.length < (isKlingMode ? (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control' ? 1 : (selectedKlingModel === 'kling-video' && isSyncAudio ? 1 : 2)) : ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1)))) && (
                                            <label className="w-24 h-24 border-2 border-black flex items-center justify-center cursor-pointer bg-white brutalist-shadow-sm">
                                            <Plus className="w-6 h-6" /><input type="file" multiple={!isVideoMode && !isKlingMode} accept=".jpg, .jpeg, .png" className="hidden" onChange={handleImageUpload} />
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-purple text-white border-2 border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-[13px] hover:translate-y-1 hover:shadow-none transition-all">
                                        <input type="file" multiple={!isVideoMode && !isKlingMode} accept=".jpg, .jpeg, .png" className="hidden" onChange={handleImageUpload} />
                                        {isKlingMode && selectedKlingModel === 'kling-motion-control' ? "添加人物图" : "上传图片/UPLOAD"}
                                    </label>
                                )
                            )}
                            
                            {/* Audio Upload for Avatar AND Lip Sync */}
                            {isKlingMode && (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-advanced-lip-sync') && (
                                <div className="mt-2 pt-2 border-t-2 border-black/10">
                                    <label className={labelClass}>驱动音频 (AUDIO) {referenceAudio && <span className="text-brand-green text-[10px]"><Check className="inline w-3 h-3"/></span>}</label>
                                    {referenceAudio ? (
                                        <div className="relative mt-2 p-2 bg-white border-2 border-black brutalist-shadow-sm flex flex-col gap-2">
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="w-8 h-8 bg-brand-yellow flex items-center justify-center border border-black shrink-0">
                                                    <Music className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold truncate flex-1">{referenceAudio.name}</span>
                                                <button onClick={removeReferenceAudio} className="bg-brand-red text-white p-1 border border-black hover:scale-110 transition-transform shrink-0">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <audio controls src={`data:${referenceAudio.mimeType};base64,${referenceAudio.data}`} className="w-full h-8" />
                                        </div>
                                    ) : (
                                        <label className="mt-2 w-full py-2.5 flex flex-col items-center justify-center bg-brand-blue text-white border-2 border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-[13px] hover:translate-y-1 hover:shadow-none transition-all">
                                            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                                            上传音频/UPLOAD AUDIO
                                        </label>
                                    )}

                                    {/* Volume Settings for Lip Sync - Moved Here */}
                                    {isKlingMode && selectedKlingModel === 'kling-advanced-lip-sync' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t-2 border-dashed border-black/20">
                                                <div className="space-y-1">
                                                    <label className={labelClass}>配音音量 (Dub)</label>
                                                    <div className="flex items-center gap-2.5 bg-white border-2 border-black p-1.5 brutalist-shadow-sm h-[34px]">
                                                        <input type="range" min="0" max="2" step="0.1" value={klingDubVol} onChange={(e) => setKlingDubVol(parseFloat(e.target.value))} className="flex-1 accent-black h-4" />
                                                        <span className="font-normal text-black text-xs">{klingDubVol}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className={labelClass}>原声保留 (Original)</label>
                                                    <div className="flex items-center gap-2.5 bg-white border-2 border-black p-1.5 brutalist-shadow-sm h-[34px]">
                                                        <input type="range" min="0" max="2" step="0.1" value={klingSrcVol} onChange={(e) => setKlingSrcVol(parseFloat(e.target.value))} className="flex-1 accent-black h-4" />
                                                        <span className="font-normal text-black text-xs">{klingSrcVol}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-black font-normal italic leading-relaxed mt-2">
                                                <span className="font-bold text-brand-red">注意：</span>
                                                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                                    <li>视频：需包含清晰人脸，720P或者1080P，时长≤60s。</li>
                                                    <li>音频：人声清晰，无背景杂音，时长≤60s，小于5MB。</li>
                                                </ul>
                                                <div className="mt-1">
                                                    <span className="font-bold text-brand-red">提示：</span>
                                                    <span>视频中只能出现一张人脸，否则可能识别失败。</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                          </div>
                      </>
                  )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionLabel 
                text={isProxyMode ? "2. 代理权益 / Proxy Benefits" : isKlingMode ? "2. 可灵专区 / Kling Zone" : isAudioMode ? "2. 语音配置 / Voice Settings" : "2. 生成配置 / Generation Settings"} 
                link={isKlingMode ? {
                    text: '文档案例',
                    href: (() => {
                        if (selectedKlingModel === 'kling-motion-control') return 'https://docs.qingque.cn/d/home/eZQAl5y8xNSkr0iYUS8-bpGvP?identityId=1uX4dFq8Jtr#section=h.cfsywvlr0mjt';
                        if (selectedKlingModel === 'kling-avatar-image2video') return 'https://docs.qingque.cn/d/home/eZQCNHbAH5WUzp1SCYw0uTUcQ?identityId=2MueRKz7Jhc&via=notHome#section=h.7ozleilbvjpu';
                        return 'https://docs.qingque.cn/d/home/eZQBMUXCmLjb57bpfsVk2jNvx?identityId=2EHxhIU9lxL';
                    })()
                } : undefined}
            />
            
            {isProxyMode ? (
              <div className="p-4 bg-white border-2 border-black brutalist-shadow-sm space-y-6 font-bold leading-relaxed select-text">
                <h3 className="text-2xl text-center text-[#E5312F] font-black tracking-tighter">代理本站核心优势</h3>
                
                <div className="space-y-2 text-[#003366] text-base">
                    <p>1、提供超低的成本使用价，自用省米，运营赚米;</p>
                    <p>2、部署搭建同<a href="https://www.vivaapi.cn" target="_blank" className="underline hover:text-blue-800">www.vivaapi.cn</a>一样的AI聚合API平台，可自定义修改;</p>
                    <p>3、部署搭建同<a href="http://p.vivaapi.cn" target="_blank" className="underline hover:text-blue-800">p.vivaapi.cn</a>一样的AI应用平台，可自定义修改;</p>
                    <p>4、无需服务器、无需后续管理、你只需提供一个域名;</p>
                    <p>5、教你0基础搭建部署上线任何AI应用;</p>
                    <p>6、最快一天部署上线，代理费达标后可全额返还;</p>
                    <p>7、2026弯道超车的机会，望君把握。</p>
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
                  <select 
                    value={!isVideoMode && !isKlingMode && !isAudioMode ? selectedModel : (isKlingMode ? selectedKlingModel : (isAudioMode ? selectedAudioModel : selectedVideoModel))} 
                    onChange={(e) => {
                        if (isAudioMode) setSelectedAudioModel(e.target.value);
                        else if (!isVideoMode && !isKlingMode) setSelectedModel(e.target.value);
                        else if (isKlingMode) setSelectedKlingModel(e.target.value);
                        else setSelectedVideoModel(e.target.value);
                    }} 
                    className={selectClass}
                  >
                    {(!isVideoMode && !isKlingMode && !isAudioMode ? MODELS : (isKlingMode ? KLING_MODELS : (isAudioMode ? AUDIO_MODELS : VIDEO_MODELS))).map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                </div>

                {isAudioMode && (
                    <div className="space-y-3 pt-2">
                        <div className="flex bg-white border-2 border-black brutalist-shadow-sm">
                            <button 
                                onClick={() => setAudioGenMode('single')}
                                className={`flex-1 py-1.5 text-xs font-bold uppercase transition-colors ${audioGenMode === 'single' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
                            >
                                单人 (Single)
                            </button>
                            <div className="w-0.5 bg-black"></div>
                            <button 
                                onClick={() => setAudioGenMode('multi')}
                                className={`flex-1 py-1.5 text-xs font-bold uppercase transition-colors ${audioGenMode === 'multi' ? 'bg-brand-yellow text-black' : 'hover:bg-slate-100'}`}
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
                                <div className="text-xs text-brand-red font-normal mt-1">您可以使用自然语言来控制风格、语气、口音和节奏。</div>
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
                                                className="w-1/3 p-1.5 border-2 border-black text-xs font-normal outline-none"
                                            />
                                            <select 
                                                value={speaker.voice}
                                                onChange={(e) => {
                                                    const newMap = [...speakerMap];
                                                    newMap[idx].voice = e.target.value;
                                                    setSpeakerMap(newMap);
                                                }}
                                                className="flex-1 p-1.5 border-2 border-black text-xs font-normal outline-none bg-white"
                                            >
                                                {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                            <button 
                                                onClick={() => {
                                                    if (speakerMap.length > 1) {
                                                        setSpeakerMap(speakerMap.filter((_, i) => i !== idx));
                                                    }
                                                }}
                                                className="bg-brand-red text-white p-1 border-2 border-black hover:translate-y-0.5 hover:shadow-none transition-all"
                                                disabled={speakerMap.length <= 1}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setSpeakerMap([...speakerMap, { id: generateUUID(), name: `角色${String.fromCharCode(65 + speakerMap.length)}`, voice: VOICES[speakerMap.length % VOICES.length].id }])}
                                        className="w-full py-2 border-2 border-dashed border-black bg-white hover:bg-slate-50 text-xs font-bold uppercase flex items-center justify-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> 添加角色 (Add Speaker)
                                    </button>
                                    <div className="text-xs text-brand-red font-normal mt-1">您可以使用自然语言来控制风格、语气、口音和节奏。</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isKlingMode && selectedKlingModel !== 'kling-avatar-image2video' && selectedKlingModel !== 'kling-motion-control' && selectedKlingModel !== 'kling-advanced-lip-sync' && (
                    <div className="space-y-1 mt-2">
                       <label className="flex items-center gap-2 cursor-pointer bg-white border-2 border-black p-2 brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                           <input type="checkbox" checked={isSyncAudio} onChange={(e) => setIsSyncAudio(e.target.checked)} className="w-4 h-4 accent-black" />
                           <span className="text-xs font-bold uppercase flex items-center gap-1"><Mic className="w-3 h-3"/> 音画同步 / AUDIO SYNC</span>
                       </label>
                    </div>
                )}

                {!isVideoMode && !isKlingMode && !isAudioMode && currentImageModel && (
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

                {(isVideoMode || isKlingMode) && (
                    <>
                        {isKlingMode && (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control' || selectedKlingModel === 'kling-advanced-lip-sync') ? (
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className={labelClass}>模式 MODE</label>
                                    <select 
                                        value={klingOptionIdx} 
                                        onChange={(e) => setKlingOptionIdx(parseInt(e.target.value))} 
                                        className={`${selectClass} h-[34px]`}
                                    >
                                        {(isKlingMode && (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control')) ? (
                                            <>
                                                <option value={0}>标准模式</option>
                                                <option value={1}>高品质模式</option>
                                            </>
                                        ) : selectedKlingModel === 'kling-advanced-lip-sync' ? (
                                            <option value={0}>标准模式</option>
                                        ) : (
                                            currentKlingModel?.options.map((opt, idx) => (
                                                <option key={idx} value={idx}>{opt.q === '高品质模式' ? 'PRO (高品质)' : 'STD (标准)'}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                  <label className={labelClass}>生成数量 BATCH</label>
                                  <div className={`flex items-center gap-2.5 bg-white border-2 border-black p-1.5 brutalist-shadow-sm h-[34px]`}>
                                    <input type="range" min="1" max="4" value={generationCount} onChange={(e) => setGenerationCount(parseInt(e.target.value))} className="flex-1 accent-black h-4" />
                                    <span className="font-normal text-black text-xs">{generationCount}</span>
                                  </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Hide Aspect Ratio for Kling Avatar or Motion Control */}
                                {!(isKlingMode && (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control' || selectedKlingModel === 'kling-advanced-lip-sync')) && (
                                    <div className="space-y-1">
                                        <label className={labelClass}>比例 ASPECT</label>
                                        <select value={isKlingMode ? klingRatio : videoRatio} onChange={(e) => isKlingMode ? setKlingRatio(e.target.value) : setVideoRatio(e.target.value)} className={selectClass}>
                                            {(isKlingMode ? currentKlingModel : currentVideoModel)?.supportedAspectRatios.map(r => <option key={r} value={r}>{ASPECT_RATIO_LABELS[r] || r}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                <div className={`space-y-1 ${isKlingMode && (selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-motion-control') ? '' : ''}`}>
                                <label className={labelClass}>
                                    {isKlingMode && selectedKlingModel === 'kling-avatar-image2video' ? '质量 QUALITY' : '时长/质量 DURATION'}
                                </label>
                                <select value={isKlingMode ? klingOptionIdx : videoOptionIdx} onChange={(e) => isKlingMode ? setKlingOptionIdx(parseInt(e.target.value)) : setVideoOptionIdx(parseInt(e.target.value))} className={selectClass}>
                                    {isKlingMode && selectedKlingModel === 'kling-avatar-image2video' ? (
                                        <>
                                            <option value={0}>标准模式</option>
                                            <option value={1}>高品质模式</option>
                                        </>
                                    ) : (
                                        (isKlingMode ? currentKlingModel : currentVideoModel)?.options.map((opt, idx) => (
                                            <option key={idx} value={idx} disabled={isKlingMode && isSyncAudio && opt.q === '标准模式'}>
                                                {opt.s === 'AUTO' ? '自动时长' : opt.s + 'S'} ({opt.q})
                                            </option>
                                        ))
                                    )}
                                </select>
                                </div>
                            </div>
                        )}
                    </>
                )}
                
                {/* Render Generation Count separately if NOT Motion Control or Avatar (since they are handled above) */}
                {!(isKlingMode && (selectedKlingModel === 'kling-motion-control' || selectedKlingModel === 'kling-avatar-image2video' || selectedKlingModel === 'kling-advanced-lip-sync')) && !isAudioMode && (
                    <div className="space-y-1">
                        <label className={labelClass}>生成数量 BATCH</label>
                        <div className="flex items-center gap-2.5 bg-white border-2 border-black p-1.5 brutalist-shadow-sm">
                            <input type="range" min="1" max={isKlingMode ? "4" : "10"} value={generationCount} onChange={(e) => setGenerationCount(parseInt(e.target.value))} className="flex-1 accent-black h-4" />
                            <span className="font-normal text-black text-xs">{generationCount}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className={labelClass}>{isAudioMode ? "文本内容 TEXT" : "提示词描述 PROMPT"}</label>
                  </div>
                  
                  {/* Updated Toolbar matching the provided image style */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button onClick={optimizePrompt} disabled={isOptimizing} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F7CE00] text-black border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap">
                      {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><Wand2 className="w-3.5 h-3.5"/> AI</>}
                    </button>
                    {!isAudioMode && (
                        <button onClick={() => { setTempSelectedStyles([]); setActiveModal('styles'); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#3B82F6] text-white border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap">
                        <Palette className="w-3.5 h-3.5"/> 风格镜头
                        </button>
                    )}
                    <button onClick={() => setActiveModal('library')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#A855F7] text-white border-2 border-black font-bold text-xs brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase whitespace-nowrap">
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

                  {isKlingMode && selectedKlingModel === 'kling-avatar-image2video' && (
                        <div className="mb-2 text-xs text-brand-red font-normal italic">
                            * 请输入角色动作、情绪、运镜等（非必填）
                        </div>
                  )}
                  {isKlingMode && selectedKlingModel === 'kling-motion-control' && (
                        <div className="mb-2 text-xs text-brand-red font-normal italic">
                            * 提示词用于增加元素。（非必填）
                        </div>
                  )}
                  {isKlingMode && selectedKlingModel === 'kling-advanced-lip-sync' && (
                        <div className="mb-2 text-xs text-brand-red font-normal italic">
                            * 提示词暂不生效（非必填）
                        </div>
                  )}

                  <div className="relative group">
                      <textarea 
                          value={prompt} 
                          onChange={(e) => setPrompt(e.target.value)} 
                          placeholder={isAudioMode ? (audioGenMode === 'single' ? "阴森低语地说：指尖阵阵刺痛……我想定是那邪祟，正悄然近矣。" : "角色A（语气倦怠又敷衍）：行吧…… 那今天都有啥安排啊？\n角色B（语气兴奋又雀跃）：你绝对猜不到！") : "描述您的创作奇想..."} 
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
        {/* ... (Existing JSX for gallery header and items remains the same) */}
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

        <div className="bg-brand-cream border-b-4 border-black py-3 flex items-center shrink-0 overflow-hidden">
           <div className="animate-marquee whitespace-nowrap min-w-full flex items-center gap-8">
             <span className="text-base font-bold text-brand-red flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                本应用不存储用户生成资产，请及时下载保存。
             </span>
             <span className="text-base font-bold text-brand-red flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Sora 2官方改动，如遇不能使用的时候请切换至其它模型
             </span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-10">
            {generatedAssets.map((asset) => (
              <div key={asset.id} 
                   data-asset-id={asset.id} 
                   data-asset-card="true" 
                   onClick={(e) => toggleAssetSelection(asset.id, e)}
                   className={`group bg-white border-2 border-black brutalist-shadow transition-all hover:-translate-y-1 cursor-pointer relative ${selectedAssetIds.has(asset.id) ? 'border-brand-blue ring-4 ring-brand-blue/30' : ''}`}>
                
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
                  ) : asset.type === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      {asset.status === 'completed' ? <video src={asset.url} className="w-full h-full object-cover" muted loop autoPlay /> : <Loader2 className="w-12 h-12 animate-spin text-brand-red" />}
                    </div>
                  ) : (
                    // Audio Card Content
                    <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#E0E7FF] p-6">
                        <div className="w-20 h-20 bg-brand-purple border-4 border-black rounded-full flex items-center justify-center brutalist-shadow mb-4">
                            <AudioLines className="w-10 h-10 text-white" />
                        </div>
                        <audio src={asset.url} controls className="w-full h-8 mt-2" />
                    </div>
                  )}
                  <div className={`absolute top-3 left-3 ${asset.status === 'failed' ? 'bg-black text-white' : asset.type === 'video' ? 'bg-brand-red text-white' : asset.type === 'audio' ? 'bg-brand-purple text-white' : 'bg-brand-yellow'} border-2 border-black px-2 py-0.5 font-normal text-[9px] uppercase z-10`}>{asset.type}</div>
                  {asset.status === 'completed' && asset.type !== 'audio' && (
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
                        <RefreshCw className="w-3 h-3" /> 重绘
                     </button>
                     {asset.type !== 'audio' && (
                        <button disabled={asset.status !== 'completed' || (asset.type === 'video' && !asset.modelId.includes('sora-2'))} onClick={(e) => { e.stopPropagation(); handleAssetEdit(asset); }} className="flex-1 py-1.5 bg-white border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-yellow hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                            <Edit className="w-3 h-3" /> 编辑
                        </button>
                     )}
                     {asset.type === 'audio' && (
                        <button onClick={(e) => handleAssetDownload(asset, e)} className="flex-1 py-1.5 bg-white border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-green hover:text-black hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
                            <Download className="w-3 h-3" /> 下载
                        </button>
                     )}
                     <button disabled={asset.status !== 'completed' || asset.type === 'video' || asset.type === 'audio'} onClick={(e) => { e.stopPropagation(); handleAssetGenVideo(asset); }} className="flex-1 py-1.5 bg-white border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-red hover:text-white hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
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
                        1、新增Gemini TTS语音合成板块。
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

      {/* ... (Other modals: settings, links, usage, price, edit-prompt, styles, library, save-prompt-confirm, video-remix, previewAsset, previewRefImage - all remain unchanged) */}
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
                    { m: 'VEO 3.1 FAST', p: '0.11元/条' },
                    { m: 'VEO 3.1 PRO', p: '2.45元/条' },
                    { m: 'Jimeng Video 3.0', p: '0.266元/条' },
                    { m: 'Sora-2-All', p: '0.08元/条' },
                    { m: 'Sora-2-Pro-All', p: '2.52元/条' },
                    { m: 'Grok Video 3', p: '0.14元/条' },
                  ]
                },
                {
                  category: '可灵专区',
                  items: [
                    { m: 'KLING CONTROL Std (动作转移)', p: '0.595元/秒' },
                    { m: 'KLING CONTROL Pro (动作转移)', p: '0.952元/秒' },
                    { m: 'KING AVATAR Std (数字人)', p: '0.476元/秒' },
                    { m: 'KING AVATAR Pro (数字人)', p: '0.952元/秒' },
                    { m: 'KING ADVANCED (对口型)', p: '暂未开放' },
                  ]
                },
                {
                  category: '语音合成',
                  items: [
                    { m: 'Gemini 2.5 Pro TTS', p: '便宜大胆用' },
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
          <div className="w-[900px] max-w-full bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col max-h-[85vh]">
            <ModalHeader title="风格与镜头 / STYLES & CAMERA" icon={Palette} onClose={() => setActiveModal(null)} />
            <div className="flex-1 p-4 md:p-5 overflow-y-auto no-scrollbar bg-[#f8fafc]">
              
              {renderStyleSection('艺术风格 (Art Styles)', STYLES.map(s => s.zh), false)}
              
              <div className="w-full border-t-2 border-dashed border-slate-300 my-4"></div>

              {renderStyleSection('镜头 (Camera)', CAMERA_MOVES)}
              {renderStyleSection('运镜速度 (Speed)', CAMERA_SPEEDS)}
              {renderStyleSection('景别 (Shot)', SHOT_TYPES)}
              {renderStyleSection('光影 (Lighting)', LIGHTING_STYLES, true)}
              {renderStyleSection('画面 (Composition)', COMPOSITION_STYLES, true)}
              {renderStyleSection('氛围 (Atmosphere)', ATMOSPHERE_STYLES, true)}
            </div>
            <div className="p-3 border-t-4 border-black bg-brand-cream flex justify-end items-center flex-shrink-0">
              <button onClick={applyStyles} className="px-6 py-2 bg-brand-red text-white border-2 border-black font-bold uppercase tracking-tighter italic text-xs brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all">
                完成 / DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ... (Library, Save Confirm, Video Remix, Preview Modals remain unchanged) */}
      {activeModal === 'library' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[1000px] h-[80vh] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative flex flex-col">
            <ModalHeader title="提示词库 / PROMPT LIBRARY" icon={Bookmark} onClose={() => setActiveModal(null)} />
            
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Sidebar */}
                <div className="w-64 bg-slate-50 border-r-4 border-black p-4 flex flex-col gap-2 overflow-y-auto">
                  {isAddingCategory ? (
                      <div className="flex gap-1 mb-2">
                        <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full border-2 border-black p-1 text-xs outline-none" placeholder="新分类名称..." onKeyDown={e => e.key === 'Enter' && handleSaveNewCategory()} />
                        <button onClick={handleSaveNewCategory} className="bg-brand-green border-2 border-black p-1 hover:bg-green-400 transition-colors"><Check className="w-4 h-4"/></button>
                      </div>
                  ) : (
                      <button onClick={handleStartAddCategory} className="w-full py-2 bg-white border-2 border-black flex items-center justify-center gap-1 font-bold text-xs hover:bg-brand-yellow transition-all brutalist-shadow-sm hover:shadow-none hover:translate-y-0.5 mb-2 uppercase">
                        <Plus className="w-3 h-3"/> 新建分类
                      </button>
                  )}

                  <div className="space-y-1">
                      <button onClick={() => setSelectedCategory('全部')} className={`w-full text-left px-3 py-2 font-bold text-sm border-2 transition-all flex justify-between items-center ${selectedCategory === '全部' ? 'bg-brand-yellow text-black border-black' : 'bg-transparent border-transparent hover:bg-white hover:border-black'}`}>
                        <span>全部 (ALL)</span>
                        {selectedCategory === '全部' && <Check className="w-3 h-3"/>}
                      </button>
                      {categories.map(cat => (
                        <div key={cat} onClick={() => setSelectedCategory(cat)} className={`group w-full text-left px-3 py-2 font-bold text-sm border-2 transition-all flex justify-between items-center cursor-pointer ${selectedCategory === cat ? 'bg-brand-yellow text-black border-black' : 'bg-transparent border-transparent hover:bg-white hover:border-black'}`}>
                            {renamingCat === cat ? (
                                <input autoFocus value={renameInput} onClick={e => e.stopPropagation()} onChange={e => setRenameInput(e.target.value)} onBlur={handleFinishRenameCat} onKeyDown={e => e.key === 'Enter' && handleFinishRenameCat()} className="w-full bg-white text-black text-xs p-1 outline-none" />
                            ) : (
                                <span className="truncate flex-1">{cat}</span>
                            )}
                            
                            {renamingCat !== cat && (
                                <div className={`flex gap-1 ${selectedCategory === cat ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                  <button onClick={(e) => { e.stopPropagation(); handleStartRenameCat(cat); }} className="hover:text-brand-blue p-0.5"><Edit className="w-3 h-3"/></button>
                                  <button onClick={(e) => handleDeleteCategory(cat, e)} className="hover:text-brand-red p-0.5"><Trash2 className="w-3 h-3"/></button>
                                </div>
                            )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white p-6 overflow-y-auto">
                    <div className="flex flex-col gap-3">
                        {libraryPrompts
                          .filter(p => selectedCategory === '全部' || p.category === selectedCategory)
                          .map((p) => {
                            const isEditing = editingLibraryId === p.id;
                            const globalIndex = libraryPrompts.indexOf(p); // Use absolute index for drag
                            return (
                              <div 
                                key={p.id}
                                draggable={!editingLibraryId && selectedCategory === '全部'}
                                onDragStart={() => handleDragStart(globalIndex)}
                                onDragOver={(e) => handleDragOver(e, globalIndex)}
                                onDragEnd={handleDragEnd}
                                className={`border-2 border-black p-4 transition-all ${isEditing ? 'bg-brand-cream ring-4 ring-black/10' : 'bg-white hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                              >
                                {isEditing ? (
                                    <div className="space-y-3" onClick={e => e.stopPropagation()}>
                                      <div className="flex gap-2">
                                          <input value={editingLibraryName} onChange={e => setEditingLibraryName(e.target.value)} className="flex-1 font-bold border-b-2 border-black bg-transparent outline-none pb-1 text-sm" placeholder="名称" />
                                          <select value={editingLibraryCategory} onChange={e => setEditingLibraryCategory(e.target.value)} className="border-2 border-black text-xs p-1 font-bold outline-none">
                                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                      </div>
                                      <textarea value={editingLibraryText} onChange={e => setEditingLibraryText(e.target.value)} className="w-full h-24 text-xs border-2 border-black p-2 resize-none outline-none focus:bg-white" placeholder="提示词..." />
                                      <div className="flex items-center gap-2 justify-end">
                                          <button onClick={handleCancelLibraryEdit} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold hover:bg-slate-100">取消</button>
                                          <button onClick={(e) => handleSaveLibraryEdit(p.id, e)} className="px-4 py-1 bg-brand-green border-2 border-black text-xs font-bold hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm transition-all">保存</button>
                                      </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                      {selectedCategory === '全部' && (
                                          <div className="cursor-grab active:cursor-grabbing flex flex-col justify-center text-slate-300 hover:text-black transition-colors">
                                            <GripVertical className="w-5 h-5"/>
                                          </div>
                                      )}
                                      <div className="flex-1 min-w-0 space-y-2">
                                          <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-base truncate pr-2">{p.name}</h4>
                                            <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 border border-black uppercase whitespace-nowrap">{p.category}</span>
                                          </div>
                                          <p className="text-sm text-slate-500 line-clamp-2 cursor-pointer hover:text-black transition-colors leading-relaxed" onClick={() => usePromptFromLibrary(p.text)} title={p.text}>{p.text}</p>
                                          
                                          <div className="flex items-center gap-4 pt-1">
                                            <button onClick={() => usePromptFromLibrary(p.text)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand-green uppercase transition-colors"><Check className="w-3 h-3"/> 使用</button>
                                            <button onClick={() => { navigator.clipboard.writeText(p.text); }} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand-blue uppercase transition-colors"><Copy className="w-3 h-3"/> 复制</button>
                                            <button onClick={(e) => handleStartLibraryEdit(p, e)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand-yellow uppercase transition-colors"><Edit className="w-3 h-3"/> 编辑</button>
                                            <button onClick={(e) => removePromptFromLibrary(p.id, e)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand-red uppercase transition-colors"><Trash2 className="w-3 h-3"/> 删除</button>
                                          </div>
                                      </div>
                                    </div>
                                )}
                              </div>
                            );
                        })}
                        
                        {libraryPrompts.filter(p => selectedCategory === '全部' || p.category === selectedCategory).length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-300 border-4 border-dashed border-slate-200">
                                <Bookmark className="w-12 h-12 mb-2 opacity-50"/>
                                <p className="font-bold text-lg uppercase italic">这里空空如也</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'save-prompt-confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-[400px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
              <ModalHeader title="保存提示词" icon={Save} onClose={() => setActiveModal(null)} />
              <div className="p-6 space-y-4">
                 <div className="space-y-1">
                    <label className="font-bold text-xs uppercase block">Name (名称)</label>
                    <input value={saveName} onChange={e => setSaveName(e.target.value)} className="w-full border-2 border-black p-2 outline-none focus:bg-brand-cream text-sm font-bold" placeholder="给提示词起个名字..." autoFocus />
                 </div>
                 <div className="space-y-1 relative">
                    <label className="font-bold text-xs uppercase block">Category (分类)</label>
                    <div className="relative">
                        <input 
                            value={saveCategory} 
                            onChange={e => { setSaveCategory(e.target.value); setShowSaveCategoryDropdown(true); }} 
                            onFocus={() => setShowSaveCategoryDropdown(true)}
                            className="w-full border-2 border-black p-2 outline-none focus:bg-brand-cream text-sm font-bold" 
                            placeholder="输入或选择分类..." 
                        />
                        {showSaveCategoryDropdown && (
                            <div className="absolute top-full left-0 right-0 border-2 border-black border-t-0 bg-white max-h-32 overflow-y-auto z-10 shadow-lg">
                                {categories.filter(c => c.toLowerCase().includes(saveCategory.toLowerCase())).map(c => (
                                    <div key={c} onClick={() => { setSaveCategory(c); setShowSaveCategoryDropdown(false); }} className="p-2 hover:bg-brand-yellow cursor-pointer text-xs font-bold border-b border-slate-100 last:border-0">
                                        {c}
                                    </div>
                                ))}
                                {saveCategory && !categories.includes(saveCategory) && (
                                    <div onClick={() => setShowSaveCategoryDropdown(false)} className="p-2 hover:bg-brand-green cursor-pointer text-xs font-bold text-brand-green">
                                        + 新建 "{saveCategory}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                 </div>
                 <button onClick={confirmSavePrompt} className="w-full py-3 bg-black text-white font-bold uppercase hover:bg-brand-yellow hover:text-black border-2 border-black transition-colors brutalist-shadow-sm hover:shadow-none hover:translate-y-0.5 text-sm mt-2">
                    确认保存 / CONFIRM
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeModal === 'video-remix' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-[500px] bg-white border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
              <ModalHeader title="视频重绘 / VIDEO REMIX" icon={Wand2} onClose={() => setActiveModal(null)} bgColor="bg-brand-blue" />
              <div className="p-6 space-y-4">
                 <p className="text-xs font-bold text-slate-500 italic uppercase">Modify the prompt to remix the video.</p>
                 <textarea 
                    value={remixPrompt} 
                    onChange={e => setRemixPrompt(e.target.value)} 
                    className="w-full h-56 border-2 border-black p-3 outline-none focus:bg-brand-cream resize-none font-normal text-base" 
                    placeholder="输入新的提示词..."
                    autoFocus
                 />
                 <button onClick={executeVideoRemix} className="w-full py-3 bg-brand-red text-white font-bold uppercase hover:translate-y-0.5 hover:shadow-none brutalist-shadow-sm border-2 border-black transition-all text-sm">
                    开始重绘 / REMIX
                 </button>
              </div>
           </div>
        </div>
      )}

      {previewAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setPreviewAsset(null)}>
            <div className="max-w-[95vw] max-h-[95vh] w-auto h-auto bg-white border-4 border-black brutalist-shadow flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                
                <div className="h-14 bg-brand-yellow border-b-4 border-black flex justify-between items-center px-4 shrink-0">
                    <span className="font-bold text-lg uppercase italic tracking-wider">PREVIEW ASSET</span>
                    <button onClick={() => setPreviewAsset(null)} className="w-8 h-8 bg-brand-red text-white border-2 border-black flex items-center justify-center hover:bg-black transition-colors brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 bg-slate-100 p-4 md:p-8 flex items-center justify-center min-h-[300px] overflow-hidden relative">
                     {previewAsset.type === 'video' ? (
                         <video src={previewAsset.url} controls autoPlay playsInline className="max-w-full max-h-[70vh] w-auto h-auto object-contain shadow-xl border-2 border-black bg-black" />
                     ) : (
                         <img src={previewAsset.url} className="max-w-full max-h-[70vh] w-auto h-auto object-contain shadow-xl border-2 border-black bg-white" />
                     )}
                </div>

                <div className="p-6 bg-white border-t-4 border-black flex flex-col md:flex-row gap-4 justify-between items-end md:items-center shrink-0">
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PROMPT:</p>
                            <p className="text-sm font-bold leading-relaxed line-clamp-3">"{previewAsset.prompt}"</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-black text-brand-red uppercase tracking-wider">{previewAsset.modelName}</span>
                             <span className="text-[10px] font-bold text-slate-300">|</span>
                             <span className="text-xs font-bold text-brand-red">{previewAsset.durationText || previewAsset.genTimeLabel}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 shrink-0">
                        <button onClick={() => setPreviewAsset(null)} className="px-6 py-3 bg-white border-2 border-black font-bold uppercase hover:bg-slate-100 transition-colors text-sm brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none">
                            关闭
                        </button>
                        <button onClick={(e) => handleAssetDownload(previewAsset, e)} className="px-6 py-3 bg-brand-red text-white border-2 border-black font-bold uppercase hover:bg-black transition-colors text-sm flex items-center gap-2 brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none">
                             DOWNLOAD
                        </button>
                    </div>
                </div>

            </div>
        </div>
      )}

      {previewRefImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setPreviewRefImage(null)}>
            <div className="max-w-[95vw] max-h-[95vh] w-auto h-auto bg-white border-4 border-black brutalist-shadow flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="h-14 bg-brand-yellow border-b-4 border-black flex justify-between items-center px-4 shrink-0">
                    <span className="font-bold text-lg uppercase italic tracking-wider">PREVIEW REFERENCE</span>
                    <button onClick={() => setPreviewRefImage(null)} className="w-8 h-8 bg-brand-red text-white border-2 border-black flex items-center justify-center hover:bg-black transition-colors brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 bg-slate-100 p-4 md:p-8 flex items-center justify-center min-h-[300px] overflow-hidden relative">
                     <img src={previewRefImage.data.startsWith('http') ? previewRefImage.data : `data:${previewRefImage.mimeType};base64,${previewRefImage.data}`} className="max-w-full max-h-[70vh] w-auto h-auto object-contain shadow-xl border-2 border-black bg-white" />
                </div>
                
                <div className="p-4 bg-white border-t-4 border-black flex justify-end">
                     <button onClick={() => setPreviewRefImage(null)} className="px-6 py-2 bg-white border-2 border-black font-bold uppercase hover:bg-slate-100 transition-colors text-sm brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none">
                        关闭 / CLOSE
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);