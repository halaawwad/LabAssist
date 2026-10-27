import { Cpu, Radio, Zap } from "lucide-react";

export function CatalogCircuitArt() {
  return (
    <div className="catalog-circuit-art" aria-hidden="true">
      <div className="catalog-art-board">
        <span className="catalog-art-screw screw-a" />
        <span className="catalog-art-screw screw-b" />
        <span className="catalog-art-screw screw-c" />
        <span className="catalog-art-screw screw-d" />
        <svg viewBox="0 0 230 154">
          <g className="catalog-art-traces">
            <path d="M27 38H64V66H92M117 29V51M138 76H171V35H200M138 90H178V120H204M111 104V128H49V108H28" />
          </g>
          <g className="catalog-art-signals">
            <path d="M27 38H64V66H92M117 29V51M138 76H171V35H200M138 90H178V120H204M111 104V128H49V108H28" />
          </g>
        </svg>
        <span className="catalog-art-chip">
          <i />
          <Cpu size={30} />
          <small>BUILD</small>
        </span>
        <span className="catalog-art-module module-radio">
          <Radio size={18} />
        </span>
        <span className="catalog-art-module module-power">
          <Zap size={17} />
        </span>
        <span className="catalog-art-resistor">
          <i />
          <i />
          <i />
        </span>
        <span className="catalog-art-led" />
        <span className="catalog-art-capacitor" />
        <span className="catalog-art-label">IDEAS START HERE</span>
      </div>
      <div className="catalog-art-tag">
        <span />
        <strong>Choose. Connect. Create.</strong>
      </div>
    </div>
  );
}
