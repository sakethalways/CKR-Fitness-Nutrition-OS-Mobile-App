import { Redirect } from "expo-router";
import { useAuth } from "@/store/auth";

export default function Index() {
  const user = useAuth((s) => s.user);
  if (!user) return <Redirect href="/login" />;
  return (
    <Redirect
      href={user.role === "admin" ? "/(app)/overview" : "/(app)/clients"}
    />
  );
}
