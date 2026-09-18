import { Navigate } from "react-router-dom";
import { useRealtimeDialogueAvailability } from "../hooks/useFeatureAvailability";
import VoiceChat from "../pages/VoiceChat";

export default function VoiceCoachGate() {
  const { realtimeDialogueEnabled, featureStatusLoading } = useRealtimeDialogueAvailability();
  if (featureStatusLoading) {
    return <div className="min-h-full bg-surface" aria-busy="true" />;
  }
  return realtimeDialogueEnabled ? <VoiceChat /> : <Navigate to="/home" replace />;
}
