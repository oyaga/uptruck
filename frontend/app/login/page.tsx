"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { useSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready } = useSession();

  useEffect(() => {
    if (ready && user) {
      router.replace(user.role === "admin" ? "/admin" : "/cotacao");
    }
  }, [ready, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900">
            <Truck size={18} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-base font-extrabold text-gray-900">
              UpperTruck
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Aprovação de Fretes
            </div>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
