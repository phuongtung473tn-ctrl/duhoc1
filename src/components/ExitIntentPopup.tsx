import { useEffect, useMemo, useRef, useState } from "react";

import {
  getExitIntentTemplate,
  templateMap,
} from "@/components/exit-intent-templates";
import { useSiteConfig } from "@/lib/use-site-config";

const EXIT_INTENT_SHOWN_KEY = "funnel_exit_intent_shown_v1";

export function ExitIntentPopup() {
  const { config } = useSiteConfig();
  const exitIntent = config.exitIntent;
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const launcherRef = useRef(false);
  const startTimeRef = useRef<number>(performance.now());
  const hasImage = Boolean(exitIntent.showImage && exitIntent.imageUrl);
  const imageOnLeft = exitIntent.imagePosition !== "right";
  const panelStyle = {
    fontFamily: exitIntent.fontFamily || "inherit",
    color: exitIntent.textColor || "#f8fafc",
    background:
      "radial-gradient(circle_at_top, rgba(251,191,36,0.25), transparent 35%), rgba(15,23,42,0.96)",
  } as const;
  const titleStyle = {
    color: exitIntent.titleColor || "#ffffff",
  } as const;
  const descriptionStyle = {
    color: exitIntent.descriptionColor || "#e2e8f0",
  } as const;
  const buttonStyle = {
    background:
      exitIntent.buttonBackground ||
      "linear-gradient(135deg, #c0392b 0%, #fbbf24 100%)",
    color: exitIntent.buttonTextColor || "#ffffff",
  } as const;

  const template = useMemo(
    () => getExitIntentTemplate(exitIntent),
    [exitIntent],
  );

  useEffect(() => {
    if (!exitIntent.enabled) {
      setVisible(false);
      setDismissed(false);
      launcherRef.current = false;
      return;
    }

    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(EXIT_INTENT_SHOWN_KEY) === "1") {
      setDismissed(true);
      return;
    }

    if (
      exitIntent.respectReducedMotion &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const triggerDelayMs = Math.max(0, exitIntent.triggerDelaySec * 1000);
    const minimumTimeMs = Math.max(0, exitIntent.minTimeOnPageSec * 1000);
    const minimumScroll = Math.max(
      0,
      Math.min(100, exitIntent.minScrollPercent),
    );

    // Cache scroll geometry; recompute on resize instead of reading layout
    // (scrollHeight/innerHeight) on every scroll, which forces reflow.
    let cachedMaxScroll =
      document.documentElement.scrollHeight - window.innerHeight || 1;
    const recomputeMaxScroll = () => {
      cachedMaxScroll =
        document.documentElement.scrollHeight - window.innerHeight || 1;
    };
    const getScrollPercent = () => {
      return Math.min(100, (window.scrollY / cachedMaxScroll) * 100);
    };

    const show = (reason: "timeout" | "leave" | "scroll") => {
      if (launcherRef.current || dismissed) return;
      const elapsed = performance.now() - startTimeRef.current;
      const currentScroll = getScrollPercent();
      const shouldWaitForScroll = currentScroll < minimumScroll;
      const allowedOnMobile =
        exitIntent.allowMobile || window.innerWidth >= 768;
      const enoughTime = elapsed >= minimumTimeMs;
      const shouldShowByTime = elapsed >= triggerDelayMs;

      if (!allowedOnMobile || !enoughTime || shouldWaitForScroll) {
        if (reason === "leave" && elapsed >= triggerDelayMs) {
          setVisible(true);
        }
        return;
      }

      if (reason === "timeout" || reason === "leave" || reason === "scroll") {
        if (shouldShowByTime || reason === "leave") {
          launcherRef.current = true;
          window.sessionStorage.setItem(EXIT_INTENT_SHOWN_KEY, "1");
          setVisible(true);
        }
      }
    };

    const timer = window.setTimeout(
      () => show("timeout"),
      triggerDelayMs || 1500,
    );
    const fallbackTimer = window.setTimeout(
      () => {
        if (launcherRef.current || dismissed) return;
        const allowedOnMobile =
          exitIntent.allowMobile || window.innerWidth >= 768;
        if (!allowedOnMobile) return;
        const elapsed = performance.now() - startTimeRef.current;
        if (elapsed < Math.max(minimumTimeMs, 1500)) return;
        launcherRef.current = true;
        window.sessionStorage.setItem(EXIT_INTENT_SHOWN_KEY, "1");
        setVisible(true);
      },
      Math.max(triggerDelayMs, minimumTimeMs, 1500),
    );

    const onMouseLeave = (event: MouseEvent) => {
      const isLeavingViewport =
        event.clientY <= 0 ||
        event.relatedTarget === null ||
        (event.target === document && !event.relatedTarget);
      if (isLeavingViewport) show("leave");
    };
    const onScroll = () => {
      const currentScroll = getScrollPercent();
      if (currentScroll >= minimumScroll) show("scroll");
    };

    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseout", onMouseLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseout", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [dismissed, exitIntent]);

  const positionClass =
    exitIntent.position === "bottom-left"
      ? "left-3 bottom-4 sm:left-6"
      : exitIntent.position === "bottom-right"
        ? "right-3 bottom-4 sm:right-6"
        : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";

  if (!exitIntent.enabled || !visible || dismissed) return null;

  return (
    <>
      <style>{`
        @keyframes exitIntentRise {
          0% { opacity: 0; transform: translateY(24px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        className={`fixed z-50 w-[min(92vw,34rem)] ${positionClass}`}
        role="dialog"
        aria-modal="false"
        aria-live="polite"
      >
        <div
          className="overflow-hidden rounded-[1.8rem] border border-white/15 shadow-[0_30px_90px_rgba(15,23,42,0.42)] backdrop-blur-xl"
          style={{
            ...panelStyle,
            animation:
              "exitIntentRise 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both",
          }}
        >
          <div className="bg-gradient-to-r from-primary via-amber-500 to-[#f59e0b] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white">
            {template.badge}
          </div>

          <div
            className={
              hasImage ? "grid md:grid-cols-[1fr_1.2fr]" : "grid grid-cols-1"
            }
          >
            {hasImage && imageOnLeft && (
              <div className="relative min-h-[220px] overflow-hidden border-b border-white/10 md:border-b-0 md:border-r md:border-white/10">
                <img
                  src={exitIntent.imageUrl}
                  alt={exitIntent.imageAlt || template.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-transparent" />
              </div>
            )}

            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3
                    className="text-lg font-black leading-tight sm:text-xl"
                    style={titleStyle}
                  >
                    {template.title}
                  </h3>
                </div>
                {exitIntent.showCloseButton && (
                  <button
                    type="button"
                    aria-label="Đóng popup"
                    onClick={() => setDismissed(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="text-sm leading-relaxed" style={descriptionStyle}>
                {template.description}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href="#dang-ky"
                  onClick={() => setDismissed(true)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-black shadow-[0_14px_30px_rgba(251,191,36,0.35)] transition duration-200 hover:scale-[1.01] hover:brightness-110"
                  style={buttonStyle}
                >
                  {template.cta}
                </a>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Để sau
                </button>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-300/80">
                Tư vấn 1:1 · Miễn phí · Không bắt buộc mua
              </p>
            </div>

            {hasImage && !imageOnLeft && (
              <div className="relative min-h-[220px] overflow-hidden border-t border-white/10 md:border-l md:border-t-0 md:border-white/10">
                <img
                  src={exitIntent.imageUrl}
                  alt={exitIntent.imageAlt || template.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-slate-950/30 via-transparent to-transparent" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
