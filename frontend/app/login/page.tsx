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
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--ut-n-50)" }}
    >
      <div
        className="w-full overflow-hidden"
        style={{
          maxWidth: 360,
          background: "var(--ut-bg-elevated)",
          border: "1px solid var(--ut-border)",
          borderRadius: "var(--ut-radius-xl)",
          boxShadow: "var(--ut-shadow-md)",
        }}
      >
        {/* Black header strip */}
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{
            background: "var(--ut-black)",
            borderBottom: "2px solid var(--ut-yellow)",
          }}
        >
          <div
            className="ut-logo-plaque"
            style={{ width: 36, height: 36 }}
          >
            <Truck size={18} color="var(--ut-black)" strokeWidth={2.5} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--ut-font-sans)",
                fontSize: 16,
                fontWeight: 900,
                color: "var(--ut-white)",
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              UpperTruck
            </div>
            <div
              style={{
                fontFamily: "var(--ut-font-sans)",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--ut-yellow)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                lineHeight: 1,
                marginTop: 3,
              }}
            >
              Aprovação de Fretes
            </div>
          </div>
        </div>

        {/* Form area */}
        <div className="px-6 py-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
