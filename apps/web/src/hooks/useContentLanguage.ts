import { useLocation } from "react-router-dom";
import { useChatStore } from "../stores/chatStore";
import { useGameStore } from "../stores/gameStore";
import { useLearningLanguageStore } from "../stores/learningLanguageStore";

/** Historical content retains its language; new content follows the global setting. */
export function useContentLanguage() {
  const { pathname } = useLocation();
  const language = useLearningLanguageStore(s => s.language);
  const conversation = useChatStore(s => s.currentConversation);
  const session = useGameStore(s => s.currentSession);
  if (conversation && pathname === `/chat/${conversation.id}`) return conversation.target_language;
  if (session && pathname.startsWith("/game/") && pathname.includes(session.id)) return session.target_language;
  return language;
}
