import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-4">Page not found</p>
        <Link to="/" className="text-primary hover:underline">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
