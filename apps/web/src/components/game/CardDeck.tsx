export default function CardDeck({ isShuffling }: { isShuffling?: boolean }) {
  return (
    <div className={`relative w-32 h-48 mx-auto ${isShuffling ? 'animate-[game-subtle-pulse_2s_infinite]' : ''}`}>
      {/* Glow behind */}
      <div className={`absolute inset-0 bg-[#7c5cff]/30 blur-2xl rounded-2xl ${isShuffling ? 'animate-pulse' : ''}`}></div>
      
      {/* The Deck Cards */}
      <div className={`absolute inset-0 bg-gradient-to-br from-[#1a1140] to-[#0b0a1f] border-2 border-white/20 rounded-2xl shadow-xl flex items-center justify-center ${isShuffling ? 'translate-x-1 -rotate-2' : ''} transition-all duration-300`}>
        <div className="w-16 h-16 border-2 border-dashed border-[#7c5cff]/50 rounded-full flex items-center justify-center">
          <span className="text-[#7c5cff] text-2xl font-serif">🐺</span>
        </div>
      </div>
      <div className={`absolute inset-0 bg-gradient-to-br from-[#1a1140] to-[#0b0a1f] border-2 border-[#7c5cff]/40 rounded-2xl shadow-xl flex items-center justify-center ${isShuffling ? '-translate-x-2 rotate-3' : 'translate-x-1 translate-y-1'} transition-all duration-300`}>
        <div className="w-16 h-16 border-2 border-dashed border-[#7c5cff]/50 rounded-full flex items-center justify-center">
          <span className="text-[#7c5cff] text-2xl font-serif">🐺</span>
        </div>
      </div>
      <div className={`absolute inset-0 bg-gradient-to-br from-[#1a1140] to-[#0b0a1f] border-2 border-white/20 rounded-2xl shadow-[0_0_30px_rgba(124,92,255,0.3)] flex items-center justify-center ${isShuffling ? 'translate-x-1 -rotate-1' : '-translate-x-1 -translate-y-1'} transition-all duration-300`}>
        <div className="w-16 h-16 border-2 border-dashed border-[#7c5cff] rounded-full flex items-center justify-center bg-[#7c5cff]/10">
          <span className="text-[#7c5cff] text-3xl font-serif">?</span>
        </div>
      </div>
    </div>
  );
}
