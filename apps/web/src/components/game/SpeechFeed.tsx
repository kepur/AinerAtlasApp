import { ReactNode } from "react";

export default function SpeechFeed({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full px-3 overflow-y-auto no-scrollbar flex flex-col pt-2 pb-2 min-h-0">
      {children}
    </div>
  );
}
