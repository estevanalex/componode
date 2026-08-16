import { useState, useEffect } from "react";
import { api, type ApiError } from "@/api/client";

interface User {
  id: string;
  username: string;
  role: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ users: User[] }>("/users")
      .then((data) => {
        setUsers(data.users);
        setLoading(false);
      })
      .catch((err: ApiError) => {
        setError(err.message ?? "Failed to load users");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-4">Username</th>
            <th className="text-left py-2 px-4">Role</th>
            <th className="text-left py-2 px-4">Display Name</th>
            <th className="text-left py-2 px-4">Email</th>
            <th className="text-left py-2 px-4">Status</th>
            <th className="text-left py-2 px-4">Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="py-2 px-4">{user.username}</td>
              <td className="py-2 px-4">{user.role}</td>
              <td className="py-2 px-4">{user.displayName ?? "—"}</td>
              <td className="py-2 px-4">{user.email ?? "—"}</td>
              <td className="py-2 px-4">
                {user.isActive ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-muted-foreground">Inactive</span>
                )}
              </td>
              <td className="py-2 px-4">{new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
