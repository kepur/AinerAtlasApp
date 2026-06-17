import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function RoleplayCharacterDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    navigate(`/game/romance-social/${id || "mia"}`, { replace: true });
  }, [id, navigate]);

  return (
    <div className="premium w-full h-full flex items-center justify-center text-sm text-gray-400">
      正在跳转角色对话...
    </div>
  );
}
