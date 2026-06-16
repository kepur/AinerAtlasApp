import { ReactNode } from "react";

export default function StoryFeed({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full px-4 pt-4 pb-32 overflow-y-auto no-scrollbar flex flex-col gap-4 bg-[#f7f9fb]">
      {children}
    </div>
  );
}
