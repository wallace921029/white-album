import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Settings, Play, Pause, ChevronLeft, ChevronRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert';
import '../App.css';

const API_BASE = 'http://localhost:3000';

interface Photo {
  id: number;
  url: string;
  caption: string;
  sortOrder: number;
  originalName: string | null;
  createdAt: string;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  read: boolean;
}

function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [time, setTime] = useState('');

  const handleMarkAsRead = async (id: number) => {
    try {
      await axios.post(`${API_BASE}/notices/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      setNotices(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notice as read', err);
    }
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      if (lang === 'en') {
        setTime(now.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }));
      } else {
        const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        const weekdayStr = now.toLocaleDateString('zh-CN', { weekday: 'long' });
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        setTime(`${dateStr} ${weekdayStr} ${timeStr}`);
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'zh';
    if (savedLang) setLang(savedLang);
  }, []);

  const handleLangChange = (newLang: 'en' | 'zh') => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const fetchPhotos = () => {
    axios.get(`${API_BASE}/photos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    }).then(res => {
      setPhotos(res.data.photos || []);
    }).catch(err => {
      console.error('Failed to fetch photos', err);
    });
  };

  const fetchNotices = () => {
    axios.get(`${API_BASE}/notices`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    }).then(res => {
      setNotices(res.data.notices || []);
    }).catch(err => {
      console.error('Failed to fetch notices', err);
    });
  };

  useEffect(() => {
    // Fetch photos and start polling every 10 minutes (600000ms)
    fetchPhotos();
    const photoInterval = setInterval(fetchPhotos, 600000);

    // Fetch notices and start polling
    fetchNotices();
    const noticeInterval = setInterval(fetchNotices, 10000);

    return () => {
      clearInterval(photoInterval);
      clearInterval(noticeInterval);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, photos.length]);

  const handleNext = () => {
    if (photos.length === 0) return;
    setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    if (photos.length === 0) return;
    setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  const currentPhoto = photos[currentPhotoIndex] || null;

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center select-none bg-black text-white">
      {/* Global Nav */}
      <nav className="fixed top-0 left-0 w-full z-50 h-[44px] bg-black flex justify-between items-center px-4 md:px-8 text-white text-[12px] tracking-[-0.12px]">
        <div className="flex items-center gap-4">
          <ImageIcon className="w-4 h-4" />
          <span className="font-semibold text-[14px]">White Album</span>
          <span className="opacity-40">|</span>
          <span className="font-medium text-white/90 text-[15px]">{time}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button onClick={() => handleLangChange('en')} className={`hover:opacity-70 transition-opacity ${lang === 'en' ? 'font-semibold' : ''}`}>EN</button>
            <span className="opacity-50">/</span>
            <button onClick={() => handleLangChange('zh')} className={`hover:opacity-70 transition-opacity ${lang === 'zh' ? 'font-semibold' : ''}`}>ZH</button>
          </div>
          <Bell className="w-4 h-4 hover:opacity-70 cursor-pointer transition-opacity" />
          <Settings className="w-4 h-4 hover:opacity-70 cursor-pointer transition-opacity" />
        </div>
      </nav>

      {/* Main Carousel Photo Canvas */}
      <main className="absolute inset-0 z-10 w-full h-full overflow-hidden flex items-center justify-center pt-[44px]">
        <div className="relative w-full h-full overflow-hidden">
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {currentPhoto ? (
              <img
                key={currentPhoto.id}
                alt={currentPhoto.caption || 'Photo'}
                className="w-full h-full object-contain ken-burns transition-transform duration-1000 ease-in-out"
                style={{ filter: "drop-shadow(rgba(0, 0, 0, 0.22) 3px 5px 30px)" }}
                src={currentPhoto.url.startsWith('http') ? currentPhoto.url : `${API_BASE}${currentPhoto.url}`}
              />
            ) : (
              <div className="text-white/50 flex flex-col items-center gap-4">
                <ImageIcon className="w-12 h-12 opacity-50" />
                <p className="text-[17px] font-normal">{lang === 'en' ? 'No photos available' : '暂无照片'}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Notification Panel (Utility Cards) */}
      {(() => {
        const visibleNotices = notices.filter(n => !n.read);
        if (visibleNotices.length === 0) return null;
        return (
          <aside className="absolute top-[68px] right-8 z-[60] w-80 slide-in-right">
            <div className="flex flex-col gap-4">
              {visibleNotices.slice(0, 3).map((notice, idx) => (
                <Alert key={notice.id} className={`bg-card/90 backdrop-blur shadow-lg border-border ${idx > 0 ? 'opacity-90 mt-2' : ''}`}>
                  <AlertTitle className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {notice.pinned && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span>{notice.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-normal ml-3 shrink-0">
                      {new Date(notice.createdAt).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </AlertTitle>
                  <AlertDescription className="text-muted-foreground pr-8">
                    {notice.content}
                  </AlertDescription>
                  <AlertAction>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMarkAsRead(notice.id)}
                    >
                      {lang === 'en' ? 'Read' : '已读'}
                    </Button>
                  </AlertAction>
                </Alert>
              ))}
            </div>
          </aside>
        );
      })()}

      {/* Photo Description (Hero Display) */}
      {currentPhoto && (
        <section className="absolute bottom-12 left-10 z-50 fade-in-text pointer-events-auto" key={`desc-${currentPhoto.id}`}>
          <div className="max-w-[400px] bg-black/40 backdrop-blur-md border border-white/10 rounded-[18px] p-5 flex flex-col gap-1.5">
            <p className="text-[15px] font-medium leading-[1.4] text-white">
              {currentPhoto.caption || (lang === 'en' ? 'No description' : '暂无描述')}
            </p>
            <p className="text-[12px] font-normal text-white/50">
              {new Date(currentPhoto.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}
            </p>
          </div>
        </section>
      )}

      {/* Floating Control Dock (Circular Buttons) */}
      <nav className="absolute bottom-12 right-10 z-50 flex gap-4 items-center">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handlePrev} 
          className="w-[44px] h-[44px] rounded-full border-none bg-[#d2d2d7]/60 text-black hover:bg-[#d2d2d7]/80 active:scale-95 transition-transform shadow-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsPlaying(!isPlaying)} 
          className="w-[44px] h-[44px] rounded-full border-none bg-[#d2d2d7]/60 text-black hover:bg-[#d2d2d7]/80 active:scale-95 transition-transform shadow-none"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleNext} 
          className="w-[44px] h-[44px] rounded-full border-none bg-[#d2d2d7]/60 text-black hover:bg-[#d2d2d7]/80 active:scale-95 transition-transform shadow-none"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </nav>
    </div>
  );
}

export default Gallery;
