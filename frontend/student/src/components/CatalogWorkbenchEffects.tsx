const words = [
  "A little spark. A new idea.",
  "A world worth sensing.",
  "Made to move.",
  "Give your ideas a voice.",
  "Everything starts with a connection.",
  "The power behind the build.",
  "Good ideas travel.",
  "Ready. Set. Build.",
];
const status = [
  "SIGNAL FLOW",
  "SENSOR FIELD",
  "MOTION STUDY",
  "DISPLAY BOOT",
  "CIRCUIT PATH",
  "POWER FLOW",
  "WIRELESS LINK",
  "MODULE CHECK",
];
/** Decorative demonstrations of component roles; no circuit measurements are simulated. */
export function CatalogWorkbenchEffects({
  category,
  partMode = false,
}: {
  category: number;
  partMode?: boolean;
}) {
  return (
    <div className={`workbench-effects workbench-demo-${category}`} aria-hidden="true">
      <svg className="workbench-desk-lines" viewBox="0 0 600 360" fill="none">
        <path d="M35 288H130L178 240H255M565 288H470L422 240H345M75 310H165L200 275H260M525 310H435L400 275H340" />
        <path className="desk-flow" d="M35 288H130L178 240H255M345 240H422L470 288H565" />
        {[35, 75, 525, 565].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 ? 310 : 288} r="4" />
        ))}
      </svg>
      {!partMode && category === 0 && (
        <div className="workbench-controller">
          <i />
          <span>BUILD → THINK → CREATE</span>
          <b />
        </div>
      )}
      {!partMode && category === 1 && (
        <div className="workbench-radar">
          <i />
          <i />
          <i />
          <span className="radar-beam" />
          <b className="radar-target target-one" />
          <b className="radar-target target-two" />
          <span className="radar-pointer" />
        </div>
      )}
      {!partMode && category === 2 && (
        <div className="workbench-motion-dial">
          <i />
          <i />
          <i />
          <b />
          <span>
            0° <em>90°</em> 180°
          </span>
        </div>
      )}
      {!partMode && category === 3 && (
        <div className="workbench-display-signal">
          <i />
          <i />
          <i />
          <span>
            HELLO, BUILDER<span className="display-cursor">_</span>
          </span>
        </div>
      )}
      {!partMode && category === 4 && (
        <div className="workbench-circuit-nodes">
          <i />
          <i />
          <i />
          <i />
          <svg viewBox="0 0 200 100">
            <path d="M10 50H65V15H135V85H65V50H190" />
          </svg>
        </div>
      )}
      {!partMode && category === 5 && (
        <div className="workbench-power">
          <span>IN</span>
          <div>
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span>OUT</span>
          <b>DRIVE / REGULATE / BUILD</b>
        </div>
      )}
      {!partMode && category === 6 && (
        <div className="workbench-wireless">
          <span className="wireless-source" />
          <i />
          <i />
          <i />
          <span className="wireless-destination" />
          <b>CONNECTING IDEAS</b>
        </div>
      )}
      {!partMode && category === 7 && (
        <div className="workbench-module-check">
          <span>
            <i />
            INPUT
          </span>
          <span>
            <i />
            PROCESS
          </span>
          <span>
            <i />
            OUTPUT
          </span>
        </div>
      )}
      {!partMode && (
        <div className="workbench-demo-caption">
          <span>{status[category]}</span>
          <p>{words[category]}</p>
        </div>
      )}
    </div>
  );
}
