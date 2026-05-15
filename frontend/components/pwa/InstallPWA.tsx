"use client";

// Botão de instalação do PWA + fallback com instruções manuais por plataforma.
//
// Funciona em 3 cenários:
//  1. Chrome/Edge/Android (com HTTPS) — captura beforeinstallprompt e dispara
//     o prompt nativo quando o usuário clica.
//  2. iOS Safari — não tem API de instalação; mostra modal explicando
//     "Compartilhar → Adicionar à Tela de Início".
//  3. Outros (Chrome em HTTP, navegadores sem suporte) — mostra modal genérico.
//
// O botão só aparece quando NÃO está rodando como app instalado
// (display-mode: standalone). Pode ser dispensado por sessão.

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android-chrome" | "ios-safari" | "desktop" | "unknown";

const DISMISS_KEY = "uppertruck:install-dismissed";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios-safari";
  if (/Android/i.test(ua)) return "android-chrome";
  if (/Win|Mac|Linux/i.test(ua)) return "desktop";
  return "unknown";
}

export default function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPlatform(detectPlatform());

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS legacy
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    if (window.localStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignora */
    }
  };

  const install = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
      } catch {
        /* usuário cancelou */
      }
      setDeferred(null);
    } else {
      setShowHelp(true);
    }
  };

  return (
    <>
      {!dismissed && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={install}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Download size={14} /> Instalar app
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dispensar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {showHelp && (
        <InstallHelpModal
          platform={platform}
          onClose={() => setShowHelp(false)}
        />
      )}
    </>
  );
}

function InstallHelpModal({
  platform,
  onClose,
}: {
  platform: Platform;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-gray-700" />
            <h2 className="text-base font-bold text-gray-900">
              Instalar UpperTruck
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </header>

        <div className="px-5 py-4 text-sm text-gray-700">
          {platform === "ios-safari" ? (
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  1
                </span>
                <span>
                  Toque no ícone{" "}
                  <Share2 size={14} className="inline align-text-bottom text-blue-600" />{" "}
                  <strong>Compartilhar</strong> na barra inferior do Safari.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  2
                </span>
                <span>
                  Role para baixo e toque em{" "}
                  <strong>Adicionar à Tela de Início</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  3
                </span>
                <span>
                  Confirme em <strong>Adicionar</strong>. O app aparecerá na sua
                  tela de início.
                </span>
              </li>
            </ol>
          ) : platform === "android-chrome" ? (
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  1
                </span>
                <span>
                  Toque no menu <strong>⋮</strong> (canto superior direito do Chrome).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  2
                </span>
                <span>
                  Toque em <strong>Instalar app</strong> ou{" "}
                  <strong>Adicionar à tela inicial</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  3
                </span>
                <span>Confirme em <strong>Instalar</strong>.</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  1
                </span>
                <span>
                  No Chrome ou Edge, clique no ícone <strong>⊕</strong> ou{" "}
                  <strong>monitor</strong> que aparece na barra de endereço.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  2
                </span>
                <span>
                  Ou abra o menu <strong>⋮</strong> →{" "}
                  <strong>Instalar UpperTruck</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                  3
                </span>
                <span>Confirme em <strong>Instalar</strong>.</span>
              </li>
            </ol>
          )}

          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            <strong>Dica:</strong> em alguns navegadores o botão de instalar só
            aparece em sites com HTTPS. Se o site estiver em HTTP, use as
            instruções manuais acima.
          </p>
        </div>

        <footer className="border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Entendi
          </button>
        </footer>
      </div>
    </div>
  );
}
