import { redirect } from "next/navigation";

export default function Home() {
  // Server-side redirect handled by next.config.ts
  // This is a fallback in case the config redirect doesn't fire
  redirect("/dashboard");
}
