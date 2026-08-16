import { useState, useEffect } from "react";
import { api, type ApiError } from "@/api/client";

interface AppSettings {
  allowSelfRegistration: boolean;
  sessionIdleTimeoutMs: number;
  sessionAbsoluteTimeoutMs: number;
  defaultUserRole: string;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ settings: AppSettings }>("/settings")
      .then((data) => {
        setSettings(data.settings);
        setLoading(false);
      })
      .catch((err: ApiError) => {
        setError(err.message ?? "Failed to load settings");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!settings) return <div className="p-6">No settings</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Application Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowSelfRegistration}
                readOnly
              />
              Allow self-registration
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Session idle timeout (ms)
            </label>
            <input
              type="number"
              value={settings.sessionIdleTimeoutMs}
              readOnly
              className="w-full px-3 py-2 border rounded-md bg-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Session absolute timeout (ms)
            </label>
            <input
              type="number"
              value={settings.sessionAbsoluteTimeoutMs}
              readOnly
              className="w-full px-3 py-2 border rounded-md bg-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Default user role
            </label>
            <input
              type="text"
              value={settings.defaultUserRole}
              readOnly
              className="w-full px-3 py-2 border rounded-md bg-muted"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
