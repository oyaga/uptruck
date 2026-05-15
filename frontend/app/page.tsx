"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const { user, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else router.replace(user.role === "admin" ? "/admin" : "/cotacao");
  }, [ready, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-gray-400">
      <Loader2 size={18} className="animate-spin-slow" />
    </div>
  );
}
