import { useState } from "react";
import UniversalStatusBar from "../../components/game/universal/UniversalStatusBar";
import LearningHUD from "../../components/game/universal/LearningHUD";
import TurnSelector from "../../components/game/universal/TurnSelector";
import StoryFeed from "../../components/game/universal/StoryFeed";
import NarratorMessage from "../../components/game/universal/NarratorMessage";
import CharacterMessage from "../../components/game/universal/CharacterMessage";
import UserGameMessage from "../../components/game/universal/UserGameMessage";
import ClueCard from "../../components/game/universal/ClueCard";
import AdaptiveInputBar from "../../components/game/universal/AdaptiveInputBar";

export default function UniversalGameChat() {
  const [activeTurn, setActiveTurn] = useState("T3");
  
  const turns = [
    { id: "T1", label: "T1 开场" },
    { id: "T2", label: "T2 保持距离" },
    { id: "T3", label: "T3 质问" },
  ];

  return (
    <div className="w-full h-screen bg-[#f7f9fb] flex flex-col relative overflow-hidden">
      <UniversalStatusBar />
      <LearningHUD />
      <TurnSelector turns={turns} activeTurnId={activeTurn} />
      
      <StoryFeed>
        <NarratorMessage text="夜色渐深，风吹过后山的竹林。小师妹忽然追了上来。" />
        <CharacterMessage 
          name="小师妹"
          avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuC7H5IaItFs9IvhQ7dC66eIQTdsOgfBiW_TuNQKLgKAOarXopyy5IEohZ62o5FUkXDGr7l1JhCNVxadiO6FuzbGqOrenDZskk0WWMB-kWGiZCGbU9zEfERZnm6f2Jqbsz-8ZdkwgKSF8zMeGiuWOx3k5gT0g6q00ocL1D0pq55SUaTYn-HZcX2IwwPDWAsh_ku9NUi7ed50_3li5FMxlfdxsx0EXvU0VVuP40-BRkvl-WzD59R4BBYQfCnNjOfF98Aw8w0Qg0nN8Nzh"
          text="师兄，你最近为什么总是避着我？"
          englishText="Senior brother, why have you been avoiding me lately?"
          relationshipChange={-5}
        />
        <UserGameMessage 
          text="我觉得我们还是保持一点距离比较好。"
          turnId="T2"
        />
        <NarratorMessage text="小师妹愣了一下，眼神中闪过一丝受伤的神色。" />
        <CharacterMessage 
          name="小师妹"
          avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuC7H5IaItFs9IvhQ7dC66eIQTdsOgfBiW_TuNQKLgKAOarXopyy5IEohZ62o5FUkXDGr7l1JhCNVxadiO6FuzbGqOrenDZskk0WWMB-kWGiZCGbU9zEfERZnm6f2Jqbsz-8ZdkwgKSF8zMeGiuWOx3k5gT0g6q00ocL1D0pq55SUaTYn-HZcX2IwwPDWAsh_ku9NUi7ed50_3li5FMxlfdxsx0EXvU0VVuP40-BRkvl-WzD59R4BBYQfCnNjOfF98Aw8w0Qg0nN8Nzh"
          text="保持距离？我们从小一起长大，你以前从来不会这么跟我说话！"
          englishText="Keep some distance? We grew up together, you never used to speak to me like this!"
          relationshipChange={-10}
        />
        <ClueCard 
          title="异常的反应"
          desc="小师妹似乎并没有表现出背叛者的心虚，而是纯粹的委屈。"
        />
      </StoryFeed>

      <AdaptiveInputBar 
        mode="choice"
        choices={[
          { label: "冷漠回应 (Cold response)", action: "A" },
          { label: "礼貌保持距离 (Politely keep distance)", action: "B" },
          { label: "直接质问 (Directly question)", action: "C" },
          { label: "假装没事 (Pretend nothing happened)", action: "D" },
        ]}
      />
    </div>
  );
}
