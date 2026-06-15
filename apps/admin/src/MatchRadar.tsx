import React, { useEffect, useState } from "react";
import { Activity, User as UserIcon, Calendar, MessageCircle, FileText, Sparkles } from "lucide-react";

interface MatchUser {
  id: string;
  email: string;
  username: string;
  has_match_profile: boolean;
  birthday: string | null;
}

interface MatchRadarProps {
  token: string;
  apiGet: <T>(path: string, token: string) => Promise<T>;
}

export function MatchRadar({ token, apiGet }: MatchRadarProps) {
  const [users, setUsers] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MatchUser | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
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
        apiGet<any[]>(`/api/admin/match-radar/users/${userId}/matches`, token),
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

  if (selectedUser) {
    return (
      <div className="module-card fade-in">
        <div className="card-header">
          <h2>用户雷达详情: {selectedUser.username || selectedUser.email}</h2>
          <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
            返回列表
          </button>
        </div>
        
        <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          {["Profile", "Conversations", "Topics", "Analysis", "Matches"].map(tab => (
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
          <div className="tab-content" style={{ minHeight: '300px' }}>
            {activeTab === "Profile" && userDetail && (
              <div className="info-grid">
                <div className="info-item">
                  <span className="label"><UserIcon size={16}/> Email</span>
                  <span>{userDetail.user.email}</span>
                </div>
                <div className="info-item">
                  <span className="label"><Calendar size={16}/> 生日</span>
                  <span>{userDetail.match_profile?.birthday || "未填写"}</span>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="label">Bio</span>
                  <p>{userDetail.match_profile?.bio || "未填写"}</p>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="label">兴趣</span>
                  <p>{userDetail.match_profile?.interests?.join(", ") || "无"}</p>
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
                {analysis.length === 0 && <p>暂无分析报告。定时任务未执行或用户数据不足。</p>}
                {analysis.map((a: any) => (
                  <div key={a.id} className="card variant-card mb-md">
                    <div className="card-header">
                      <h3><Activity size={16}/> {a.report_type} Report - Score: {a.match_score}</h3>
                      <span className="timestamp">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <p>{a.summary}</p>
                    <pre style={{ background: '#111', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                      {JSON.stringify(a.details, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Matches" && (
              <ul className="list-group">
                {matches.length === 0 && <p>暂无推荐匹配。</p>}
                {matches.map((m: any) => (
                  <li key={m.id} className="list-item">
                    <Sparkles size={16}/> <strong>Target: {m.target_email}</strong> - Score: {m.score}
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9em', color: '#999' }}>
                      {m.reasons?.join(", ")}
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

      <div className="table-wrapper module-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>用户名</th>
              <th>生日</th>
              <th>匹配档案</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.username || "-"}</td>
                <td>{u.birthday || "-"}</td>
                <td>
                  <span className={`status-badge ${u.has_match_profile ? "active" : "inactive"}`}>
                    {u.has_match_profile ? "已完善" : "未建立"}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setSelectedUser(u);
                      loadUserDetail(u.id);
                    }}
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="empty-state">暂无匹配会员数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
