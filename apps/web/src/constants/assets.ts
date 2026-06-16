export const COVER_ASSETS: Record<string, string[]> = {
  ancient: [
    "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1542640244-7e672d6cb466?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1522869062366-21804f32a67e?auto=format&fit=crop&q=80&w=600",
  ],
  modern: [
    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&q=80&w=600",
  ],
  cyberpunk: [
    "https://images.unsplash.com/photo-1515630278258-407f66498911?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&q=80&w=600",
  ],
  fantasy: [
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600",
  ],
  default: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=600",
  ]
};

export const AVATAR_ASSETS: Record<string, string[]> = {
  male_modern: [
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&q=80&w=150",
  ],
  female_modern: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
  ],
  male_ancient: [
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=150", 
    "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=150",
  ],
  female_ancient: [
    "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=150",
  ],
  default: [
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150",
  ]
};

export function getRandomAsset(category: Record<string, string[]>, key: string): string {
  const assets = category[key] || category["default"];
  return assets[Math.floor(Math.random() * assets.length)];
}

export function inferCategory(text: string, type: "cover" | "avatar_gender" | "avatar_era"): string {
  const lower = text.toLowerCase();
  
  if (type === "cover") {
    if (lower.includes("修仙") || lower.includes("仙侠") || lower.includes("古代") || lower.includes("武侠")) return "ancient";
    if (lower.includes("赛博") || lower.includes("未来") || lower.includes("科幻")) return "cyberpunk";
    if (lower.includes("魔法") || lower.includes("奇幻") || lower.includes("玄幻")) return "fantasy";
    if (lower.includes("都市") || lower.includes("现代") || lower.includes("职场")) return "modern";
    return "default";
  }
  
  if (type === "avatar_gender") {
    if (lower.includes("女") || lower.includes("她") || lower.includes("姐") || lower.includes("妹")) return "female";
    if (lower.includes("男") || lower.includes("他") || lower.includes("哥") || lower.includes("弟") || lower.includes("师兄") || lower.includes("师尊")) return "male";
    return "female"; 
  }

  if (type === "avatar_era") {
    if (lower.includes("修仙") || lower.includes("仙侠") || lower.includes("古代") || lower.includes("武侠") || lower.includes("仙尊") || lower.includes("师尊")) return "ancient";
    return "modern";
  }

  return "default";
}
