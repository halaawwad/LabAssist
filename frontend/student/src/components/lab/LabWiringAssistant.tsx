import { useState } from "react";
import { Check, Languages, RotateCw, X } from "lucide-react";
import {
  translatedWireFit,
  translatedWireName,
  type AssistantLanguage,
  type WireFit,
} from "@/lib/lab/wireCompatibility";
type Target = { x: number; y: number; width: number; height: number; visible: boolean } | null;
export function LabWiringAssistant({
  notice,
  target,
  onClose,
  onUse,
}: {
  notice: WireFit | null;
  target?: Target;
  onClose: () => void;
  onUse: () => void;
}) {
  const [language, setLanguage] = useState<AssistantLanguage>("mixed");
  const [open, setOpen] = useState(false);
  const arabic = language !== "en",
    tip = notice ? translatedWireFit(notice, language) : null;
  const visible = !!notice || open;
  const anchored = !!notice && !!target?.visible;
  const left = anchored ? Math.max(12, Math.min(target!.x + 38, target!.width - 85)) : 0;
  const top = anchored ? Math.max(18, Math.min(target!.y + 20, target!.height - 86)) : 0;
  const below = top < Math.min(290, target?.height ? target.height * 0.5 : 290);
  return (
    <>
      {anchored && (
        <svg className="lab-assistant-pointer" width="100%" height="100%" aria-hidden="true">
          <path
            d={`M ${left + 25} ${top + 32} Q ${left - 12} ${top + 42} ${target!.x} ${target!.y}`}
          />
          <circle cx={target!.x} cy={target!.y} r="11" />
          <circle className="assistant-target-dot" cx={target!.x} cy={target!.y} r="3" />
        </svg>
      )}
      <aside
        style={anchored ? { left, top, right: "auto", bottom: "auto" } : undefined}
        className={`lab-wiring-assistant ${visible ? "assistant-speaking" : ""} ${anchored ? "assistant-at-connection" : ""} ${below ? "assistant-tip-below" : ""} ${left < 290 ? "assistant-tip-right" : ""}`}
        aria-label="Wiring assistant"
      >
        {visible && (
          <section
            dir={arabic ? "rtl" : "ltr"}
            className={notice?.ok ? "assistant-fit-ok" : ""}
            role={notice ? (notice.ok ? "status" : "alert") : undefined}
          >
            <header>
              <span>{arabic ? "مساعد التوصيل" : "Wiring assistant"}</span>
              <button
                aria-label="Close wiring tip"
                onClick={() => {
                  setOpen(false);
                  onClose();
                }}
              >
                <X size={14} />
              </button>
            </header>
            <label className="assistant-language">
              <Languages size={14} />
              <select
                aria-label="Assistant language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as AssistantLanguage)}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="mixed">عربي + English terms</option>
              </select>
            </label>
            <h3>{tip?.title || (arabic ? "خلّينا نشبكها صح" : "Let’s connect it right")}</h3>
            {anchored && !notice?.ok && (
              <div className="assistant-here">
                {arabic
                  ? "المشكلة هون — عند النقطة المحددة"
                  : "The problem is here — at the marked point"}
              </div>
            )}
            <p>
              {tip?.message ||
                (arabic
                  ? "جرّب توصيل قطعتين. بفحص نوع المدخل وطرفَي السلك، وإذا ما بناسبوا بعض بوضّح لك السبب وبقترح النوع المناسب."
                  : "Connect two parts. I’ll check the connector and cable ends, explain a mismatch, and suggest a suitable wire.")}
            </p>
            {tip && (
              <div className="assistant-connection">
                <span dir="auto">{tip.from}</span>
                <i>↓</i>
                <span dir="auto">{tip.to}</span>
              </div>
            )}
            {notice?.suggested && (
              <button className="assistant-wire-suggestion" onClick={onUse}>
                <RotateCw size={12} />
                {arabic ? "استخدم" : "Use"} {translatedWireName(notice.suggested, language)}
              </button>
            )}
            {notice?.ok && (
              <small>
                <Check size={12} />
                {arabic
                  ? "هذا فحص ملاءمة الأطراف. افحص الكهرباء من زر Validate Wiring."
                  : "Connector fit only · Run Validate Wiring for electrical checks."}
              </small>
            )}
          </section>
        )}
        <button
          className="lab-assistant-character"
          aria-label={visible ? "Hide wiring assistant tip" : "Open wiring assistant"}
          aria-expanded={visible}
          onClick={() => {
            if (visible) {
              onClose();
              setOpen(false);
            } else setOpen(true);
          }}
        >
          <span className="assistant-antenna" />
          <span className="assistant-chip-pins pins-left" />
          <span className="assistant-chip-pins pins-right" />
          <span className="assistant-robot-face">
            <i />
            <i />
            <b />
          </span>
          <span className="assistant-arm arm-left" />
          <span className="assistant-arm arm-right" />
          <span className="assistant-foot foot-left" />
          <span className="assistant-foot foot-right" />
          {notice && !notice.ok && <em>!</em>}
        </button>
      </aside>
    </>
  );
}
