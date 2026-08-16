import { useState, useEffect } from "react";
import { api, type ApiError } from "@/api/client";

interface Session {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSessions() {
    try {
      const data = await api<{ sessions: Session[] }>("/sessions");
      setSessions(data.sessions);
      setLoading(false);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load sessions");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleRevoke(id: string) {
    try {
      await api(`/sessions/${id}/revoke`, { method: "POST" });
      loadSessions();
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to revoke session");
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">Active Sessions</h1>
      {error && <p className="text-destructive mb-4">{error}</p>}
      {sessions.length === 0 ? (
        <p className="text-muted-foreground">No active sessions.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-4">Created</th>
              <th className="text-left py-2 px-4">Last Seen</th>
              <th className="text-left py-2 px-4">Expires</th>
              <th className="text-left py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b">
                <td className="py-2 px-4">{new Date(session.createdAt).toLocaleString()}</td>
                <td className="py-2 px-4">{new Date(session.lastSeenAt).toLocaleString()}</td>
                <td className="py-2 px-4">{new Date(session.expiresAt).toLocaleString()}</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleRevoke(session.id)}
                    className="text-destructive hover:underline"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
