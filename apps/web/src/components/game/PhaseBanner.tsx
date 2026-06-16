import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type PhaseBannerProps = {
  phase: "night" | "day";
  message: string;
  subMessage?: string;
  onComplete?: () => void;
};

export default function PhaseBanner({ phase, message, subMessage, onComplete }: PhaseBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) setTimeout(onComplete, 500); // Wait for fade out
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const isNight = phase === "night";

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'} ${isNight ? 'bg-[#050510]/95' : 'bg-[#fffbeb]/95'}`}
    >
      <div className={`p-6 rounded-full mb-6 ${isNight ? 'bg-[#7c5cff]/20 text-[#7c5cff] shadow-[0_0_50px_rgba(124,92,255,0.4)]' : 'bg-orange-500/20 text-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.4)]'}`}>
        {isNight ? <Moon size={64} /> : <Sun size={64} />}
      </div>
      
      <h2 className={`text-3xl font-bold mb-2 tracking-wide ${isNight ? 'text-white' : 'text-[#1a1140]'}`}>
        {message}
      </h2>
      
      {subMessage && (
        <p className={`text-sm ${isNight ? 'text-white/60' : 'text-[#1a1140]/60'}`}>
          {subMessage}
        </p>
      )}
    </div>
  );
}
