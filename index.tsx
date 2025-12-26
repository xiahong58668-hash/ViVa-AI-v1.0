import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Settings2, Sparkles, Video, 
  Loader2, Download,
  Bot, X, AlertCircle, Plus,
  RefreshCw, Edit, Maximize2, Headset, Check,
  Square, CheckSquare, Link as LinkIcon, Megaphone, ExternalLink, Lock,
  History, Copy, ClipboardCheck, Trash2,
  AlertTriangle
} from 'lucide-react';

// --- Types & Declarations ---

declare var process: {
  env: {
    API_KEY?: string;
    [key: string]: any;
  }
};

type ModalType = 'settings' | 'links' | 'usage' | 'price' | 'support' | 'announcement' | null;

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
    id: 'sora-2', 
    name: 'Sora 2', 
    desc: '标清视频', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '10', q: '标清'}, 
      {s: '15', q: '标清'}
    ] 
  },
  { 
    id: 'sora-2-pro', 
    name: 'Sora 2 Pro', 
    desc: '高清/长效', 
    supportedAspectRatios: ['9:16', '16:9'],
    options: [
      {s: '15', q: '高清'}, 
      {s: '25', q: '标清'}
    ] 
  },
  {
    id: 'grok-video-3',
    name: 'Grok Video 3',
    desc: '标清视频',
    supportedAspectRatios: ['2:3', '3:2', '1:1'],
    options: [
      {s: '6', q: '标清'}
    ]
  }
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
  <div className={`${bgColor} p-4 border-b-4 border-black flex justify-between items-center relative`}>
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
  const [mainCategory, setMainCategory] = useState<'image' | 'video'>('image');
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
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
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

  const galleryRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);

  // Safe process.env access
  const safeEnvKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (mainCategory === 'image') {
      const model = MODELS.find(m => m.id === selectedModel);
      if (model) {
        if (!model.supportedAspectRatios.includes(aspectRatio)) setAspectRatio(model.supportedAspectRatios[0]);
        if (!model.supportedResolutions.includes(imageSize)) setImageSize(model.supportedResolutions[0]);
      }
    } else {
      const model = VIDEO_MODELS.find(m => m.id === selectedVideoModel);
      if (model) {
          if (model.supportedAspectRatios && !model.supportedAspectRatios.includes(videoRatio)) {
              setVideoRatio(model.supportedAspectRatios[0]);
          }
      }

      const max = (selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1;
      if (referenceImages.length > max) {
        setReferenceImages(prev => prev.slice(0, max));
      }
    }
  }, [selectedModel, selectedVideoModel, mainCategory, aspectRatio, imageSize, videoRatio]);

  useEffect(() => {
    if (error && error.includes('张参考图')) {
      const currentModel = MODELS.find(m => m.id === selectedModel);
      const max = (mainCategory === 'image') ? (currentModel?.maxImages || 4) : ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1);
      if (referenceImages.length <= max) {
        setError(null);
      }
    }
  }, [referenceImages, selectedModel, selectedVideoModel, mainCategory, error]);

  useEffect(() => {
    getAllAssetsFromDB().then(assets => {
        const sorted = assets.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setGeneratedAssets(sorted);
        sorted.filter(a => a.type === 'video' && (a.status === 'queued' || a.status === 'processing'))
              .forEach(v => startVideoPolling(v.taskId!, v.id, v.timestamp, v.modelId));
    });
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

  const startVideoPolling = (taskId: string, assetId: string, startTime: number, modelId: string) => {
    const interval = setInterval(async () => {
        let key = configRef.current.apiKey || safeEnvKey;
        if (!key || !taskId) { clearInterval(interval); return; }
        try {
            const isVeoOrGrok = modelId.startsWith('veo') || modelId.startsWith('grok');
            const url = isVeoOrGrok ? `${configRef.current.baseUrl}/v1/video/query?id=${taskId}` : `${configRef.current.baseUrl}/v1/videos/${taskId}`;
            
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
    const currentModel = MODELS.find(m => m.id === selectedModel);
    const max = (mainCategory === 'image') ? (currentModel?.maxImages || 4) : ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1);
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

  const removeReferenceImage = (id: string) => setReferenceImages(prev => prev.filter(img => img.id !== id));

  const optimizePrompt = async () => {
     if (!prompt) return;
     let key = config.apiKey || safeEnvKey;
     
     setIsOptimizing(true);
     let sys = `你是一位专业的AI绘画提示词工程师。
请将用户的输入（可能是简短的中文或英文）改写成一段高质量、细节丰富的中文绘画提示词。
扩展核心元素：主体、风格、光影、构图和氛围。
不要包含任何宽高比参数（如 --ar, --aspect-ratio）。
只输出优化后的提示词文本，不要输出其他任何解释。`;

     if (mainCategory === 'video') {
       sys = `你是一位专业的AI视频提示词专家。请根据用户的输入，生成一段完整、连贯、高质量的中文视频生成提示词。
该提示词应包含主体描述、场景细节、光影氛围、镜头语言（如运镜方式）和视频风格。
要求：
1. 直接输出最终的提示词段落。
2. 不要包含任何分析、解释、标题或分点（如"核心主题"、"画面细节"等）。
3. 确保提示词适合Sora 2或Veo等模型理解。
4. 仅输出提示词本身。`;
     }
     try {
        const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model: OPTIMIZER_MODEL, messages: [{ role: "system", content: sys }, { role: "user", content: prompt }] })
        });
        const data = await res.json();
        const optimized = data.choices?.[0]?.message?.content?.trim();
        if (optimized) { setPrompt(optimized); setError(null); }
     } catch (e) { setError("AI优化失败"); } finally { setIsOptimizing(false); }
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

    for (let i = 0; i < count; i++) {
      placeholders.push({
        id: generateUUID(), url: '', type: 'video', prompt: tPrompt,
        modelId: tModelId, modelName: VIDEO_MODELS.find(m => m.id === tModelId)!.name,
        durationText: `${VIDEO_MODELS.find(m => m.id === tModelId)!.options[tOptIdx].s}s`,
        genTimeLabel: '生成中...',
        timestamp: startTime, status: 'loading',
        config: { modelId: tModelId, videoRatio: tRatio, videoOptionIdx: tOptIdx, prompt: tPrompt, referenceImages: [...tRefs], type: 'video' }
      });
    }
    setGeneratedAssets(prev => [...placeholders, ...prev]);

    setError(null);
    try {
        const createOne = async (pId: string) => {
            let response;
            const isVeoModel = tModelId.startsWith('veo');
            const isGrokModel = tModelId.startsWith('grok');
            
            if (isVeoModel || isGrokModel) {
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
            if (!response.ok) throw new Error(data.error?.message || "视频生成接口错误");
            
            const tid = data.id || data.data?.id || data.task_id || data.taskId;
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

  const executeGeneration = async (overrideConfig?: any) => {
    if (mainCategory === 'video' && !overrideConfig) { executeVideoGeneration(); return; }
    if (overrideConfig?.type === 'video') { executeVideoGeneration(overrideConfig); return; }

    const tPrompt = overrideConfig?.prompt ?? prompt;
    if (!tPrompt) { setError("请输入提示词"); return; }
    let key = config.apiKey || safeEnvKey;
    // Removed explicit key check to prevent alerts

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

  const handleAssetRefresh = (asset: GeneratedAsset) => {
     if (asset.config) {
        setPrompt(asset.config.prompt);
        setReferenceImages(asset.config.referenceImages || []);
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
  
  const isKeyUnset = !config.apiKey && !safeEnvKey;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F1F5F9] md:h-screen overflow-hidden" 
         onMouseMove={handleContainerMouseMove} 
         onMouseUp={handleContainerMouseUp}>
      
      <div className="w-full md:w-[420px] bg-white border-r-4 border-black flex flex-col z-20 brutalist-shadow">
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
            <div className="flex gap-3">
              <button onClick={() => setMainCategory('image')} className={`flex-1 py-2.5 border-2 border-black font-normal uppercase transition-all text-sm ${mainCategory === 'image' ? 'bg-brand-yellow brutalist-shadow-sm translate-y-[-2px]' : 'bg-white'}`}>图片创作</button>
              <button onClick={() => setMainCategory('video')} className={`flex-1 py-2.5 border-2 border-black font-normal uppercase transition-all text-sm ${mainCategory === 'video' ? 'bg-brand-red text-white brutalist-shadow-sm translate-y-[-2px]' : 'bg-white'}`}>视频制作</button>
            </div>
            
            <div className={`p-3 bg-brand-cream border-2 border-black brutalist-shadow-sm ${referenceImages.length > 0 ? 'solid-box-green' : 'solid-box-purple'}`}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className={labelClass}>参考底稿 (可选) {(mainCategory === 'video') && `(限${(selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? '2' : '1'}张)`}</h3>
                    {referenceImages.length > 0 && <span className="text-brand-green text-[10px] font-normal flex items-center gap-1"><Check className="w-3 h-3"/> READY</span>}
                </div>
                {referenceImages.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-1.5 pt-1">
                        {referenceImages.map((img: ReferenceImage, idx: number) => (
                          <div key={img.id} 
                               className="relative w-24 h-24 border-2 border-black bg-white brutalist-shadow-sm flex-shrink-0 cursor-pointer"
                               onDoubleClick={() => setPreviewRefImage(img)}>
                            <img src={img.data.startsWith('http') ? img.data : `data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center uppercase py-0.5">
                               {mainCategory === 'video' && (selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? (idx === 0 ? '首帧' : '尾帧') : 'REF'}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeReferenceImage(img.id); }} 
                                    className="absolute -top-2.5 -right-2.5 bg-brand-red text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform brutalist-shadow-sm z-10">
                              <X className="w-4 h-4"/>
                            </button>
                          </div>
                        ))}
                        {(mainCategory === 'image' ? referenceImages.length < (currentImageModel?.maxImages || 4) : referenceImages.length < ((selectedVideoModel.startsWith('veo') || selectedVideoModel.startsWith('grok')) ? 2 : 1)) && (
                          <label className="w-24 h-24 border-2 border-black flex items-center justify-center cursor-pointer bg-white brutalist-shadow-sm">
                            <Plus className="w-6 h-6" /><input type="file" multiple={mainCategory === 'image'} className="hidden" onChange={handleImageUpload} />
                          </label>
                        )}
                    </div>
                ) : (
                    <label className="w-full py-2.5 flex flex-col items-center justify-center bg-brand-purple text-white border-2 border-black brutalist-shadow-sm cursor-pointer font-normal uppercase text-[13px] hover:translate-y-1 hover:shadow-none transition-all">
                        <input type="file" multiple={mainCategory === 'image'} className="hidden" onChange={handleImageUpload} />
                        上传图片/UPLOAD
                    </label>
                )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel text="2. 生成配置 / Generation Settings" />
            <div className="p-3 bg-brand-cream border-2 border-black brutalist-shadow-sm space-y-4">
              <div className="space-y-1">
                <label className={labelClass}>选择生成模型 GENRE</label>
                <select value={mainCategory === 'image' ? selectedModel : selectedVideoModel} onChange={(e) => mainCategory === 'image' ? setSelectedModel(e.target.value) : setSelectedVideoModel(e.target.value)} className={selectClass}>
                  {(mainCategory === 'image' ? MODELS : VIDEO_MODELS).map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                </select>
              </div>

              {mainCategory === 'image' && currentImageModel && (
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

              {mainCategory === 'video' && currentVideoModel && (
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
                <div className="flex justify-between items-end mb-0.5">
                  <label className={labelClass}>提示词描述 PROMPT</label>
                  <button onClick={optimizePrompt} disabled={isOptimizing} className="px-1.5 py-0.5 bg-brand-yellow border-2 border-black font-normal text-[11px] brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all uppercase">
                    {isOptimizing ? <Loader2 className="w-3 animate-spin"/> : 'AI优化'}
                  </button>
                </div>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="描述您的创作奇想..." className="w-full h-20 p-2 border-2 border-black font-normal text-xs bg-white focus:outline-none brutalist-input no-scrollbar resize-none" />
              </div>
            </div>
          </section>

          <div className="space-y-3">
            <button onClick={() => executeGeneration()} className="w-full py-4 bg-brand-red text-white text-2xl font-normal border-4 border-black brutalist-shadow hover:translate-y-1.5 hover:shadow-none transition-all uppercase tracking-tighter">
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
            <CircularButton onClick={() => setActiveModal('support')} className="bg-brand-blue"><Headset className="w-6 h-6 text-white"/></CircularButton>
            <CircularButton onClick={() => setActiveModal('price')} className="bg-brand-green"><span className="text-2xl font-normal text-white">¥</span></CircularButton>
            <CircularButton onClick={() => setActiveModal('usage')} className="bg-white"><Megaphone className="w-6 h-6"/></CircularButton>
            <CircularButton onClick={() => setActiveModal('links')} className="bg-white"><LinkIcon className="w-6 h-6"/></CircularButton>
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
                  {asset.status === 'loading' ? (
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
                        <a href={asset.url} download={`viva-${asset.id}`} onClick={e => e.stopPropagation()} className="p-3 bg-white border-2 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none"><Download className="w-6 h-6"/></a>
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
                     <button disabled={asset.status !== 'completed' || asset.type === 'video'} onClick={(e) => { e.stopPropagation(); handleAssetEdit(asset); }} className="flex-1 py-1.5 bg-white border-2 border-black brutalist-shadow-sm flex items-center justify-center gap-1 hover:bg-brand-yellow hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-sm">
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
              <div className="space-y-4">
                 <div className="bg-[#eff6ff] border-2 border-black p-4 brutalist-shadow-sm transition-transform hover:-translate-y-1">
                    <h3 className="font-bold text-lg mb-2 italic uppercase flex items-center gap-2">
                        <span className="bg-brand-blue text-white px-2 py-0.5 text-xs border border-black">OPTIMIZER</span>
                        AI 优化升级
                    </h3>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                        1、AI优化调用速度更快，性能更强，价格更低的 <span className="text-black bg-brand-yellow px-1 border border-black">gemini-3-flash-preview</span>
                    </p>
                 </div>
                 
                 <div className="bg-[#fdf2f8] border-2 border-black p-4 brutalist-shadow-sm transition-transform hover:-translate-y-1">
                    <h3 className="font-bold text-lg mb-2 italic uppercase flex items-center gap-2">
                        <span className="bg-brand-red text-white px-2 py-0.5 text-xs border border-black">NEW MODEL</span>
                        视频模型上新
                    </h3>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                        2、新增视频生成模型 <span className="text-black bg-brand-yellow px-1 border border-black">grok-video-3</span>，优点：生成速度快。
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
                    API地址 (默认/已锁定) <ExternalLink className="w-3 h-3" />
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
          <div className="w-[550px] bg-brand-cream border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="FRIENDLY LINKS (友情链接)" icon={LinkIcon} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
              <a href="https://www.vivaapi.cn" target="_blank" className="block bg-white border-2 border-black p-5 brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">💻</span>
                  <span className="font-bold text-xl italic uppercase">API主站（用于创建令牌，查看消耗情况等）</span>
                </div>
                <div className="text-blue-500 font-bold ml-10 text-xl underline italic">www.vivaapi.cn</div>
              </a>
              
              <a href="https://m.vivaapi.cn" target="_blank" className="block bg-[#fff1f2] border-2 border-black p-5 brutalist-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl text-brand-red">🖼️</span>
                  <span className="font-bold text-xl italic uppercase">AI分镜大师</span>
                </div>
                <div className="text-brand-red font-bold ml-10 text-xl underline italic">https://m.vivaapi.cn</div>
              </a>

              <div className="border-2 border-black border-dashed p-4 text-center text-lg font-bold text-slate-500 uppercase italic">
                “ 此分站可使用相同的API令牌使用 ”
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'usage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[500px] bg-brand-cream border-4 border-black brutalist-shadow animate-in zoom-in-95 relative">
            <ModalHeader title="Usage Flow (使用流程)" icon={Megaphone} onClose={() => setActiveModal(null)} />
            <div className="p-8 space-y-6">
              {[
                { n: '1', t: '注册与令牌', d: <>前往主站 <a href="https://www.vivaapi.cn" target="_blank" className="text-blue-600 font-bold underline italic">www.vivaapi.cn</a> 注册并创建您的专属令牌。</> },
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
                    { m: 'gpt-image-1', p: '0.06元/张' },
                    { m: 'gpt-image-1.5', p: '0.06元/张' },
                    { m: 'Grok 4 Image', p: '0.06元/张' },
                    { m: 'Jimeng 4.5', p: '0.13元/张' },
                  ]
                },
                {
                  category: '视频模型',
                  items: [
                    { m: 'VEO 3.1 FAST', p: '0.11元/次' },
                    { m: 'VEO 3.1 PRO', p: '2.45元/次' },
                    { m: 'Sora 2', p: '0.08元/条' },
                    { m: 'Sora 2 Pro', p: '2.52元/条' },
                    { m: 'Grok Video 3', p: '0.14元/条' },
                  ]
                }
              ].map((cat, cidx) => (
                <div key={cidx} className="border-b-4 border-black last:border-b-0">
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

      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-12 brutalist-shadow animate-in zoom-in-95 relative group">
            <button onClick={() => setActiveModal(null)} 
                    className="absolute -top-4 -right-4 bg-brand-red text-white p-2 border-4 border-black brutalist-shadow-sm hover:translate-y-1 hover:shadow-none transition-all z-[80]">
              <X className="text-white w-7 h-7"/>
            </button>
            <div className="flex flex-col items-center gap-8">
              <div className="w-72 h-72 border-4 border-black brutalist-shadow-sm flex items-center justify-center bg-white p-3 relative overflow-visible">
                 <img src="https://lsky.zhongzhuan.chat/i/2025/12/21/69477f7dc66ea.png" alt="Support QR" className="w-full h-full grayscale" />
              </div>
              <p className="font-bold text-xl tracking-tight uppercase italic">加微信领试用额度，招代理</p>
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