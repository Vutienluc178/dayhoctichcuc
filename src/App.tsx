/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutGrid, 
  Wand2, 
  Library, 
  BookOpen, 
  Plus, 
  Minus,
  Flag,
  Trophy,
  Clock,
  Zap,
  Trash2, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Image as ImageIcon,
  ChevronRight,
  Info,
  Presentation,
  ChevronLeft,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Eraser,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import confetti from 'canvas-confetti';
import { TARSIA_TRIANGLE_16, TARSIA_RHOMBUS_18, TARSIA_HEXAGON_24 } from './TarsiaTemplates';

// Types
type GameType = 'domino' | 'matching' | 'triangle' | 'tablecloth';
type DominoTheme = 'classic' | 'neon' | 'nature' | 'luxury';
type TarsiaShape = 'line' | 'triangle16' | 'hexagon24' | 'rhombus18';

interface GameData {
  q: string;
  a: string;
}

type View = 'creator' | 'prompt' | 'library' | 'guide' | 'presentation';

interface SavedGame {
  id: string;
  name: string;
  path: string; // e.g., "Toán/Lớp 6/Số học"
  gameType: GameType;
  tarsiaShape?: TarsiaShape;
  dominoTheme?: DominoTheme;
  data: GameData[];
  bgImage?: string | null;
  triangleFontSize?: number;
  isPuzzleMode?: boolean;
  timestamp: number;
}

const PuzzleAssembler = ({ image, duration = 10 }: { image: string, duration?: number }) => {
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const rows = 16;
  const cols = 24;
  const total = rows * cols;

  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      if (img.width && img.height) {
        setAspectRatio(img.width / img.height);
      }
    };
  }, [image]);

  const [order] = useState(() => {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div 
        className="grid shadow-2xl border-4 border-white/10 overflow-hidden"
        style={{ 
          aspectRatio: `${aspectRatio}`,
          width: aspectRatio > 1.5 ? '100%' : 'auto',
          height: aspectRatio <= 1.5 ? '100%' : 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const delayIndex = order.indexOf(i);
          // Stagger the start times so the last piece finishes its 1.5s animation at exactly 'duration'
          const delay = (delayIndex / total) * (duration - 1.5); 

          // Random starting positions for a "flying in" effect
          const startX = (Math.random() - 0.5) * 1000;
          const startY = (Math.random() - 0.5) * 1000;

          return (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                scale: 0, 
                x: startX, 
                y: startY,
                rotate: Math.random() * 90 - 45 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                x: 0, 
                y: 0,
                rotate: 0 
              }}
              transition={{ 
                duration: 1.5, 
                delay,
                ease: [0.23, 1, 0.32, 1] // Custom cubic-bezier for smooth landing
              }}
              className="relative overflow-hidden"
            >
              <img 
                src={image} 
                className="absolute max-w-none" 
                style={{
                  width: `${cols * 100.1}%`, // Slight overlap to prevent gaps
                  height: `${rows * 100.1}%`,
                  left: `${-c * 100}%`,
                  top: `${-r * 100}%`,
                  objectFit: 'cover'
                }}
                referrerPolicy="no-referrer"
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState<View>('creator');
  const [gameType, setGameType] = useState<GameType>('domino');
  const [tarsiaShape, setTarsiaShape] = useState<TarsiaShape>('line');
  const [dominoTheme, setDominoTheme] = useState<DominoTheme>('classic');
  const [data, setData] = useState<GameData[]>([{ q: '', a: '' }]);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'student' | 'answer' | 'worksheet'>('answer');
  const [triangleFontSize, setTriangleFontSize] = useState<number>(16);
  const [isPuzzleMode, setIsPuzzleMode] = useState<boolean>(false);
  const [showSymbols, setShowSymbols] = useState<boolean>(true);
  const [currentPresIdx, setCurrentPresIdx] = useState(0);
  const [showPresAnswer, setShowPresAnswer] = useState(false);
  const [isBlackboardFullscreen, setIsBlackboardFullscreen] = useState(false);
  const [showPresWebsite, setShowPresWebsite] = useState(false);
  const [isPresWebsiteFullscreen, setIsPresWebsiteFullscreen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sheetId, setSheetId] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>(() => {
    const saved = localStorage.getItem('edugame_saved_games');
    return saved ? JSON.parse(saved) : [];
  });
  const [savePath, setSavePath] = useState('');
  const [saveName, setSaveName] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  
  // Lucky Draw State
  const [randomNum, setRandomNum] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showRandomNum, setShowRandomNum] = useState(false);
  const [luckyMessage, setLuckyMessage] = useState('');
  
  // Resizable states for presentation mode
  const [blackboardHeight, setBlackboardHeight] = useState(40); // percentage
  const [websiteWidth, setWebsiteWidth] = useState(50); // percentage
  const [isResizingBlackboard, setIsResizingBlackboard] = useState(false);
  const [isResizingWebsite, setIsResizingWebsite] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingBlackboard) {
        const height = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
        setBlackboardHeight(Math.min(Math.max(height, 5), 95));
      }
      if (isResizingWebsite) {
        const width = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        setWebsiteWidth(Math.min(Math.max(width, 5), 95));
      }
    };

    const handleMouseUp = () => {
      setIsResizingBlackboard(false);
      setIsResizingWebsite(false);
    };

    if (isResizingBlackboard || isResizingWebsite) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingBlackboard, isResizingWebsite]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // AI Prompt State
  const [promptInfo, setPromptInfo] = useState({
    role: 'Chuyên gia giáo dục',
    grade: '',
    subject: '',
    topic: '',
    level: 'Cơ bản',
    count: '10',
    extra: ''
  });

  const [copied, setCopied] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('edugame_saved_games', JSON.stringify(savedGames));
  }, [savedGames]);

  const handleGoogleSheetFetch = async () => {
    if (!sheetId) return;
    setIsFetchingSheet(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch sheet');
      const arrayBuffer = await response.arrayBuffer();
      
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const excelData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const formattedData: GameData[] = excelData
        .filter(row => row[0] || row[1])
        .map(row => ({
          q: String(row[0] || ''),
          a: String(row[1] || '')
        }));
      
      if (formattedData.length > 0) {
        setData(formattedData);
        alert('Đã nhập dữ liệu từ Google Sheets thành công!');
      }
    } catch (error) {
      console.error('Error fetching Google Sheet:', error);
      alert('Không thể tải dữ liệu từ Google Sheets. Hãy đảm bảo Sheet đã được "Chia sẻ với bất kỳ ai có liên kết" hoặc "Xuất bản lên web".');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleSaveToLocal = () => {
    if (!saveName) {
      alert('Vui lòng nhập tên bài học!');
      return;
    }
    const newGame: SavedGame = {
      id: Date.now().toString(),
      name: saveName,
      path: savePath || 'Chưa phân loại',
      gameType,
      tarsiaShape,
      dominoTheme,
      data,
      bgImage,
      triangleFontSize,
      isPuzzleMode,
      timestamp: Date.now()
    };
    setSavedGames([...savedGames, newGame]);
    setIsSaveModalOpen(false);
    setSaveName('');
    alert('Đã lưu bài học vào thư viện local!');
  };

  const loadSavedGame = (game: SavedGame) => {
    setGameType(game.gameType);
    if (game.tarsiaShape) setTarsiaShape(game.tarsiaShape);
    if (game.dominoTheme) setDominoTheme(game.dominoTheme);
    setData(game.data);
    if (game.bgImage !== undefined) setBgImage(game.bgImage);
    if (game.triangleFontSize) setTriangleFontSize(game.triangleFontSize);
    if (game.isPuzzleMode !== undefined) setIsPuzzleMode(game.isPuzzleMode);
    setActiveView('creator');
    alert(`Đã tải bài học: ${game.name}`);
  };

  const deleteSavedGame = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bài học này?')) {
      setSavedGames(savedGames.filter(g => g.id !== id));
    }
  };

  const renderTreeView = () => {
    const tree: any = {};
    savedGames.forEach(game => {
      const parts = game.path.split('/').filter(p => p);
      let current = tree;
      parts.forEach(part => {
        if (!current[part]) current[part] = { _files: [], _folders: {} };
        current = current[part]._folders;
      });
      // Find the folder again to add the file
      let folder = tree;
      parts.forEach(part => {
        folder = folder[part];
      });
      if (!folder) {
        if (!tree['_root']) tree['_root'] = { _files: [], _folders: {} };
        tree['_root']._files.push(game);
      } else {
        folder._files.push(game);
      }
    });

    const renderNode = (nodeName: string, node: any, depth: number = 0) => {
      return (
        <div key={nodeName} className="ml-4">
          <div className="flex items-center gap-2 py-1 text-slate-600 font-medium">
            <ChevronRight size={16} className="text-slate-400" />
            <BookOpen size={16} className="text-indigo-500" />
            <span>{nodeName}</span>
          </div>
          <div className="ml-4 border-l border-slate-200 pl-4">
            {Object.entries(node._folders).map(([name, subNode]) => renderNode(name, subNode, depth + 1))}
            {node._files.map((game: SavedGame) => (
              <div key={game.id} className="group flex items-center justify-between py-2 px-3 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" onClick={() => loadSavedGame(game)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                    {game.gameType === 'domino' ? <LayoutGrid size={16} /> : <Library size={16} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{game.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{game.gameType} • {new Date(game.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSavedGame(game.id); }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    };

    if (savedGames.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Library size={48} strokeWidth={1} className="mb-4 opacity-20" />
          <p>Thư viện của bạn đang trống</p>
          <p className="text-xs">Hãy lưu các bài học để quản lý tại đây</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(tree).map(([name, node]) => renderNode(name, node))}
      </div>
    );
  };

  const startLuckyDraw = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowRandomNum(true);
    
    const messages = [
      "Cố lên nào, cả lớp đang chờ bạn tỏa sáng!",
      "Đừng lo, câu này dễ như ăn kẹo thôi!",
      "Bạn là \"siêu sao\" tiếp theo của lớp mình đấy!",
      "Tự tin lên, kiến thức đang nằm trong tay bạn!",
      "Một câu trả lời hay đang chờ bạn bật mí!",
      "Hãy cho cả lớp thấy \"nội công\" thâm hậu của bạn!",
      "Bình tĩnh, tự tin, chiến thắng đang ở rất gần!",
      "Bạn chính là mảnh ghép hoàn hảo cho câu hỏi này!",
      "Đừng để câu hỏi này làm khó \"bậc thầy\" như bạn!",
      "Hãy tỏa sáng theo cách của riêng bạn nhé!",
      "Cả thế giới (lớp mình) đang nín thở chờ bạn!",
      "Bạn làm được mà, tin mình đi!",
      "Câu này sinh ra là để dành cho bạn đấy!",
      "Hãy biến câu hỏi này thành một màn trình diễn đỉnh cao!",
      "Bạn là niềm hy vọng của cả tổ đấy, cố lên!",
      "Đừng ngại sai, vì sai là mẹ của thành công!",
      "Hãy cho mọi người thấy sự thông thái của bạn nào!",
      "Bạn có 100% khả năng trả lời đúng câu này!",
      "Hãy mỉm cười và trả lời thật dõng dạc nhé!",
      "Bạn là \"idol\" môn học này của lớp!",
      "Thử thách này chỉ là chuyện nhỏ với bạn thôi!",
      "Hãy để trí tuệ của bạn bay cao và bay xa!",
      "Bạn chính là \"nhà thông thái\" mà lớp đang tìm kiếm!",
      "Đừng để câu hỏi này \"bắt nạt\" bạn nhé!",
      "Hãy trả lời như một vị thần nào!",
      "Bạn là người được chọn, hãy làm tốt nhé!",
      "Một tràng pháo tay đang chờ đợi câu trả lời của bạn!",
      "Hãy biến sự hồi hộp thành sức mạnh nào!",
      "Bạn thông minh hơn bạn tưởng đấy, cố lên!",
      "Hãy cho cả lớp thấy \"IQ vô cực\" của bạn!",
      "Câu trả lời đúng đang nằm trong đầu bạn rồi đấy!",
      "Đừng lo lắng, thầy/cô và các bạn luôn ủng hộ bạn!",
      "Hãy là chính mình và tỏa sáng rực rỡ nhé!",
      "Bạn là \"chiến binh\" dũng cảm nhất hôm nay!",
      "Hãy chinh phục câu hỏi này bằng sự tự tin của bạn!",
      "Bạn có tố chất của một thiên tài đấy!",
      "Hãy để kiến thức của bạn lên tiếng nào!",
      "Bạn là niềm tự hào của lớp mình, cố lên!",
      "Đừng để sự im lặng làm bạn lo lắng, hãy nói đi!",
      "Bạn chính là \"chìa khóa\" giải mã câu hỏi này!",
      "Hãy cho mọi người thấy bạn giỏi thế nào!",
      "Bạn là \"vua\" của những câu trả lời đúng!",
      "Hãy tự tin bước lên và khẳng định mình nào!",
      "Bạn có một bộ não tuyệt vời, hãy sử dụng nó!",
      "Hãy biến câu hỏi khó thành câu trả lời dễ nhé!",
      "Bạn là \"ngôi sao\" đang lên của lớp mình!",
      "Hãy để sự sáng tạo của bạn dẫn lối nào!",
      "Bạn làm được, chắc chắn là như vậy!",
      "Hãy cho cả lớp một phen \"trầm trồ\" nào!",
      "Bạn là người xuất sắc nhất, hãy chứng minh đi!"
    ];
    
    setLuckyMessage(messages[Math.floor(Math.random() * messages.length)]);
    
    let counter = 0;
    const maxSpins = 40;
    const minNum = 1;
    const maxNum = 48;

    const spin = () => {
      setRandomNum(Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum);
      counter++;
      
      if (counter < maxSpins) {
        // Dynamic delay for "suspense": starts slow, then gets faster
        const delay = Math.max(50, 300 - (counter * 8));
        setTimeout(spin, delay);
      } else {
        setIsSpinning(false);
        // Fireworks
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.9 },
          colors: ['#FFD700', '#FFA500', '#FFFFFF', '#FF8C00']
        });
        
        // Auto-hide after 3s (updated from 6s)
        setTimeout(() => {
          setShowRandomNum(false);
        }, 3000);
      }
    };
    
    spin();
  }, [isSpinning]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeView !== 'presentation') return;
      
      const maxIdx = isPuzzleMode ? data.length : data.length - 1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentPresIdx < maxIdx) {
          setCurrentPresIdx(prev => prev + 1);
          setShowPresAnswer(false);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentPresIdx > 0) {
          setCurrentPresIdx(prev => prev - 1);
          setShowPresAnswer(false);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        setShowPresAnswer(prev => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        setIsBlackboardFullscreen(prev => !prev);
      } else if (e.key.toLowerCase() === 'w') {
        setShowPresWebsite(prev => !prev);
      } else if (e.key.toLowerCase() === 'r') {
        startLuckyDraw();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, currentPresIdx, data.length, isPuzzleMode, startLuckyDraw]);

  // Fireworks effect for puzzle completion
  useEffect(() => {
    if (isPuzzleMode && currentPresIdx === data.length && activeView === 'presentation') {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isPuzzleMode, currentPresIdx, data.length, activeView]);

  // Navigation Items
  const navItems = [
    { id: 'creator', label: 'Công cụ tạo game', icon: LayoutGrid },
    { id: 'presentation', label: 'Trình chiếu', icon: Presentation },
    { id: 'prompt', label: 'AI Prompt', icon: Wand2 },
    { id: 'library', label: 'Thư viện ý tưởng', icon: Library },
    { id: 'guide', label: 'Hướng dẫn', icon: BookOpen },
  ];

  // Logic for Game Generation
  const handleAddRow = () => setData([...data, { q: '', a: '' }]);
  const handleRemoveRow = (index: number) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };
  const handleUpdateData = (index: number, field: keyof GameData, value: string) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const excelData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const formattedData: GameData[] = excelData
        .filter(row => row[0] || row[1])
        .map(row => ({
          q: String(row[0] || ''),
          a: String(row[1] || '')
        }));
      
      if (formattedData.length > 0) setData(formattedData);
    };
    reader.readAsBinaryString(file);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setBgImage(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    if (!printRef.current) return;
    const pages = printRef.current.querySelectorAll('.game-page');
    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        await exportToImage(pages[i] as HTMLElement, `game-${gameType}-page-${i + 1}-${Date.now()}`);
      }
    } else {
      await exportToImage(printRef.current, `game-${gameType}-${Date.now()}`);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Câu hỏi/Vế 1": "Ví dụ: 1 + 1", "Đáp án/Vế 2": "2" },
      { "Câu hỏi/Vế 1": "Ví dụ: Thủ đô Việt Nam", "Đáp án/Vế 2": "Hà Nội" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "EduGame_Template.xlsx");
  };

  const handleSaveGame = () => {
    const gameState = {
      gameType,
      tarsiaShape,
      dominoTheme,
      data,
      bgImage,
      triangleFontSize,
      isPuzzleMode
    };
    
    const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edugame-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadGame = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const gameState = JSON.parse(evt.target?.result as string);
        if (gameState.gameType) setGameType(gameState.gameType);
        if (gameState.tarsiaShape) setTarsiaShape(gameState.tarsiaShape);
        if (gameState.dominoTheme) setDominoTheme(gameState.dominoTheme);
        if (gameState.data) setData(gameState.data);
        if (gameState.bgImage !== undefined) setBgImage(gameState.bgImage);
        if (gameState.triangleFontSize) setTriangleFontSize(gameState.triangleFontSize);
        if (gameState.isPuzzleMode !== undefined) setIsPuzzleMode(gameState.isPuzzleMode);
      } catch (error) {
        console.error('Failed to load game state', error);
        alert('File không hợp lệ!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className={`min-h-screen ${activeView === 'presentation' ? 'bg-slate-950' : 'bg-[#F8FAFC]'} text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900`}>
      <style>
        {`
          @media print {
            @page {
              size: ${gameType === 'triangle' ? 'A4 landscape' : 'A4 portrait'};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            #game-canvas {
              width: ${gameType === 'triangle' ? '297mm' : '210mm'} !important;
              padding: 0 !important;
              box-shadow: none !important;
              transform: none !important;
              margin: 0 !important;
              background: white !important;
            }
            .game-page {
              width: ${gameType === 'triangle' ? '297mm' : '210mm'} !important;
              height: ${gameType === 'triangle' ? '210mm' : '297mm'} !important;
              padding: ${gameType === 'triangle' ? '5mm' : '15mm'} !important;
              page-break-after: always !important;
              break-after: page !important;
              display: flex !important;
              flex-direction: column !important;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 ${activeView === 'presentation' ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <LayoutGrid size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">Công Cụ Tạo <span className="text-indigo-600">Trò Chơi Giáo Dục</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tác giả: Vũ Tiến Lực - Trường THPT Nguyễn Hữu Cảnh</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  activeView === item.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-semibold' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <item.icon size={18} />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeView === 'creator' && (
            <motion.div
              key="creator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Panel: Controls */}
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-black flex items-center gap-2 text-slate-800 uppercase tracking-tight">
                      <LayoutGrid size={18} className="text-indigo-600" />
                      Thiết lập trò chơi
                    </h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveGame}
                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg hover:bg-indigo-100 uppercase tracking-widest transition-all"
                        title="Lưu cấu hình game"
                      >
                        Lưu Game
                      </button>
                      <label className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-100 uppercase tracking-widest transition-all" title="Tải cấu hình game">
                        Tải Game
                        <input type="file" className="hidden" accept=".json" onChange={handleLoadGame} />
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Loại trò chơi</p>
                      <select 
                        value={gameType}
                        onChange={(e) => setGameType(e.target.value as GameType)}
                        className="w-full bg-transparent font-black text-indigo-900 outline-none cursor-pointer"
                      >
                        <option value="domino">Domino Tiếp Sức</option>
                        <option value="matching">Thẻ Ghép Cặp (Memory)</option>
                        <option value="triangle">Domino Tam Giác</option>
                        <option value="tablecloth">Kỹ thuật Khăn trải bàn</option>
                      </select>
                      <p className="text-[10px] text-indigo-400 mt-1 italic">* Tự động co giãn chữ để vừa ô</p>
                    </div>

                    {gameType === 'triangle' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hình xếp (Tarsia)</label>
                        <select 
                          value={tarsiaShape}
                          onChange={(e) => setTarsiaShape(e.target.value as TarsiaShape)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                        >
                          <option value="line">Đường thẳng (Cơ bản)</option>
                          <option value="triangle16">Tam giác lớn (Cần 18 câu)</option>
                          <option value="hexagon24">Lục giác (Cần 30 câu)</option>
                          <option value="rhombus18">Hình thoi (Cần 21 câu)</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phong cách Domino</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'classic', label: 'Cổ điển', color: 'bg-slate-100' },
                          { id: 'neon', label: 'Neon Đêm', color: 'bg-slate-900' },
                          { id: 'nature', label: 'Tự nhiên', color: 'bg-emerald-100' },
                          { id: 'luxury', label: 'Sang trọng', color: 'bg-amber-100' }
                        ].map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => setDominoTheme(theme.id as DominoTheme)}
                            className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                              dominoTheme === theme.id 
                                ? 'border-indigo-600 bg-indigo-50' 
                                : 'border-slate-100 hover:border-slate-200 bg-white'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full ${theme.color} border border-slate-200`} />
                            <span className="text-xs font-bold text-slate-700">{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ảnh nền (Tùy chọn)</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                            <ImageIcon size={18} className="text-slate-400 group-hover:text-indigo-500" />
                            <span className="text-sm text-slate-500 group-hover:text-indigo-600 font-medium">Tải ảnh lên</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                          </label>
                          {bgImage && (
                            <button 
                              onClick={() => setBgImage(null)}
                              className="p-3 text-red-500 hover:bg-red-50 rounded-2xl border border-red-100 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>

                        {gameType === 'domino' && bgImage && (
                          <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div>
                              <label className="block text-xs font-black text-indigo-900 uppercase tracking-wider leading-none">Chế độ Nâng cao</label>
                              <p className="text-[9px] text-indigo-600 font-medium mt-1">Ghép thẻ thành bức tranh hoàn chỉnh</p>
                            </div>
                            <button 
                              onClick={() => setIsPuzzleMode(!isPuzzleMode)}
                              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${isPuzzleMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isPuzzleMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider leading-none">Kí hiệu H/Đ</label>
                            <p className="text-[9px] text-slate-500 font-medium mt-1">Hiển thị kí hiệu Câu hỏi/Đáp án</p>
                          </div>
                          <button 
                            onClick={() => setShowSymbols(!showSymbols)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${showSymbols ? 'bg-indigo-600' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showSymbols ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-black flex items-center gap-2 text-slate-800 uppercase tracking-tight">
                      <FileSpreadsheet size={18} className="text-indigo-600" />
                      Dữ liệu câu hỏi
                    </h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsSaveModalOpen(true)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Lưu vào thư viện"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={handleDownloadTemplate}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Tải file mẫu"
                      >
                        <Download size={16} />
                      </button>
                      <label className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-100 uppercase tracking-widest transition-all">
                        Excel
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                      </label>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nhập từ Google Sheets ID</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="ID của Sheet..." 
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                      />
                      <button 
                        onClick={handleGoogleSheetFetch}
                        disabled={isFetchingSheet || !sheetId}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all"
                      >
                        {isFetchingSheet ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Wand2 size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {data.map((item, idx) => (
                      <div key={idx} className="group relative p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all shadow-sm hover:shadow-md">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-300 w-4">Q</span>
                            <input 
                              placeholder="Câu hỏi..."
                              value={item.q}
                              onChange={(e) => handleUpdateData(idx, 'q', e.target.value)}
                              className="w-full px-0 py-1 bg-transparent border-b border-slate-200 text-sm focus:border-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-300 w-4">A</span>
                            <input 
                              placeholder="Đáp án..."
                              value={item.a}
                              onChange={(e) => handleUpdateData(idx, 'a', e.target.value)}
                              className="w-full px-0 py-1 bg-transparent border-b border-slate-200 text-sm focus:border-indigo-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveRow(idx)}
                          className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleAddRow}
                    className="w-full mt-5 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-sm"
                  >
                    <Plus size={18} />
                    Thêm dòng mới
                  </button>
                </section>

                {/* Pedagogical Tips Section */}
                <section className="bg-indigo-900 p-6 rounded-3xl shadow-xl text-white">
                  <h3 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-indigo-300">
                    <Info size={16} />
                    Gợi ý sư phạm
                  </h3>
                  <ul className="space-y-3">
                    {PEDAGOGICAL_TIPS[gameType].map((tip, i) => (
                      <li key={i} className="text-xs flex gap-3 leading-relaxed opacity-90">
                        <ChevronRight size={14} className="shrink-0 text-indigo-400" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Right Panel: Preview */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button 
                      onClick={() => setPreviewMode('answer')}
                      className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        previewMode === 'answer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      Đáp Án
                    </button>
                    <button 
                      onClick={() => setPreviewMode('student')}
                      className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        previewMode === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      Học Sinh
                    </button>
                    <button 
                      onClick={() => setPreviewMode('worksheet')}
                      className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        previewMode === 'worksheet' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      Phiếu học tập
                    </button>
                  </div>

                  {gameType === 'triangle' && (
                    <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-2xl">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">Cỡ chữ:</span>
                      <button 
                        onClick={() => setTriangleFontSize(prev => Math.max(8, prev - 1))}
                        className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-50 transition-all"
                        title="Giảm cỡ chữ"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-black text-indigo-600 w-8 text-center">{triangleFontSize}</span>
                      <button 
                        onClick={() => setTriangleFontSize(prev => Math.min(32, prev + 1))}
                        className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-50 transition-all"
                        title="Tăng cỡ chữ"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 font-bold text-sm"
                    >
                      <Printer size={18} />
                      <span className="hidden sm:inline">In trang</span>
                    </button>
                    <button 
                      onClick={handleDownloadPNG}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-sm"
                    >
                      <Download size={18} />
                      <span className="hidden sm:inline">Xuất ảnh HD</span>
                    </button>
                  </div>
                </div>

                {/* Preview Area */}
                <div className="bg-slate-200 p-4 md:p-10 rounded-[2rem] overflow-x-auto min-h-[700px] flex justify-center shadow-inner">
                  <div 
                    ref={printRef}
                    className={`bg-white shadow-2xl origin-top transform scale-[0.6] sm:scale-[0.8] md:scale-100 ${
                      gameType === 'triangle' ? 'w-[297mm]' : 'w-[210mm]'
                    }`}
                    id="game-canvas"
                  >
                    <GameRenderer 
                      type={gameType} 
                      data={data} 
                      mode={previewMode} 
                      bgImage={bgImage} 
                      theme={dominoTheme} 
                      triangleFontSize={triangleFontSize}
                      isPuzzleMode={isPuzzleMode}
                      tarsiaShape={tarsiaShape}
                      showSymbols={showSymbols}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                    <Wand2 size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">AI Prompt Generator Pro</h2>
                    <p className="text-slate-500">Tạo câu lệnh tối ưu để nhận dữ liệu chất lượng cao từ AI</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Vai trò của AI</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                      value={promptInfo.role}
                      onChange={(e) => setPromptInfo({...promptInfo, role: e.target.value})}
                    >
                      <option value="Chuyên gia giáo dục">Chuyên gia giáo dục</option>
                      <option value="Giáo viên bộ môn">Giáo viên bộ môn (Chung)</option>
                      <option value="Giáo viên bộ môn Toán">Giáo viên bộ môn Toán</option>
                      <option value="Giáo viên bộ môn Vật lý">Giáo viên bộ môn Vật lý</option>
                      <option value="Giáo viên bộ môn Hóa học">Giáo viên bộ môn Hóa học</option>
                      <option value="Giáo viên bộ môn Tiếng Anh">Giáo viên bộ môn Tiếng Anh</option>
                      <option value="Giáo viên bộ môn Sinh học">Giáo viên bộ môn Sinh học</option>
                      <option value="Giáo viên bộ môn Lịch sử">Giáo viên bộ môn Lịch sử</option>
                      <option value="Giáo viên bộ môn Địa lý">Giáo viên bộ môn Địa lý</option>
                      <option value="Giáo viên bộ môn Ngữ văn">Giáo viên bộ môn Ngữ văn</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      Khối lớp <span className="text-xs font-normal text-slate-400">(Ví dụ: Lớp 10, Đại học)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: Lớp 10"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                      value={promptInfo.grade}
                      onChange={(e) => setPromptInfo({...promptInfo, grade: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      Môn học <span className="text-xs font-normal text-slate-400">(Ví dụ: Vật lý, Tiếng Anh)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: Toán học"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                      value={promptInfo.subject}
                      onChange={(e) => setPromptInfo({...promptInfo, subject: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      Chủ đề cụ thể <span className="text-xs font-normal text-slate-400">(Càng chi tiết kết quả càng tốt)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: Định luật bảo toàn năng lượng, Câu điều kiện loại 1"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                      value={promptInfo.topic}
                      onChange={(e) => setPromptInfo({...promptInfo, topic: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Mức độ nhận thức</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                      value={promptInfo.level}
                      onChange={(e) => setPromptInfo({...promptInfo, level: e.target.value})}
                    >
                      <option>Nhận biết (Dễ)</option>
                      <option>Thông hiểu (Trung bình)</option>
                      <option>Vận dụng (Khó)</option>
                      <option>Vận dụng cao (Rất khó)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Số lượng cặp dữ liệu</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                      value={promptInfo.count}
                      onChange={(e) => setPromptInfo({...promptInfo, count: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      Yêu cầu bổ sung <span className="text-xs font-normal text-slate-400">(Tùy chọn: ngôn ngữ, định dạng số...)</span>
                    </label>
                    <textarea 
                      placeholder="Ví dụ: Sử dụng Tiếng Anh, không dùng số thập phân, tập trung vào các hằng số vật lý..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none h-24 resize-none"
                      value={(promptInfo as any).extra || ''}
                      onChange={(e) => setPromptInfo({...promptInfo, extra: e.target.value} as any)}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 relative group">
                  <div className="absolute top-4 right-4 transition-all">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generateAIPrompt(promptInfo));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={`px-4 py-2 text-white text-sm font-semibold rounded-xl shadow-lg transition-all ${copied ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      {copied ? 'Đã sao chép!' : 'Sao chép câu lệnh'}
                    </button>
                  </div>
                  <div className="text-indigo-300 text-sm font-mono leading-relaxed overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{generateAIPrompt(promptInfo)}</pre>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <Info className="text-amber-500 shrink-0" size={20} />
                  <div className="text-sm text-amber-800">
                    <p className="font-bold mb-1">Mẹo để có kết quả tốt nhất:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                      <li>Hãy cung cấp 1-2 ví dụ mẫu trong phần "Yêu cầu bổ sung".</li>
                      <li>Yêu cầu AI xuất dữ liệu dưới dạng bảng để dễ dàng copy vào Excel.</li>
                      <li>Nếu dùng MathJax, hãy nhắc AI: "Sử dụng dấu $ bao quanh công thức LaTeX".</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-7xl mx-auto px-4 py-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Thư viện bài học</h2>
                  <p className="text-slate-500">Quản lý và tổ chức các bài học đã lưu của bạn</p>
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm">
                    <Download size={16} className="text-indigo-600" />
                    Nhập file cấu hình
                    <input type="file" className="hidden" accept=".json" onChange={handleLoadGame} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Cấu trúc thư mục</h3>
                    <div className="custom-scrollbar max-h-[600px] overflow-y-auto pr-2">
                      {renderTreeView()}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black mb-2">Thư viện ý tưởng cộng đồng</h3>
                      <p className="text-indigo-100 mb-6 max-w-md">Khám phá hàng ngàn bài học được chia sẻ từ cộng đồng giáo viên trên toàn quốc.</p>
                      <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all">
                        Khám phá ngay
                      </button>
                    </div>
                    <Library className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10 rotate-12" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LibraryCard 
                      title="1. Học bài mới (Khám phá)" 
                      desc="Phát bộ thẻ chứa các thuật ngữ và định nghĩa mới. HS tự nghiên cứu SGK để ghép nối, giúp ghi nhớ chủ động ngay từ đầu."
                      image="https://picsum.photos/seed/learn/400/250"
                    />
                    <LibraryCard 
                      title="2. Luyện tập (Giải toán/Lý/Hóa)" 
                      desc="Ghép đề bài toán với kết quả cuối cùng. Phù hợp cho các bài tập trắc nghiệm ngắn, rèn luyện tốc độ tính toán."
                      image="https://picsum.photos/seed/practice/400/250"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'presentation' && (
            <motion.div
              key="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[100] bg-black p-0 flex flex-col overflow-hidden"
            >
              {/* Subtle Exit Button - visible on hover or at corner */}
              <div className="absolute top-4 right-4 z-[110] opacity-0 hover:opacity-100 transition-opacity flex gap-2">
                <button 
                  onClick={toggleFullScreen}
                  className="p-2 bg-white/10 text-white/50 hover:text-white hover:bg-white/20 rounded-full transition-all"
                  title={isFullScreen ? "Thu nhỏ màn hình" : "Toàn màn hình"}
                >
                  {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button 
                  onClick={() => setShowPresWebsite(!showPresWebsite)}
                  className={`p-2 rounded-full transition-all ${showPresWebsite ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:text-white hover:bg-white/20'}`}
                  title="Bật/tắt trang web (W)"
                >
                  <Presentation size={20} />
                </button>
                <button 
                  onClick={() => setActiveView('creator')}
                  className="p-2 bg-white/10 text-white/50 hover:text-white hover:bg-white/20 rounded-full transition-all"
                  title="Thoát trình chiếu"
                >
                  <EyeOff size={20} />
                </button>
              </div>

              <div className="flex-1 flex w-full h-full relative">
                {/* Main Presentation Area */}
                <div 
                  className={`flex flex-col h-full transition-all duration-500 ${showPresWebsite && !isPresWebsiteFullscreen ? '' : isPresWebsiteFullscreen ? 'w-0 overflow-hidden' : 'w-full'}`}
                  style={{ width: showPresWebsite && !isPresWebsiteFullscreen ? `${100 - websiteWidth}%` : undefined }}
                >
                  {data.length > 0 && (data[0].q || data[0].a) ? (
                    <>
                      {/* Top: Question & Answer */}
                      {!isBlackboardFullscreen && (
                        <div 
                          className="bg-black p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden"
                          style={{ flex: `1 1 ${100 - blackboardHeight}%` }}
                        >

                          <div className="absolute top-4 left-6 opacity-30">
                            <div className="text-white/50 font-black text-xs uppercase tracking-widest">
                              {isPuzzleMode && currentPresIdx === data.length ? 'Kết quả cuối cùng' : `Câu hỏi ${currentPresIdx + 1} / ${data.filter(d => d.q || d.a).length}`}
                            </div>
                          </div>

                          {/* Lucky Draw Display */}
                          <AnimatePresence>
                            {showRandomNum && (
                              <motion.div
                                initial={{ opacity: 0, y: 100, scale: 0.5 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 100, scale: 0.5 }}
                                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
                              >
                                <div className="relative">
                                  {/* Glow Effect */}
                                  <div className="absolute inset-0 bg-yellow-400/30 blur-[60px] rounded-full scale-150 animate-pulse"></div>
                                  
                                  <div className={`
                                    text-[12rem] md:text-[18rem] font-black leading-none
                                    text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600
                                    drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]
                                    filter brightness-125
                                    ${isSpinning ? 'animate-bounce' : ''}
                                  `}>
                                    {randomNum}
                                  </div>
                                  
                                  {!isSpinning && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 whitespace-nowrap"
                                    >
                                      <motion.div
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl shadow-2xl"
                                      >
                                        <p className="text-yellow-400 font-bold text-lg italic drop-shadow-md">
                                          "{luckyMessage}"
                                        </p>
                                      </motion.div>
                                      <span className="px-6 py-2 bg-yellow-500 text-black text-sm font-black uppercase tracking-[0.3em] rounded-full shadow-xl">
                                        Con số may mắn
                                      </span>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className={`w-full ${isPuzzleMode && currentPresIdx === data.length ? 'h-full flex items-center justify-center' : 'px-4 md:px-12 space-y-12'} text-center`}>
                            {isPuzzleMode && currentPresIdx === data.length ? (
                              <div className="w-full h-full flex items-center justify-center p-4">
                                {bgImage ? (
                                  <div className="w-full h-full max-w-6xl max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                                    <PuzzleAssembler image={bgImage} duration={10} />
                                  </div>
                                ) : (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 2 }}
                                    className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white rounded-3xl p-20"
                                  >
                                    <Trophy size={120} className="mb-8 text-yellow-400" />
                                    <h2 className="text-6xl font-black tracking-tighter uppercase">CHÚC MỪNG!</h2>
                                    <p className="text-xl mt-4 opacity-70 font-medium">Bạn đã hoàn thành trò chơi xuất sắc</p>
                                  </motion.div>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="w-full">
                                  <h2 className="text-2xl md:text-5xl lg:text-[5rem] font-black leading-[1.1] text-white drop-shadow-2xl break-words">
                                    <MathText text={data[currentPresIdx].q || "Chưa có nội dung"} />
                                  </h2>
                                </div>

                                <AnimatePresence mode="wait">
                                  {showPresAnswer ? (
                                    <motion.div
                                      key="answer"
                                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                      className="p-8 bg-emerald-900/30 border-2 border-emerald-500/30 rounded-3xl shadow-inner relative group"
                                    >
                                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Đáp án đúng</div>
                                      <p className="text-3xl md:text-5xl font-black text-emerald-400">
                                        <MathText text={data[currentPresIdx].a || "Chưa có đáp án"} />
                                      </p>
                                    </motion.div>
                                  ) : (
                                    <motion.button
                                      key="reveal"
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => setShowPresAnswer(true)}
                                      className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl flex items-center gap-4 mx-auto group"
                                    >
                                      <Eye className="group-hover:text-white transition-colors" />
                                      Hiện đáp án
                                    </motion.button>
                                  )}
                                </AnimatePresence>
                              </>
                            )}
                          </div>

                          {/* Navigation Controls - Subtle */}
                          <div className="absolute bottom-4 right-6 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
                            <button 
                              disabled={currentPresIdx === 0}
                              onClick={() => { setCurrentPresIdx(prev => prev - 1); setShowPresAnswer(false); }}
                              className="p-3 rounded-xl transition-all bg-white/5 text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-10"
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <button 
                              disabled={currentPresIdx === (isPuzzleMode ? data.length : data.length - 1)}
                              onClick={() => { setCurrentPresIdx(prev => prev + 1); setShowPresAnswer(false); }}
                              className="p-3 rounded-xl transition-all bg-white/5 text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-10"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Bottom: Blackboard */}
                      {!(isPuzzleMode && currentPresIdx === data.length) && (
                        <div 
                          className="bg-black border-t border-white/10 relative overflow-hidden group transition-all duration-500"
                          style={{ flex: isBlackboardFullscreen ? '1 1 100%' : `0 0 ${blackboardHeight}%` }}
                        >
                          {/* Resizer Handle */}
                          {!isBlackboardFullscreen && (
                            <div 
                              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent hover:bg-indigo-500 z-50 transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setIsResizingBlackboard(true);
                              }}
                            />
                          )}
                          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/chalkboard.png')]"></div>
                          <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between px-4 py-2 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-2 text-white/30">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Bảng viết tay (F: Toàn màn hình)</span>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setIsBlackboardFullscreen(!isBlackboardFullscreen)}
                                  className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                  title={isBlackboardFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                                >
                                  {isBlackboardFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 relative">
                              <Blackboard />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 bg-slate-900 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600">
                      <Presentation size={64} strokeWidth={1} className="mb-4 opacity-20" />
                      <p className="text-lg font-bold">Chưa có dữ liệu để trình chiếu</p>
                      <p className="text-sm">Vui lòng nhập câu hỏi ở phần "Công cụ tạo game"</p>
                    </div>
                  )}
                </div>

                {/* Website View */}
                {showPresWebsite && (
                  <div 
                    className={`h-full bg-white transition-all duration-500 relative ${isPresWebsiteFullscreen ? 'w-full' : 'border-l border-white/10'}`}
                    style={{ width: isPresWebsiteFullscreen ? '100%' : `${websiteWidth}%` }}
                  >
                    {/* Resizer Handle */}
                    {!isPresWebsiteFullscreen && (
                      <div 
                        className="absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize bg-transparent hover:bg-indigo-500 z-50 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsResizingWebsite(true);
                        }}
                      />
                    )}
                    <div className="absolute top-2 left-2 z-10 flex gap-2">
                      <button 
                        onClick={() => setIsPresWebsiteFullscreen(!isPresWebsiteFullscreen)}
                        className="p-2 bg-slate-800/80 text-white/70 hover:text-white hover:bg-slate-700 rounded-lg backdrop-blur-sm transition-all shadow-lg"
                        title={isPresWebsiteFullscreen ? "Thu nhỏ web" : "Phóng to web"}
                      >
                        {isPresWebsiteFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                      </button>
                      <button 
                        onClick={() => {
                          setShowPresWebsite(false);
                          setIsPresWebsiteFullscreen(false);
                        }}
                        className="p-2 bg-slate-800/80 text-white/70 hover:text-white hover:bg-red-500/80 rounded-lg backdrop-blur-sm transition-all shadow-lg"
                        title="Đóng web"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <iframe 
                      src="https://bang2026.vercel.app/" 
                      className="w-full h-full border-none"
                      title="Presentation Website"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {/* Organization Guide */}
              <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800 uppercase tracking-tight">
                  <LayoutGrid className="text-indigo-600" />
                  Hướng dẫn tổ chức trò chơi
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black mb-4">01</div>
                    <h3 className="font-bold mb-2">Chuẩn bị</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">In bộ thẻ ra giấy cứng (hoặc ép plastic). Cắt rời các thẻ theo đường nét đứt. Mỗi nhóm 2-4 HS nhận 1 bộ.</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black mb-4">02</div>
                    <h3 className="font-bold mb-2">Luật chơi</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">HS tìm thẻ có biểu tượng <span className="inline-flex items-center bg-indigo-600 text-white p-0.5 rounded-full mx-1"><Flag size={8} fill="white" /></span> (Bắt đầu). Sau đó tìm thẻ có vế trái khớp với vế phải của thẻ trước đó. Cứ thế cho đến khi khép kín.</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black mb-4">03</div>
                    <h3 className="font-bold mb-2">Kiểm tra</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Giáo viên sử dụng "Phiên bản đáp án" để đối chiếu nhanh. Nhóm nào hoàn thành đúng và nhanh nhất sẽ thắng.</p>
                  </div>
                </div>
              </section>

              {/* Active Learning Scenarios */}
              <section className="bg-indigo-900 p-8 rounded-3xl shadow-xl text-white">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight">
                  <Wand2 className="text-indigo-400" />
                  5 Kịch bản dạy học tích cực
                </h2>
                <div className="space-y-4">
                  {[
                    { title: "Cuộc đua tiếp sức", desc: "Chia lớp thành các đội. Mỗi đội cử 1 đại diện lên ghép 1 thẻ rồi chạy về đập tay người tiếp theo. Tăng tính vận động và hào hứng." },
                    { title: "Trạm học tập xoay vòng", desc: "Đặt các bộ Domino khác nhau ở các trạm. Sau 5-7 phút, các nhóm di chuyển sang trạm tiếp theo. Giúp ôn tập đa dạng kiến thức." },
                    { title: "Mảnh ghép chuyên gia", desc: "Mỗi thành viên trong nhóm chịu trách nhiệm tìm hiểu 1 phần kiến thức, sau đó cả nhóm cùng ghép bộ Domino tổng hợp." },
                    { title: "Thử thách ngược", desc: "Phát bộ Domino đã ghép sẵn nhưng có 2-3 chỗ sai. Yêu cầu HS phát hiện và sửa lại cho đúng. Rèn luyện tư duy phản biện." },
                    { title: "Học sinh làm chủ", desc: "Yêu cầu HS tự thiết kế nội dung Domino cho chương vừa học, sau đó trao đổi bộ thẻ giữa các nhóm để giải đố lẫn nhau." }
                  ].map((s, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
                      <div className="text-2xl font-black text-indigo-400">0{i+1}</div>
                      <div>
                        <h3 className="font-bold text-lg">{s.title}</h3>
                        <p className="text-sm text-indigo-100/80 mt-1">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* MathJax Guide */}
              <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <BookOpen className="text-indigo-600" />
                  Hướng dẫn sử dụng MathJax
                </h2>
              
              <div className="prose prose-slate max-w-none space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500 flex gap-3">
                  <Info className="text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-800">
                    Để hiển thị công thức toán học, hãy đặt mã LaTeX giữa hai ký hiệu đô la <code>$</code>. 
                    Ví dụ: <code>{'$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$'}</code>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Các ký hiệu phổ biến</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Mô tả</th>
                          <th className="px-4 py-2 text-left">Mã LaTeX</th>
                          <th className="px-4 py-2 text-left">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2">Phân số</td>
                          <td className="px-4 py-2"><code>{'\\frac{1}{2}'}</code></td>
                          <td className="px-4 py-2"><MathText text={'$\\frac{1}{2}$'} /></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Số mũ</td>
                          <td className="px-4 py-2"><code>{'x^2'}</code></td>
                          <td className="px-4 py-2"><MathText text={'$x^2$'} /></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Căn bậc hai</td>
                          <td className="px-4 py-2"><code>{'\\sqrt{x}'}</code></td>
                          <td className="px-4 py-2"><MathText text={'$\\sqrt{x}$'} /></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Nhân/Chia</td>
                          <td className="px-4 py-2"><code>{'\\times, \\div'}</code></td>
                          <td className="px-4 py-2"><MathText text={'$\\times, \\div$'} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Lưu ý quan trọng</h3>
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-2">
                      <li>Không nên viết công thức quá dài trên một dòng để tránh tràn khung game.</li>
                      <li>Sử dụng <code>{`\\text{...}`}</code> nếu muốn viết chữ tiếng Việt có dấu trong công thức.</li>
                      <li>Kiểm tra kỹ các dấu đóng mở ngoặc nhọn <code>{'{ }'}</code>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Save Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaveModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">Lưu bài học</h3>
                <button onClick={() => setIsSaveModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tên bài học</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Ôn tập chương 1..." 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Đường dẫn / Thư mục (Dùng / để phân cấp)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Toán/Lớp 6/Số học" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={savePath}
                    onChange={(e) => setSavePath(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 italic">Sơ đồ cây sẽ được tạo dựa trên đường dẫn này.</p>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSaveToLocal}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Xác nhận lưu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">© 2026 Công Cụ Tạo Trò Chơi Giáo Dục. Tác giả: Vũ Tiến Lực - Trường THPT Nguyễn Hữu Cảnh.</p>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---

// --- Expert Components & Logic ---

/**
 * Pedagogical Tips for Teachers
 */
const PEDAGOGICAL_TIPS: Record<GameType, string[]> = {
  domino: [
    "Khuyến khích học sinh làm việc theo nhóm 2-4 người.",
    "Sử dụng để ôn tập từ vựng, công thức hoặc các mốc lịch sử.",
    "Mẹo: Hãy in trên giấy màu khác nhau cho mỗi nhóm để tránh nhầm lẫn.",
    "Học sinh cần tìm thẻ có Đáp án khớp với Câu hỏi của thẻ trước đó."
  ],
  matching: [
    "Phù hợp cho các cặp khái niệm - định nghĩa hoặc hình ảnh - tên gọi.",
    "Có thể dùng làm trò chơi khởi động nhanh trong 5 phút.",
    "Mẹo: Úp các thẻ xuống để chơi như trò chơi trí nhớ (Memory Game).",
    "Học sinh cần tìm cặp thẻ có nội dung tương ứng với nhau."
  ],
  triangle: [
    "Tăng độ khó so với Domino truyền thống vì mỗi thẻ có 3 cạnh ghép.",
    "Yêu cầu học sinh quan sát đa chiều và tư duy logic cao hơn.",
    "Mẹo: Bắt đầu từ các thẻ ở góc hoặc thẻ có nội dung dễ nhận biết.",
    "Học sinh ghép các cạnh của tam giác sao cho nội dung khớp nhau."
  ],
  tablecloth: [
    "Chia nhóm 4-6 học sinh, mỗi em làm việc ở một góc riêng.",
    "Khuyến khích học sinh viết ý kiến cá nhân trước khi thảo luận nhóm.",
    "Mẹo: Sử dụng bút màu khác nhau cho mỗi học sinh để dễ theo dõi.",
    "Phần trung tâm dành cho ý kiến thống nhất cuối cùng của cả nhóm."
  ]
};

/**
 * High-Quality Export Utility
 */
const exportToImage = async (element: HTMLElement, fileName: string) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 3, // Higher scale for professional printing (300 DPI approx)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        // Ensure MathJax is fully rendered in the clone if needed
        const el = clonedDoc.getElementById('game-canvas');
        if (el) el.style.transform = 'scale(1)';
      }
    });
    
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  } catch (err) {
    console.error("Export failed:", err);
    alert("Có lỗi xảy ra khi xuất ảnh. Vui lòng thử lại.");
  }
};

/**
 * Auto-fit text component to prevent overflow
 */
const AutoFitText = ({ text, className = "", maxFontSize = 12 }: { text: string, className?: string, maxFontSize?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    // Reset to default
    container.style.fontSize = `${maxFontSize}px`;
    
    let currentSize = maxFontSize;
    // Heuristic for long text
    if (text.length > 40) currentSize = Math.min(maxFontSize, 10);
    if (text.length > 80) currentSize = Math.min(maxFontSize, 8);
    if (text.length > 120) currentSize = Math.min(maxFontSize, 7);
    if (text.length > 160) currentSize = Math.min(maxFontSize, 6);
    
    container.style.fontSize = `${currentSize}px`;

    // Check for actual overflow and shrink further if needed
    const checkOverflow = () => {
      let size = currentSize;
      while (
        (container.scrollHeight > container.clientHeight || container.scrollWidth > container.clientWidth) && 
        size > 5
      ) {
        size -= 0.5;
        container.style.fontSize = `${size}px`;
      }
    };

    // Delay slightly to allow MathJax or layout to settle
    const timer = setTimeout(checkOverflow, 50);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center p-1 text-center overflow-hidden ${className}`}>
      <span className="game-content-text leading-tight">
        <MathText text={text} />
      </span>
    </div>
  );
};

/**
 * MathText Component for LaTeX rendering
 */
const MathText = ({ text }: { text: string }) => {
  if (!text) return null;
  
  // Split text by $ delimiters
  const parts = text.split(/(\$.*?\$)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return <InlineMath key={i} math={math} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

/**
 * Blackboard Component for drawing
 */
const Blackboard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to fit container
    const resize = () => {
      window.requestAnimationFrame(() => {
        const parent = canvas.parentElement;
        if (parent && canvas) {
          // Save current content
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;

          // Restore content
          const currentCtx = canvas.getContext('2d');
          if (currentCtx) {
            currentCtx.drawImage(tempCanvas, 0, 0);
            currentCtx.lineCap = 'round';
            currentCtx.lineJoin = 'round';
          }
        }
      });
    };

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    resize();
    return () => resizeObserver.disconnect();
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="w-full h-full relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
        className="w-full h-full block"
      />
      <div className="absolute bottom-4 right-4 flex gap-2 bg-slate-800/80 backdrop-blur-sm p-2 rounded-xl border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1 border-r border-slate-700 pr-2 mr-1">
          {['#ffffff', '#f87171', '#4ade80', '#60a5fa', '#fbbf24'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button 
          onClick={clear}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title="Xoá bảng"
        >
          <Eraser size={18} />
        </button>
      </div>
    </div>
  );
};

/**
 * Domino Component
 */
const DominoGame = ({ data, mode, cutLineClass, theme = 'classic', bgImage, isPuzzleMode, showSymbols = false }: { data: any[], mode: string, cutLineClass: string, theme?: DominoTheme, bgImage?: string | null, isPuzzleMode?: boolean, showSymbols?: boolean }) => {
  const themeStyles = {
    classic: {
      card: "bg-white border-slate-900",
      left: "bg-slate-50/50 border-slate-300",
      text: "text-slate-900",
      number: "text-slate-300"
    },
    neon: {
      card: "bg-slate-900 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]",
      left: "bg-slate-800/50 border-slate-700",
      text: "text-indigo-100",
      number: "text-slate-600"
    },
    nature: {
      card: "bg-emerald-50 border-emerald-800 rounded-xl",
      left: "bg-emerald-100/50 border-emerald-200",
      text: "text-emerald-900",
      number: "text-emerald-300"
    },
    luxury: {
      card: "bg-slate-950 border-amber-500",
      left: "bg-slate-900/50 border-amber-900/30",
      text: "text-amber-100",
      number: "text-amber-900/50"
    }
  };

  const s = themeStyles[theme];

  // Split data into pages (12 dominoes per page for A4 portrait)
  const itemsPerPage = 12;
  const pages = [];
  for (let i = 0; i < data.length; i += itemsPerPage) {
    pages.push(data.slice(i, i + itemsPerPage));
  }

  const columns = 2;
  const rows = 6;

  return (
    <div className="space-y-10">
      {pages.map((pageData, pageIndex) => (
        <div key={pageIndex} className="game-page print:break-after-page min-h-[270mm] flex flex-col p-[15mm]">
          <div className="mb-6 flex justify-between items-end border-b-2 border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Domino Học Tập</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                {mode === 'answer' ? 'Phiên bản dành cho Giáo viên' : 'Phiên bản dành cho Học sinh'} - Trang {pageIndex + 1}
              </p>
              {isPuzzleMode && bgImage && (
                <p className="text-[10px] text-indigo-500 font-bold mt-1 italic">
                  * Gợi ý: Ghép đúng các thẻ để hoàn thiện bức tranh bí ẩn!
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase">Tác giả: Thầy Vũ Tiến Lực</div>
              <div className="text-[8px] text-slate-400">Trường THPT Nguyễn Hữu Cảnh</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-4">
            {pageData.map((item, i) => {
              const globalIndex = pageIndex * itemsPerPage + i;
              const puzzleIndex = item.originalIndex % itemsPerPage;
              const rawRow = Math.floor(puzzleIndex / columns);
              const isReversedRow = isPuzzleMode && (rawRow % 2 === 1);
              
              const col = isReversedRow ? (columns - 1 - (puzzleIndex % columns)) : (puzzleIndex % columns);
              const row = rawRow;

              const puzzleStyle = (isPuzzleMode && bgImage) ? {
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)), url(${bgImage})`,
                backgroundSize: `${columns * 100}% ${rows * 100}%`,
                backgroundPosition: `${col * 100}% ${row * 20}%`,
                backgroundRepeat: 'no-repeat'
              } : {};

              const leftLen = item.displayLeft.length;
              const rightLen = item.displayRight.length;
              const totalLen = leftLen + rightLen || 1;
              const leftRatio = Math.max(0.3, Math.min(0.7, leftLen / totalLen));
              const rightRatio = 1 - leftRatio;

              return (
                <div 
                  key={globalIndex} 
                  style={puzzleStyle}
                  className={`flex ${isReversedRow ? 'flex-row-reverse' : 'flex-row'} border-[1.5pt] h-28 rounded-md overflow-hidden shadow-sm relative ${s.card} ${cutLineClass}`}
                >
                  {/* Scissor Icon for Print */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 hidden print:block text-[10px] text-slate-400">✂️</div>
                  
                  {/* Card Numbering */}
                  <div className={`absolute top-1 left-1 text-[8px] font-black uppercase ${s.number}`}>Thẻ #{globalIndex + 1}</div>

                  <div 
                    className={`flex items-center justify-center ${isReversedRow ? 'border-l-[1pt]' : 'border-r-[1pt]'} relative ${s.left} ${isPuzzleMode && bgImage ? 'bg-transparent' : ''}`}
                    style={{ flex: leftRatio }}
                  >
                    {/* Start Indicator */}
                    {item.originalIndex === 0 && (
                      <div className="absolute top-1 right-1 bg-indigo-600 text-white p-1 rounded-full shadow-lg animate-bounce">
                        <Flag size={10} fill="white" />
                      </div>
                    )}
                    <div className="flex flex-col items-center px-2">
                      {showSymbols && <span className="text-[8px] font-black opacity-30 mb-[-2px]">Đ</span>}
                      <AutoFitText 
                        text={item.displayLeft} 
                        className={`font-bold ${s.text}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center" style={{ flex: rightRatio }}>
                    <div className="flex flex-col items-center px-2">
                      {showSymbols && <span className="text-[8px] font-black opacity-30 mb-[-2px]">H</span>}
                      <AutoFitText text={item.displayRight} className={`font-bold ${s.text}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

function GameRenderer({ type, data, mode, bgImage, theme, triangleFontSize, isPuzzleMode, tarsiaShape, showSymbols = false }: { type: GameType, data: GameData[], mode: 'student' | 'answer' | 'worksheet', bgImage: string | null, theme: DominoTheme, triangleFontSize?: number, isPuzzleMode?: boolean, tarsiaShape?: TarsiaShape, showSymbols?: boolean }) {
  const shuffle = React.useCallback((array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  const displayData = React.useMemo(() => {
    // Prepare the actual content for each card in a chain (Domino/Triangle)
    const preparedData = data.map((item, index) => {
      return {
        ...item,
        displayLeft: index === 0 ? "BẮT ĐẦU" : data[index - 1].a,
        displayRight: item.q,
        originalIndex: index
      };
    });

    if (mode === 'answer') return preparedData;
    return shuffle(preparedData);
  }, [data, mode, shuffle]);

  const cutLineClass = "print:border-dashed print:border-slate-400 print:border-[0.5pt]";

  if (data.length === 0 || (data.length === 1 && !data[0].q)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
        <LayoutGrid size={64} strokeWidth={1} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">Chưa có dữ liệu để hiển thị</p>
        <p className="text-sm">Hãy nhập câu hỏi ở bảng bên trái</p>
      </div>
    );
  }

  if (mode === 'worksheet') return <WorksheetRenderer data={data} />;
  if (type === 'matching') return <MatchingGame data={displayData} mode={mode} cutLineClass={cutLineClass} theme={theme} />;
  if (type === 'triangle') return <TriangleGame data={displayData} mode={mode} cutLineClass={cutLineClass} theme={theme} fontSize={triangleFontSize} tarsiaShape={tarsiaShape} showSymbols={showSymbols} />;
  if (type === 'tablecloth') return <TableclothGame data={data} mode={mode} />;
  return <DominoGame data={displayData} mode={mode} cutLineClass={cutLineClass} theme={theme} bgImage={bgImage} isPuzzleMode={isPuzzleMode} showSymbols={showSymbols} />;
}

/**
 * Worksheet Renderer Component
 */
const WorksheetRenderer = ({ data }: { data: GameData[] }) => {
  const questionsPerPage = 24; // 12 rows, 2 columns -> very economical
  const pages = [];
  for (let i = 0; i < data.length; i += questionsPerPage) {
    pages.push(data.slice(i, i + questionsPerPage));
  }

  return (
    <div className="bg-slate-100 space-y-8 print:space-y-0 print:bg-white">
      {pages.map((pageQuestions, pageIndex) => (
        <div key={pageIndex} className="game-page bg-white p-8 min-h-[297mm] text-black font-serif shadow-lg print:shadow-none print:p-6 relative box-border">
          {/* Header only on first page */}
          {pageIndex === 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-start mb-4">
                <div className="w-2/5 text-center">
                  <div className="font-bold text-[11pt] uppercase">Trường THPT ....................</div>
                  <div className="text-[11pt] font-bold border-b border-black inline-block pb-0.5 px-6 mt-1">Tổ chuyên môn</div>
                </div>
                <div className="w-3/5 text-center">
                  <h1 className="text-xl font-bold uppercase tracking-tight mb-1">Phiếu Học Tập</h1>
                  <div className="text-[11pt] italic">Môn: .......................................</div>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[11pt] mb-3 px-2">
                <div className="flex w-full items-end">
                  <span className="font-bold whitespace-nowrap mr-2">Họ và tên học sinh:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                  <span className="font-bold whitespace-nowrap mx-2">Lớp:</span>
                  <span className="w-24 border-b border-dotted border-black"></span>
                </div>
                <div className="flex w-full items-end">
                  <span className="font-bold whitespace-nowrap mr-2">Chủ đề bài học:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
              </div>
              <div className="border-b-[1.5px] border-black w-full mt-2"></div>
            </div>
          )}

          {/* Page Indicator */}
          {pages.length > 1 && (
            <div className="absolute top-4 right-6 text-[10px] italic text-slate-600 print:text-black">
              Trang {pageIndex + 1}/{pages.length}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 mt-4">
            {pageQuestions.map((item, index) => (
              <div key={index} className="flex flex-col break-inside-avoid">
                <div className="flex gap-1.5 items-start">
                  <span className="font-bold text-[11pt] whitespace-nowrap">Câu {pageIndex * questionsPerPage + index + 1}:</span>
                  <div className="flex-1 text-[11pt] leading-snug">
                    <MathText text={item.q} />
                  </div>
                </div>
                <div className="mt-1 pl-12 pr-2">
                  <div className="border-b border-dotted border-black w-full h-5"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer only on last page */}
          {pageIndex === pages.length - 1 && (
            <div className="mt-8 flex justify-between items-start pt-4 px-8">
              <div className="text-center">
                <div className="text-[11pt] font-bold uppercase">Giáo viên ra đề</div>
                <div className="text-[11pt] italic mt-16">(Ký và ghi rõ họ tên)</div>
              </div>
              <div className="text-center">
                <div className="text-[11pt] italic mb-1">Ngày ...... tháng ...... năm 202...</div>
                <div className="text-[11pt] font-bold uppercase">Tổ trưởng chuyên môn</div>
                <div className="text-[11pt] italic mt-12">(Ký và ghi rõ họ tên)</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Matching Cards Component
 */
const MatchingGame = ({ data, mode, cutLineClass, theme = 'classic' }: { data: GameData[], mode: string, cutLineClass: string, theme?: DominoTheme }) => {
  const themeStyles = {
    classic: { card: "bg-white border-slate-900", text: "text-slate-900" },
    neon: { card: "bg-slate-900 border-indigo-500", text: "text-indigo-100" },
    nature: { card: "bg-emerald-50 border-emerald-800", text: "text-emerald-900" },
    luxury: { card: "bg-slate-950 border-amber-500", text: "text-amber-100" }
  };
  const s = themeStyles[theme];

  // For matching, we need to separate Q and A into individual cards
  const cards = React.useMemo(() => {
    const qCards = data.map((d, i) => ({ text: d.q, id: i, type: 'Q' }));
    const aCards = data.map((d, i) => ({ text: d.a, id: i, type: 'A' }));
    return mode === 'student' ? [...qCards, ...aCards].sort(() => Math.random() - 0.5) : [...qCards, ...aCards];
  }, [data, mode]);

  // Split cards into pages (20 cards per page for A4 portrait)
  const itemsPerPage = 20;
  const pages = [];
  for (let i = 0; i < cards.length; i += itemsPerPage) {
    pages.push(cards.slice(i, i + itemsPerPage));
  }

  return (
    <div className="space-y-10">
      {pages.map((pageData, pageIndex) => (
        <div key={pageIndex} className="game-page print:break-after-page min-h-[270mm] flex flex-col p-[15mm]">
          <div className="mb-6 flex justify-between items-end border-b-2 border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Thẻ Ghép Đôi</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                {mode === 'answer' ? 'Phiên bản dành cho Giáo viên' : 'Phiên bản dành cho Học sinh'} - Trang {pageIndex + 1}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase">Tác giả: Thầy Vũ Tiến Lực</div>
              <div className="text-[8px] text-slate-400">Trường THPT Nguyễn Hữu Cảnh</div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 pt-4">
            {pageData.map((card, i) => {
              const globalIndex = pageIndex * itemsPerPage + i;
              return (
                <div key={globalIndex} className={`aspect-square border-[1.5pt] rounded-2xl flex items-center justify-center p-4 text-center relative shadow-sm ${s.card} ${cutLineClass}`}>
                  <div className="absolute top-2 left-2 text-[8px] opacity-30 font-black uppercase">
                    {mode === 'answer' ? `${card.type}#${card.id + 1}` : `Thẻ #${globalIndex + 1}`}
                  </div>
                  <AutoFitText text={card.text} className={`font-bold ${s.text}`} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Tarsia Triangle Piece Component
 */
const TarsiaTrianglePiece = ({ t, s, fontSize, relative = false, shape, showSymbols = false }: any) => {
  let xAdjust = 0;
  let yAdjust = 65;
  if (shape === 'triangle16') xAdjust = 25;
  else if (shape === 'rhombus18') {
    xAdjust = 62.5;
    yAdjust = 43.3;
  }
  else if (shape === 'hexagon24') xAdjust = 25;

  return (
    <div 
      className={`${relative ? 'relative w-full aspect-[1.15/1]' : 'absolute'}`} 
      style={relative ? undefined : { 
        left: `${t.x - xAdjust}mm`, 
        top: `${t.y - yAdjust}mm`, 
        width: '50mm', 
        height: '43.3mm' 
      }}
    >
      <svg viewBox="0 0 100 86.6" className="w-full h-full drop-shadow-sm">
        <polygon 
          points={t.isDown ? "0,0 100,0 50,86.6" : "50,0 0,86.6 100,86.6"} 
          fill={s.bg} 
          stroke={s.border} 
          strokeWidth="1.2"
        />
      </svg>
      <div className="absolute inset-0 pointer-events-none">
        {t.isDown ? (
          <>
            <div className="absolute top-[8%] left-[20%] w-[60%] h-[24%] text-center flex items-center justify-center">
              <div className="flex flex-col items-center">
                {showSymbols && t.topType && <span className="text-[6px] font-black opacity-40 mb-[-2px]">{t.topType === 'q' ? 'H' : 'Đ'}</span>}
                <AutoFitText text={t.top} maxFontSize={fontSize} className={`font-bold leading-[1.1] ${s.text}`} />
              </div>
            </div>
            <div className="absolute top-[35%] left-[10%] w-[40%] h-[24%] rotate-[60deg] text-center flex items-center justify-center">
              <div className="flex flex-col items-center">
                {showSymbols && t.leftType && <span className="text-[6px] font-black opacity-40 mb-[-2px]">{t.leftType === 'q' ? 'H' : 'Đ'}</span>}
                <AutoFitText text={t.left} maxFontSize={fontSize} className={`font-bold leading-[1.1] ${s.text}`} />
              </div>
            </div>
            <div className="absolute top-[35%] right-[10%] w-[40%] h-[24%] -rotate-[60deg] text-center flex items-center justify-center">
              <div className="flex flex-col items-center">
                {showSymbols && t.rightType && <span className="text-[6px] font-black opacity-40 mb-[-2px]">{t.rightType === 'q' ? 'H' : 'Đ'}</span>}
                <AutoFitText text={t.right} maxFontSize={fontSize} className={`font-bold leading-[1.1] ${s.text}`} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="absolute bottom-[8%] left-[20%] w-[60%] h-[24%] text-center flex items-center justify-center">
              <div className="flex flex-col items-center">
                {showSymbols && t.bottomType && <span className="text-[6px] font-black opacity-40 mb-[-2px]">{t.bottomType === 'q' ? 'H' : 'Đ'}</span>}
                <AutoFitText text={t.bottom} maxFontSize={fontSize} className={`font-bold leading-[1.1] ${s.text}`} />
              </div>
            </div>
            <div className="absolute top-[40%] left-[10%] w-[40%] h-[24%] -rotate-[60deg] text-center flex items-center justify-center">
              <div className="flex flex-col items-center">
                {showSymbols && t.leftType && <span className="text-[6px] font-black opacity-40 mb-[-2px]">{t.leftType === 'q' ? 'H' : 'Đ'}</span>}
                <AutoFitText text={t.left} maxFontSize={fontSize} className={`font-bold leading-[1.1] ${s.text}`} />
              </div>
            </div>
            <div className="absolute top-[40%] right-[10%] w-[40%] h-[24%] rotate-[60deg] text-center flex items-center justify-center">
              <div className="flex flex-col items-center">
                {showSymbols && t.rightType && <span className="text-[6px] font-black opacity-40 mb-[-2px]">{t.rightType === 'q' ? 'H' : 'Đ'}</span>}
                <AutoFitText text={t.right} maxFontSize={fontSize} className={`font-bold leading-[1.1] ${s.text}`} />
              </div>
            </div>
          </>
        )}
        <div className={`absolute ${t.isDown ? 'top-2' : 'bottom-2'} left-0 w-full text-center opacity-30 text-[10px] font-black`}>
          #{t.id + 1}
        </div>
      </div>
    </div>
  );
};

const getTarsiaPos = (index: number, shape: string) => {
  let r = 0, c = 0, isDown = false, xOffset = 0;
  if (shape === 'triangle16') {
    if (index < 1) { r = 0; c = index; }
    else if (index < 4) { r = 1; c = index - 1; }
    else if (index < 9) { r = 2; c = index - 4; }
    else { r = 3; c = index - 9; }
    xOffset = -r * 25;
    isDown = c % 2 === 1;
  } else if (shape === 'rhombus18') {
    r = Math.floor(index / 6);
    c = index % 6;
    xOffset = -r * 25;
    isDown = c % 2 === 1;
  } else if (shape === 'hexagon24') {
    if (index < 5) { r = 0; c = index; }
    else if (index < 12) { r = 1; c = index - 5; }
    else if (index < 19) { r = 2; c = index - 12; }
    else { r = 3; c = index - 19; }
    if (r === 0 || r === 3) xOffset = -50;
    else xOffset = -75;
    if (r < 2) isDown = c % 2 === 1;
    else isDown = c % 2 === 0;
  }
  return { x: c * 25 + xOffset, y: r * 43.3, isDown };
};

/**
 * Triangle Domino Component
 */
const TriangleGame = ({ data, mode, cutLineClass, theme = 'classic', fontSize = 16, tarsiaShape = 'line', showSymbols = false }: { data: any[], mode: string, cutLineClass: string, theme?: DominoTheme, fontSize?: number, tarsiaShape?: TarsiaShape, showSymbols?: boolean }) => {
  const themeStyles = {
    classic: { bg: "white", border: "#0f172a", text: "text-slate-900" },
    neon: { bg: "#0f172a", border: "#6366f1", text: "text-indigo-100" },
    nature: { bg: "#ecfdf5", border: "#065f46", text: "text-emerald-900" },
    luxury: { bg: "#020617", border: "#f59e0b", text: "text-amber-100" }
  };
  const s = themeStyles[theme];

  if (tarsiaShape !== 'line') {
    const numTriangles = tarsiaShape === 'triangle16' ? 16 : tarsiaShape === 'rhombus18' ? 18 : 24;
    const edges = tarsiaShape === 'triangle16' ? TARSIA_TRIANGLE_16 : tarsiaShape === 'rhombus18' ? TARSIA_RHOMBUS_18 : TARSIA_HEXAGON_24;
    
    if (data.length < edges.length) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
          <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl border border-red-200">
            <h3 className="font-bold text-lg mb-2">Không đủ dữ liệu</h3>
            <p>Hình xếp <strong>{tarsiaShape}</strong> yêu cầu đúng <strong>{edges.length}</strong> câu hỏi/đáp án.</p>
            <p>Hiện tại bạn chỉ có <strong>{data.length}</strong> câu.</p>
          </div>
        </div>
      );
    }

    // Build triangles
    const triangles = Array.from({ length: numTriangles }, (_, i) => ({
      id: i,
      top: '', bottom: '', left: '', right: '',
      topType: '', bottomType: '', leftType: '', rightType: '',
      ...getTarsiaPos(i, tarsiaShape)
    }));

    edges.forEach((edge, i) => {
      if (i < data.length) {
        triangles[edge.t1][edge.side1] = data[i].q;
        (triangles[edge.t1] as any)[edge.side1 + 'Type'] = 'q';
        triangles[edge.t2][edge.side2] = data[i].a;
        (triangles[edge.t2] as any)[edge.side2 + 'Type'] = 'a';
      }
    });

    if (mode === 'student') {
      const shuffled = [...triangles].sort(() => Math.random() - 0.5);
      const itemsPerPage = 8;
      const pages = [];
      for (let i = 0; i < shuffled.length; i += itemsPerPage) {
        pages.push(shuffled.slice(i, i + itemsPerPage));
      }

      return (
        <div className="space-y-6">
          {pages.map((pageData, pageIndex) => (
            <div key={pageIndex} className="game-page print:break-after-page min-h-[180mm] flex flex-col p-[5mm]">
              <div className="mb-1 flex justify-end border-b border-slate-100 pb-1">
                <div className="text-right leading-tight">
                  <div className="text-[8px] font-black text-slate-400 uppercase">Tác giả: Thầy Vũ Tiến Lực</div>
                  <div className="text-[7px] text-slate-400 italic">Trường THPT Nguyễn Hữu Cảnh</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-6 gap-x-6 pt-8 px-8">
                {pageData.map((t, i) => (
                  <div key={i} className="flex justify-center items-center">
                    <TarsiaTrianglePiece t={t} s={s} fontSize={fontSize} relative shape={tarsiaShape} showSymbols={showSymbols} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="game-page print:break-after-page min-h-[180mm] flex flex-col p-[5mm]">
        <div className="mb-1 flex justify-end border-b border-slate-100 pb-1">
          <div className="text-right leading-tight">
            <div className="text-[8px] font-black text-slate-400 uppercase">Tác giả: Thầy Vũ Tiến Lực</div>
            <div className="text-[7px] text-slate-400 italic">Trường THPT Nguyễn Hữu Cảnh</div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center relative mt-16">
          <div className="relative" style={{ width: 0, height: 0 }}>
            {triangles.map(t => (
              <TarsiaTrianglePiece key={t.id} t={t} s={s} fontSize={fontSize} shape={tarsiaShape} showSymbols={showSymbols} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Split data into pages (8 triangles per page for maximum size)
  const itemsPerPage = 8;
  const pages = [];
  for (let i = 0; i < data.length; i += itemsPerPage) {
    pages.push(data.slice(i, i + itemsPerPage));
  }

  return (
    <div className="space-y-6">
      {pages.map((pageData, pageIndex) => (
        <div key={pageIndex} className="game-page print:break-after-page min-h-[180mm] flex flex-col p-[5mm]">
          <div className="mb-1 flex justify-end border-b border-slate-100 pb-1">
            <div className="text-right leading-tight">
              <div className="text-[8px] font-black text-slate-400 uppercase">Tác giả: Thầy Vũ Tiến Lực</div>
              <div className="text-[7px] text-slate-400 italic">Trường THPT Nguyễn Hữu Cảnh</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            {[0, 1].map(rowIndex => {
              const rowData = pageData.slice(rowIndex * 4, (rowIndex + 1) * 4);
              if (rowData.length === 0) return null;
              
              return (
                <div key={rowIndex} className="flex justify-center">
                  {rowData.map((item, i) => {
                    const globalIndex = pageIndex * itemsPerPage + rowIndex * 4 + i;
                    const isDown = i % 2 === 1;
                    
                    return (
                      <div 
                        key={globalIndex} 
                        className={`relative w-[36%] aspect-[1.15/1] ${i > 0 ? '-ml-[18%]' : ''} ${cutLineClass}`}
                      >
                        <svg viewBox="0 0 100 86.6" className="w-full h-full drop-shadow-sm">
                          <polygon 
                            points={isDown ? "0,0 100,0 50,86.6" : "50,0 0,86.6 100,86.6"} 
                            fill={s.bg} 
                            stroke={s.border} 
                            strokeWidth="1.2"
                          />
                          {/* Dashed lines between triangles as seen in example */}
                          {!isDown && i < rowData.length - 1 && (
                            <line x1="100" y1="86.6" x2="100" y2="0" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
                          )}
                        </svg>
                        
                        {/* Content Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Start Indicator */}
                          {item.originalIndex === 0 && (
                            <div className={`absolute ${isDown ? 'bottom-6' : 'top-6'} left-1/2 -translate-x-1/2 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg animate-bounce z-10`}>
                              <Flag size={12} fill="white" />
                            </div>
                          )}

                          {(() => {
                            const leftLen = item.displayLeft.length;
                            const rightLen = item.displayRight.length;
                            const totalLen = leftLen + rightLen || 1;
                            const leftWidth = Math.max(20, Math.min(60, (leftLen / totalLen) * 80));
                            const rightWidth = 80 - leftWidth;

                            if (isDown) {
                              return (
                                <>
                                  {/* Top-Left side (A) - Parallel to side */}
                                  <div 
                                    className="absolute top-[20%] left-[10%] h-[25%] rotate-[60deg] text-center flex items-center justify-center"
                                    style={{ width: `${leftWidth}%` }}
                                  >
                                    <div className="flex flex-col items-center">
                                      {showSymbols && <span className="text-[6px] font-black opacity-40 mb-[-2px]">Đ</span>}
                                      <AutoFitText 
                                        text={item.displayLeft} 
                                        maxFontSize={fontSize}
                                        className={`font-bold leading-[1.1] ${s.text}`} 
                                      />
                                    </div>
                                  </div>
                                  {/* Top-Right side (Q) - Parallel to side */}
                                  <div 
                                    className="absolute top-[20%] right-[10%] h-[25%] -rotate-[60deg] text-center flex items-center justify-center"
                                    style={{ width: `${rightWidth}%` }}
                                  >
                                    <div className="flex flex-col items-center">
                                      {showSymbols && <span className="text-[6px] font-black opacity-40 mb-[-2px]">H</span>}
                                      <AutoFitText 
                                        text={item.displayRight} 
                                        maxFontSize={fontSize}
                                        className={`font-bold leading-[1.1] ${s.text}`} 
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            } else {
                              return (
                                <>
                                  {/* Bottom-Left side (A) - Parallel to side */}
                                  <div 
                                    className="absolute top-[40%] left-[10%] h-[25%] -rotate-[60deg] text-center flex items-center justify-center"
                                    style={{ width: `${leftWidth}%` }}
                                  >
                                    <div className="flex flex-col items-center">
                                      {showSymbols && <span className="text-[6px] font-black opacity-40 mb-[-2px]">Đ</span>}
                                      <AutoFitText 
                                        text={item.displayLeft} 
                                        maxFontSize={fontSize}
                                        className={`font-bold leading-[1.1] ${s.text}`} 
                                      />
                                    </div>
                                  </div>
                                  {/* Bottom-Right side (Q) - Parallel to side */}
                                  <div 
                                    className="absolute top-[40%] right-[10%] h-[25%] rotate-[60deg] text-center flex items-center justify-center"
                                    style={{ width: `${rightWidth}%` }}
                                  >
                                    <div className="flex flex-col items-center">
                                      {showSymbols && <span className="text-[6px] font-black opacity-40 mb-[-2px]">H</span>}
                                      <AutoFitText 
                                        text={item.displayRight} 
                                        maxFontSize={fontSize}
                                        className={`font-bold leading-[1.1] ${s.text}`} 
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            }
                          })()}
                          
                          {/* ID */}
                          <div className={`absolute ${isDown ? 'top-2' : 'bottom-2'} left-0 w-full text-center opacity-30 text-[10px] font-black`}>
                            #{globalIndex + 1}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Tablecloth Game Component (Kỹ thuật Khăn trải bàn)
 */
const TableclothGame = ({ data, mode }: { data: GameData[], mode: string }) => {
  // Each tablecloth page is for a group of 6
  const groups = [];
  for (let i = 0; i < data.length; i += 6) {
    groups.push(data.slice(i, i + 6));
  }

  return (
    <div className="space-y-10">
      {groups.map((groupData, groupIndex) => (
        <div key={groupIndex} className="game-page print:break-after-page w-[297mm] h-[210mm] bg-white border border-slate-200 relative overflow-hidden mx-auto shadow-xl print:shadow-none">
          {/* Header Info */}
          <div className="absolute top-2 left-0 w-full text-center opacity-20 pointer-events-none">
            <div className="text-[10px] font-black uppercase tracking-widest">Kỹ thuật Khăn trải bàn - Nhóm {groupIndex + 1}</div>
          </div>

          {/* Central Area: Group Consensus */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100mm] h-[70mm] border-2 border-slate-300 rounded-2xl flex flex-col p-4 bg-slate-50/50 z-10">
            <div className="text-center mb-2">
              <h3 className="text-xs font-black uppercase tracking-tighter text-slate-400">Ý kiến chung của nhóm</h3>
              <div className="h-[1px] bg-slate-200 w-1/2 mx-auto mt-1" />
            </div>
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 italic text-[10px] text-center px-4">
              Ghi lại kết quả thảo luận thống nhất của cả nhóm tại đây...
            </div>
          </div>

          {/* 6 Individual Sections - Positioned around the central area */}
          
          {/* Top Edge (2 students) */}
          <TableclothSection 
            data={groupData[0]} 
            index={1} 
            className="absolute top-0 left-[50mm] w-[95mm] h-[65mm] rotate-180"
          />
          <TableclothSection 
            data={groupData[1]} 
            index={2} 
            className="absolute top-0 left-[150mm] w-[95mm] h-[65mm] rotate-180"
          />

          {/* Bottom Edge (2 students) */}
          <TableclothSection 
            data={groupData[2]} 
            index={3} 
            className="absolute bottom-0 left-[50mm] w-[95mm] h-[65mm]"
          />
          <TableclothSection 
            data={groupData[3]} 
            index={4} 
            className="absolute bottom-0 left-[150mm] w-[95mm] h-[65mm]"
          />

          {/* Left Edge (1 student) */}
          <TableclothSection 
            data={groupData[4]} 
            index={5} 
            className="absolute top-1/2 left-[-15mm] w-[95mm] h-[65mm] -translate-y-1/2 rotate-90"
          />

          {/* Right Edge (1 student) */}
          <TableclothSection 
            data={groupData[5]} 
            index={6} 
            className="absolute top-1/2 right-[-15mm] w-[95mm] h-[65mm] -translate-y-1/2 -rotate-90"
          />
        </div>
      ))}
    </div>
  );
};

const TableclothSection = ({ data, index, className }: { data?: GameData, index: number, className: string }) => {
  return (
    <div className={`border border-slate-200 p-3 flex flex-col bg-white ${className}`}>
      <div className="flex justify-between items-center mb-1 border-b border-slate-100 pb-1">
        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Học sinh {index}</span>
        <span className="text-[7px] text-slate-300 font-bold uppercase">Khăn trải bàn</span>
      </div>
      
      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 min-h-[1.5rem] flex items-center justify-center">
          <div className="text-[9px] font-bold text-slate-700 leading-tight text-center">
            <MathText text={data?.q || "Câu hỏi..."} />
          </div>
        </div>
        
        <div className="flex-1 border border-dashed border-slate-200 rounded-lg p-2 relative flex flex-col">
          <span className="absolute top-0.5 left-1.5 text-[7px] font-black text-slate-200 uppercase">Bài làm cá nhân</span>
          <div className="mt-2 space-y-2 flex-1">
            <div className="h-[1px] bg-slate-100 w-full" />
            <div className="h-[1px] bg-slate-100 w-full" />
            <div className="h-[1px] bg-slate-100 w-full" />
            <div className="h-[1px] bg-slate-100 w-full" />
            <div className="h-[1px] bg-slate-100 w-full" />
          </div>
        </div>

        <div className="h-[12mm] border border-slate-100 rounded-lg p-1.5 bg-amber-50/30 relative">
          <span className="absolute top-0.5 left-1.5 text-[6px] font-black text-amber-300 uppercase">Nhận xét của nhóm</span>
          <div className="mt-3 h-[1px] bg-amber-100 w-full" />
        </div>
      </div>
    </div>
  );
};

function LibraryCard({ title, desc, image }: { title: string, desc: string, image: string }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="h-48 overflow-hidden">
        <img src={image} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" alt={title} referrerPolicy="no-referrer" />
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-2 text-slate-800">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function generateAIPrompt({ role, grade, subject, topic, level, count, extra }: any) {
  return `Hãy đóng vai một ${role || 'chuyên gia giáo dục'} giàu kinh nghiệm. Tôi cần bộ dữ liệu chất lượng cao để tạo trò chơi học tập cho học sinh.

Thông tin chi tiết:
- Khối lớp: ${grade || '[Nhập khối lớp]'}
- Môn học: ${subject || '[Nhập môn học]'}
- Chủ đề: ${topic || '[Nhập chủ đề]'}
- Mức độ nhận thức: ${level}
- Số lượng: ${count} cặp câu hỏi - đáp án.
${extra ? `- Yêu cầu bổ sung: ${extra}` : ''}

Yêu cầu về nội dung:
1. Nội dung phải chính xác tuyệt đối về mặt kiến thức sư phạm.
2. Mỗi vế (Câu hỏi/Đáp án) phải ngắn gọn, súc tích (tối đa 15 từ) để vừa khung hình.
3. Nếu là môn Khoa học (Toán, Lý, Hóa), hãy sử dụng mã LaTeX chuẩn và đặt trong dấu $ (Ví dụ: $E=mc^2$).
4. Trình bày kết quả dưới dạng BẢNG (Table) gồm 2 cột: "Vế 1 (Câu hỏi)" và "Vế 2 (Đáp án)".
5. Tránh các câu hỏi quá dài hoặc có nhiều đáp án đúng.

Hãy bắt đầu tạo dữ liệu ngay bây giờ:`;
}
