import { useEffect, useRef, useState } from 'react';
import { GripHorizontal } from 'lucide-react';

const STORAGE_KEY = 'rotaMapHeight';
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 900;
const DEFAULT_HEIGHT = 380;

export default function ResizableMapWrapper({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_HEIGHT;
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || '', 10);
    return Number.isFinite(v) && v >= MIN_HEIGHT && v <= MAX_HEIGHT ? v : DEFAULT_HEIGHT;
  });
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(height));
  }, [height]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const delta = y - startYRef.current;
      const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHRef.current + delta));
      setHeight(next);
    };
    const onUp = () => { draggingRef.current = false; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const startDrag = (clientY: number) => {
    draggingRef.current = true;
    startYRef.current = clientY;
    startHRef.current = height;
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="relative">
      <div style={{ height }} className="relative rounded-xl overflow-hidden">
        {children}
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Redimensionar mapa"
        onMouseDown={(e) => startDrag(e.clientY)}
        onTouchStart={(e) => startDrag(e.touches[0].clientY)}
        className="h-3 -mt-1 cursor-row-resize flex items-center justify-center group select-none"
      >
        <div className="w-16 h-1.5 rounded-full bg-border group-hover:bg-primary transition-colors flex items-center justify-center">
          <GripHorizontal className="h-3 w-3 text-muted-foreground group-hover:text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}
