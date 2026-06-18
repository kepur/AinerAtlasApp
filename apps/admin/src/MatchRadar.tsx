import React, { useEffect, useState } from "react";
import { Activity, User as UserIcon, Calendar, MessageCircle, FileText, Sparkles, Zap, Users } from "lucide-react";

interface AiTags {
  age_group: string;
  mbti: string;
  personality_type: string;
  hobbies: string[];
  interests: string[];
  match_tags: string[];
  label: string;
  tags_display: string[];
  analyzed_at: string | null;
  has_analysis: boolean;
}

interface MatchHistoryItem {
  id: string;
  target_user_id: string;
  target_email: string;
  target_username: string;
  score: number;
  status: string;
  created_at: string;
}

interface MatchUser {
  id: string;
  email: string;
  username: string;
  has_match_profile: boolean;
  birthday: string | null;
  ai_tags: AiTags;
  match_count: number;
  match_history: MatchHistoryItem[];
}

interface MatchRadarProps {
  token: string;
  apiGet: <T>(path: string, token: string) => Promise<T>;
  apiPost: <T>(path: string, token: string, body?: unknown) => Promise<T>;
}

function TagPills({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-muted">—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {tags.map((t) => (
        <span key={t} className="status-badge active" style={{ fontSize: "0.75rem" }}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function MatchRadar({ token, apiGet, apiPost }: MatchRadarProps) {
  const [users, setUsers] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"analyze" | "match" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<MatchUser | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState("Profile");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await apiGet<MatchUser[]>("/api/admin/match-radar/users", token);
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserDetail(userId: string) {
    setLoading(true);
    try {
      const [detailData, analysisData, matchesData] = await Promise.all([
        apiGet<any>(`/api/admin/match-radar/users/${userId}`, token),
        apiGet<any[]>(`/api/admin/match-radar/users/${userId}/analysis`, token),
        apiGet<MatchHistoryItem[]>(`/api/admin/match-radar/users/${userId}/matches`, token),
      ]);
      setUserDetail(detailData);
      setAnalysis(analysisData);
      setMatches(matchesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalyze(user: MatchUser) {
    setBusyUserId(user.id);
    setBusyAction("analyze");
    setMessage(null);
    try {
      const res = await apiPost<{ ai_tags: AiTags; summary: string }>(
        `/api/admin/match-radar/users/${user.id}/analyze`,
        token
      );
      setMessage(`${user.email} AI 分析完成`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ai_tags: res.ai_tags } : u))
      );
      if (selectedUser?.id === user.id) {
        await loadUserDetail(user.id);
      }
    } catch (e: any) {
      setMessage(e?.message || "AI 分析失败");
    } finally {
      setBusyUserId(null);
      setBusyAction(null);
    }
  }

  async function runMatch(user: MatchUser) {
    setBusyUserId(user.id);
    setBusyAction("match");
    setMessage(null);
    try {
      const res = await apiPost<{ message: string; match_history: MatchHistoryItem[] }>(
        `/api/admin/match-radar/users/${user.id}/match`,
        token
      );
      setMessage(res.message);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, match_count: res.match_history.length, match_history: res.match_history.slice(0, 3) }
            : u
        )
      );
      if (selectedUser?.id === user.id) {
        setMatches(res.match_history);
      }
    } catch (e: any) {
      setMessage(e?.message || "一键匹配失败");
    } finally {
      setBusyUserId(null);
      setBusyAction(null);
    }
  }

  if (selectedUser) {
    const tags = userDetail?.ai_tags as AiTags | undefined;
    return (
      <div className="module-card fade-in">
        <div className="card-header">
          <h2>用户雷达详情: {selectedUser.username || selectedUser.email}</h2>
          <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
            返回列表
          </button>
        </div>

        <div className="tabs" style={{ display: "flex", gap: "1rem", borderBottom: "1px solid #333", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          {["Profile", "Conversations", "Topics", "Analysis", "Matches"].map((tab) => (
            <button
              key={tab}
              className={`btn ${activeTab === tab ? "btn-primary" : "btn-text"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : (
          <div className="tab-content" style={{ minHeight: "300px" }}>
            {activeTab === "Profile" && userDetail && (
              <div className="info-grid">
                <div className="info-item">
                  <span className="label"><UserIcon size={16} /> Email</span>
                  <span>{userDetail.user.email}</span>
                </div>
                <div className="info-item">
                  <span className="label"><Calendar size={16} /> 生日</span>
                  <span>{userDetail.match_profile?.birthday || userDetail.user.profile?.birthday || "未填写"}</span>
                </div>
                <div className="info-item">
                  <span className="label">年龄段</span>
                  <span>{tags?.age_group || "—"}</span>
                </div>
                <div className="info-item">
                  <span className="label">MBTI</span>
                  <span>{tags?.mbti || "—"}</span>
                </div>
                <div className="info-item">
                  <span className="label">人格类型</span>
                  <span>{tags?.personality_type || "—"}</span>
                </div>
                <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="label">AI 标签</span>
                  <TagPills tags={tags?.match_tags || []} />
                </div>
                <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="label">爱好</span>
                  <TagPills tags={tags?.hobbies || []} />
                </div>
                <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="label">Bio</span>
                  <p>{userDetail.match_profile?.bio || "未填写"}</p>
                </div>
                <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="label">兴趣</span>
                  <TagPills tags={tags?.interests?.length ? tags.interests : userDetail.match_profile?.interests || []} />
                </div>
              </div>
            )}

            {activeTab === "Conversations" && userDetail && (
              <ul className="list-group">
                {userDetail.conversations.length === 0 && <p>暂无对话记录</p>}
                {userDetail.conversations.map((c: any) => (
                  <li key={c.id} className="list-item">
                    <MessageCircle size={16} /> <strong>{c.title}</strong> - {c.topic} ({new Date(c.updated_at).toLocaleString()})
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "Topics" && userDetail && (
              <ul className="list-group">
                {userDetail.topics.length === 0 && <p>暂无发帖记录</p>}
                {userDetail.topics.map((t: any) => (
                  <li key={t.id} className="list-item">
                    <FileText size={16} /> <strong>{t.title}</strong> ({new Date(t.created_at).toLocaleString()})
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "Analysis" && (
              <div className="analysis-section">
                {analysis.length === 0 && <p>暂无分析报告。可点击「AI 分析」或等待定时任务。</p>}
                {analysis.map((a: any) => (
                  <div key={a.id} className="card variant-card mb-md">
                    <div className="card-header">
                      <h3><Activity size={16} /> {a.report_type} Report - Score: {a.match_score}</h3>
                      <span className="timestamp">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <p>{a.summary}</p>
                    <pre style={{ background: "#111", padding: "1rem", borderRadius: "4px", marginTop: "0.5rem" }}>
                      {JSON.stringify(a.details, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Matches" && (
              <ul className="list-group">
                {matches.length === 0 && <p>暂无匹配记录。</p>}
                {matches.map((m) => (
                  <li key={m.id} className="list-item">
                    <Sparkles size={16} />{" "}
                    <strong>{m.target_email}</strong> ({m.target_username || "—"}) — 相似度 {m.score}
                    <span className="status-badge" style={{ marginLeft: 8 }}>{m.status}</span>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9em", color: "#999" }}>
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="fade-in">
      <div className="page-header">
        <h2>匹配雷达 (Match Radar)</h2>
        <button className="btn btn-primary" onClick={loadUsers} disabled={loading}>
          <Activity size={18} /> {loading ? "刷新中..." : "刷新列表"}
        </button>
      </div>

      {message && (
        <p className="hint" style={{ marginBottom: 12, color: "#8bc34a" }}>
          {message}
        </p>
      )}

      <div className="table-wrapper module-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>用户名</th>
              <th>生日</th>
              <th>AI 标签</th>
              <th>匹配档案</th>
              <th>匹配历史</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isBusy = busyUserId === u.id;
              const tagLine = u.ai_tags?.label || (u.ai_tags?.has_analysis ? "已分析" : "未分析");
              const extraTags = [
                ...(u.ai_tags?.match_tags?.slice(0, 4) || []),
                ...(u.ai_tags?.hobbies?.slice(0, 2) || []),
              ];
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.username || "-"}</td>
                  <td>{u.birthday || "-"}</td>
                  <td style={{ minWidth: 180 }}>
                    <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>{tagLine}</div>
                    <TagPills tags={extraTags} />
                  </td>
                  <td>
                    <span className={`status-badge ${u.has_match_profile ? "active" : "inactive"}`}>
                      {u.has_match_profile ? "已完善" : "未建立"}
                    </span>
                  </td>
                  <td style={{ minWidth: 140 }}>
                    {u.match_count === 0 ? (
                      <span className="text-muted">暂无</span>
                    ) : (
                      <div style={{ fontSize: "0.85rem" }}>
                        <Users size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        {u.match_count} 次
                        {u.match_history?.length > 0 && (
                          <div style={{ color: "#999", marginTop: 4 }}>
                            {u.match_history.map((m) => m.target_email).join("、")}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={isBusy}
                        onClick={() => runAnalyze(u)}
                        title="一键 AI 分析"
                      >
                        <Zap size={14} />
                        {isBusy && busyAction === "analyze" ? "分析中..." : "AI 分析"}
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        disabled={isBusy}
                        onClick={() => runMatch(u)}
                        title="从数据库随机匹配一个相似用户"
                      >
                        <Sparkles size={14} />
                        {isBusy && busyAction === "match" ? "匹配中..." : "一键匹配"}
                      </button>
                      <button
                        className="btn btn-sm btn-text"
                        onClick={() => {
                          setSelectedUser(u);
                          loadUserDetail(u.id);
                        }}
                      >
                        详情
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="empty-state">
                  暂无匹配会员数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
