import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type RealtimeDialogueStatus = {
  enabled: boolean;
  manual_enabled: boolean;
  reason: string;
  message: string;
  provider?: string;
};

export function useRealtimeDialogueAvailability() {
  const [status, setStatus] = useState<RealtimeDialogueStatus | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ realtime_dialogue: RealtimeDialogueStatus }>("/api/config/features")
      .then((data) => {
        if (active) setStatus(data.realtime_dialogue);
      })
      .catch(() => {
        if (active) {
          setStatus({
            enabled: false,
            manual_enabled: false,
            reason: "status_unavailable",
            message: "实时语音状态暂时不可用。",
          });
        }
      });
    return () => { active = false; };
  }, []);

  return {
    realtimeDialogueEnabled: status?.enabled === true,
    featureStatusLoading: status === null,
    realtimeDialogueStatus: status,
  };
}
