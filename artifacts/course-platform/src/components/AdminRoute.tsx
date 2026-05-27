import { Redirect } from "wouter";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  component: React.ComponentType;
}

export default function AdminRoute({ component: Component }: AdminRouteProps) {
  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canAccess = user?.role === "admin" || user?.role === "mentor" || user?.role === "editor";
  if (isError || !canAccess) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}
