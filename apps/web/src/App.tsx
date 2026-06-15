import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import TabBar from "./components/TabBar";
import Assets from "./pages/Assets";
import AssetDetail from "./pages/AssetDetail";
import Chat from "./pages/Chat";
import ChatDetail from "./pages/ChatDetail";
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
import TopicExplore from "./pages/TopicExplore";
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
import CreateTopic from "./pages/CreateTopic";
import CollectedViewpoint from "./pages/CollectedViewpoint";
import Report from "./pages/Report";
import SoulmateQuestionnaire from "./pages/SoulmateQuestionnaire";
import FollowRead from "./pages/FollowRead";

function AppLayout() {
  return (
    <div className="app-layout">
      <div className="app-content">
        <Routes>
          <Route path="/home" element={<Home />} />
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
          <Route path="/topics" element={<TopicExplore />} />
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
