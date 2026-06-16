export default function NarratorMessage({ text }: { text: string }) {
  return (
    <div className="w-full flex justify-center my-2">
      <div className="px-5 py-3 rounded-2xl bg-[#eceef0] border border-[#e0e3e5] text-sm text-[#464554] italic text-center leading-relaxed shadow-sm max-w-[90%]">
        {text}
      </div>
    </div>
  );
}
