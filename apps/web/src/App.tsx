import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import TabBar from "./components/TabBar";
import Assets from "./pages/Assets";
import AssetDetail from "./pages/AssetDetail";
import Chat from "./pages/Chat";
import ChatDetail from "./pages/ChatDetail";
import GameHome from "./pages/game/GameHome";
import GameTemplateDetail from "./pages/game/GameTemplateDetail";
import TurtleSoupDetail from "./pages/game/TurtleSoupDetail";
import RoleplayCharacterList from "./pages/game/RoleplayCharacterList";
import RoleplayCharacterDetail from "./pages/game/RoleplayCharacterDetail";
import GeneratedStorySettings from "./pages/game/GeneratedStorySettings";
import RoleplaySetup from "./pages/game/RoleplaySetup";
import UniversalGameChat from "./pages/game/UniversalGameChat";
import UnifiedGameChat from "./pages/game/UnifiedGameChat";
import SocialLogicGame from "./pages/game/SocialLogicGame";
import PuzzleGame from "./pages/game/PuzzleGame";
import GameDetail from "./pages/game/GameDetail";
import CustomStoryBuilder from "./pages/game/CustomStoryBuilder";
import InterrogationRoom from "./pages/game/InterrogationRoom";
import PartyRoom from "./pages/game/PartyRoom";
import GameSummaryScreen from "./pages/game/GameSummaryScreen";
import RoleplayStorylineList from "./pages/game/RoleplayStorylineList";
import StoryPublisher from "./pages/admin/StoryPublisher";
import AssetLibrary from "./pages/admin/AssetLibrary";
import TemplateManager from "./pages/admin/TemplateManager";
import RomanceCharacterManager from "./pages/admin/RomanceCharacterManager";
import TurtleSoupSummary from "./pages/game/TurtleSoupSummary";
import RomanceSocial from "./pages/game/RomanceSocial";
import DetectiveBoard from "./pages/game/DetectiveBoard";
import DetectiveInterrogation from "./pages/game/DetectiveInterrogation";
import GameSummaryDetective from "./pages/game/GameSummaryDetective";
import CircleRoom from "./pages/CircleRoom";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MatchRadar from "./pages/MatchRadar";
import Membership from "./pages/Membership";
import Onboarding from "./pages/Onboarding";
import PatternCrush from "./pages/PatternCrush";
import Privacy from "./pages/Privacy";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import Thoughts from "./pages/Thoughts";
import ThoughtDetail from "./pages/ThoughtDetail";
import CreateTopic from "./pages/CreateTopic";
import VocabCrush from "./pages/VocabCrush";
import VoiceChat from "./pages/VoiceChat";
import StudioDashboard from "./pages/studio/Dashboard";
import ExportCenter from "./pages/studio/ExportCenter";
import MindGraph from "./pages/studio/MindGraph";
import ThoughtWorkspace from "./pages/studio/ThoughtWorkspace";
import VersionDiff from "./pages/studio/VersionDiff";
import { useAuthStore } from "./stores/authStore";

import MatchDetail from "./pages/MatchDetail";
import CircleSummary from "./pages/CircleSummary";
import AiTrioChat from "./pages/AiTrioChat";
import CollectedViewpoint from "./pages/CollectedViewpoint";
import Report from "./pages/Report";
import SoulmateQuestionnaire from "./pages/SoulmateQuestionnaire";
import FollowRead from "./pages/FollowRead";

function AppLayout() {
  const location = useLocation();
  return (
    <div className="app-layout">
      <div className="app-content relative">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
          <Route path="/home" element={<Home />} />
          <Route path="/game" element={<GameHome />} />
          <Route path="/game/template/:id" element={<GameTemplateDetail />} />
          <Route path="/game/turtle-soup/detail/:id" element={<TurtleSoupDetail />} />
          <Route path="/game/roleplay/home" element={<Navigate to="/game/romance-social/characters" replace />} />
          <Route path="/game/roleplay" element={<Navigate to="/game/romance-social/characters" replace />} />
          <Route path="/game/roleplay/storylines" element={<RoleplayStorylineList />} />
          <Route path="/game/roleplay/characters" element={<Navigate to="/game/romance-social/characters" replace />} />
          <Route path="/game/romance-social/characters" element={<RoleplayCharacterList />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/story-publisher" element={<StoryPublisher />} />
            <Route path="/admin/asset-library" element={<AssetLibrary />} />
            <Route path="/admin/templates" element={<TemplateManager />} />
            <Route path="/admin/romance-characters" element={<RomanceCharacterManager />} />
          </Route>
          <Route path="/game/roleplay/character/:id" element={<RoleplayCharacterDetail />} />
          <Route path="/game/roleplay/generated-setting" element={<GeneratedStorySettings />} />
          <Route path="/game/setup/:id" element={<RoleplaySetup />} />
          <Route path="/game/universal/:id" element={<UniversalGameChat />} />
          <Route path="/game/play/:mode/:id" element={<UnifiedGameChat />} />
          <Route path="/game/social-logic/:id" element={<SocialLogicGame />} />
          <Route path="/game/puzzle-logic/:id" element={<PuzzleGame />} />
          <Route path="/game/detail/:id" element={<GameDetail />} />
          <Route path="/game/roleplay-setup" element={<RoleplaySetup />} />
          <Route path="/game/custom-story-builder" element={<CustomStoryBuilder />} />
          <Route path="/game/detective-board" element={<DetectiveBoard />} />
          <Route path="/game/detective-board/:id" element={<DetectiveBoard />} />
          <Route path="/game/detective/interrogation/:id" element={<DetectiveInterrogation />} />
          <Route path="/game/romance-social" element={<RomanceSocial />} />
          <Route path="/game/romance-social/:id" element={<RomanceSocial />} />
          <Route path="/game/detective/summary/:id" element={<GameSummaryDetective />} />
          <Route path="/game/roleplay/chat" element={<Navigate to="/game/romance-social/characters" replace />} />
          <Route path="/game/summary/:mode/:id" element={<GameSummaryScreen />} />
          <Route path="/game/summary/:id" element={<GameSummaryScreen />} />
          <Route path="/game/turtle-soup-summary/:id" element={<TurtleSoupSummary />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:id" element={<ChatDetail />} />
          <Route path="/trio-chat" element={<AiTrioChat />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/patterns" element={<PatternCrush />} />
          <Route path="/vocabulary" element={<VocabCrush />} />
          <Route path="/thoughts" element={<Thoughts />} />
          <Route path="/thoughts/:id" element={<ThoughtDetail />} />
          <Route path="/viewpoint/:id" element={<CollectedViewpoint />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/report" element={<Report />} />
          <Route path="/topics" element={<Navigate to="/home#today-topics" replace />} />
          <Route path="/topics/new" element={<CreateTopic />} />
          <Route path="/circles/:roomId" element={<CircleRoom />} />
          <Route path="/circles/summary/:roomId" element={<CircleSummary />} />
          <Route path="/match" element={<MatchRadar />} />
          <Route path="/match/:id" element={<MatchDetail />} />
          <Route path="/voice" element={<VoiceChat />} />
          <Route path="/follow-read" element={<FollowRead />} />
          <Route path="/soulmate-questionnaire" element={<SoulmateQuestionnaire />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
      <TabBar />
    </div>
  );
}

function StudioLayout() {
  return (
    <Routes>
      <Route path="/studio" element={<StudioDashboard />} />
      <Route path="/studio/workspace" element={<ThoughtWorkspace />} />
      <Route path="/studio/diff" element={<VersionDiff />} />
      <Route path="/studio/mind-graph" element={<MindGraph />} />
      <Route path="/studio/export" element={<ExportCenter />} />
      <Route path="*" element={<Navigate to="/studio" replace />} />
    </Routes>
  );
}

export default function App() {
  const { isLoggedIn, loadUser, loadProfile } = useAuthStore();

  useEffect(() => {
    if (isLoggedIn) {
      loadUser();
      loadProfile();
    }
  }, [isLoggedIn, loadUser, loadProfile]);

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <Routes>
          <Route path="/forgot-password" element={isLoggedIn ? <Navigate to="/home" replace /> : <ForgotPassword />} />
          <Route path="/reset-password" element={isLoggedIn ? <Navigate to="/home" replace /> : <ResetPassword />} />
          <Route path="/login" element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />} />
          <Route path="/register" element={isLoggedIn ? <Navigate to="/home" replace /> : <Register />} />
          <Route element={<PrivateRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/studio/*" element={<div className="studio-shell"><StudioLayout /></div>} />
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </section>
    </main>
  );
}
