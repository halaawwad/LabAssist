import { Cpu } from "lucide-react";

type BrandProps = {
  /** The login keeps its original container-unit and mobile sizing verbatim. */
  login?: boolean;
  size?: number;
  tone?: "olive" | "white";
  iconOnly?: boolean;
};

/** Noor's login mark: Inter 750, normal tracking, 1.45em chip and .35em gap. */
export function LabAssistBrand({ login = false, size = 20, tone = "olive", iconOnly = false }: BrandProps) {
  if (login) return <><span><Cpu size={25} /></span>LabAssist</>;

  return (
    <span
      dir="ltr"
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        gap: "0.35em",
        margin: 0,
        color: tone === "white" ? "#fbfcf5" : "#35452b",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: size,
        fontWeight: 750,
        fontStyle: "normal",
        lineHeight: 1.5,
        letterSpacing: "normal",
        textTransform: "none",
        whiteSpace: "nowrap",
      }}
    >
      <Cpu aria-hidden="true" strokeWidth={1.5} style={{ width: "1.45em", height: "1.45em", flexShrink: 0 }} />
      {!iconOnly && "LabAssist"}
    </span>
  );
}
