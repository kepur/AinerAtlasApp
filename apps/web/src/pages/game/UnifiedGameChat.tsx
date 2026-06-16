import { useParams } from "react-router-dom";
import UnifiedHeader from "../../components/game/unified/UnifiedHeader";
import UnifiedTurnSelector from "../../components/game/unified/UnifiedTurnSelector";
import UnifiedLearningHUD from "../../components/game/unified/UnifiedLearningHUD";
import UnifiedMainFeed from "../../components/game/unified/UnifiedMainFeed";
import AdaptiveActionPanel from "../../components/game/unified/AdaptiveActionPanel";

export default function UnifiedGameChat() {
  const { mode } = useParams<{ mode: string }>();

  return (
    <div className="w-full h-screen bg-white flex flex-col relative overflow-hidden">
      <UnifiedHeader mode={mode} />
      <UnifiedTurnSelector mode={mode} />
      <UnifiedLearningHUD mode={mode} />
      <UnifiedMainFeed mode={mode} />
      <AdaptiveActionPanel mode={mode} />
    </div>
  );
}
