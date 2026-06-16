import { ReactNode } from "react";

export default function SpeechFeed({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full px-4 overflow-y-auto no-scrollbar flex flex-col pt-4 pb-[200px]">
      {children}
    </div>
  );
}
