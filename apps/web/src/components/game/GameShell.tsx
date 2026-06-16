import { ReactNode } from "react";

export default function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="game-dark w-full h-full flex flex-col pt-[calc(env(safe-area-inset-top,44px))] pb-[env(safe-area-inset-bottom,34px)]">
      {/* Background Particles */}
      <div className="game-particle game-particle-1"></div>
      <div className="game-particle game-particle-2"></div>
      
      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col flex-1 h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
