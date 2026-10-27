import { ArrowDown, ArrowLeft, ArrowRight, Box, CircuitBoard, Cpu, Plus } from "lucide-react";
import { catalogCategories, componentCatalog, type CatalogComponent } from "@/lib/componentCatalog";
import { ComponentPreview } from "./ComponentPreview";
import { CatalogWorkbenchEffects } from "./CatalogWorkbenchEffects";
import { CatalogPartEffect } from "./CatalogPartEffect";
import { useState, type ReactNode } from "react";

const labels = [
  "Control Boards",
  "Sensors",
  "Motors & Actuators",
  "Displays",
  "Electronic Parts",
  "Power Drivers",
  "Wireless",
  "Modules",
];
const representatives = [
  "arduino_uno",
  "hc_sr04",
  "servo_sg90",
  "lcd1602_i2c",
  "led_rgb",
  "l298n",
  "hc05_bluetooth",
  "ldr_module",
];
const descriptions = [
  "The brain behind your next idea.",
  "Let your project sense the world.",
  "Turn a signal into something that moves.",
  "Give your data a place to shine.",
  "Small parts. Essential connections.",
  "Put the right power behind every move.",
  "Make connections beyond the breadboard.",
  "A little less wiring. A little more building.",
];
export function CatalogCategoryShowcase({
  category,
  onCategory,
  previews,
  onDetails,
  onAdd,
  onLab,
  spotlightKey,
  onSpotlight,
  onBrowse,
  actions,
}: {
  category: string;
  onCategory: (category: string) => void;
  previews: Record<string, string>;
  onDetails: (item: CatalogComponent) => void;
  onAdd: (item: CatalogComponent) => void;
  onLab: (item: CatalogComponent) => void;
  spotlightKey: string | null;
  onSpotlight: (item: CatalogComponent) => void;
  onBrowse: () => void;
  actions?: ReactNode;
}) {
  const index = catalogCategories.indexOf(category),
    active = Math.max(0, index);
  const shelf = componentCatalog.filter((part) => part.category === catalogCategories[active]);
  const item =
    shelf.find((part) => part.key === spotlightKey) ??
    componentCatalog.find((part) => part.key === representatives[active])!;
  const count =
    index < 0
      ? componentCatalog.length
      : componentCatalog.filter((part) => part.category === category).length;
  const [direction, setDirection] = useState(1);
  const choose = (next: number) => {
    setDirection(next >= active ? 1 : -1);
    onCategory(catalogCategories[next]!);
  };
  const move = (step: number) => {
    setDirection(step);
    onCategory(catalogCategories[(active + step + labels.length) % labels.length]!);
  };
  const neighbor = (step: number) => {
    const n = (active + step + labels.length) % labels.length;
    return { index: n, item: componentCatalog.find((part) => part.key === representatives[n])! };
  };
  return (
    <section
      className="catalog-category-showcase catalog-showcase-cinematic catalog-workbench"
      data-direction={direction}
      data-category-tone={active}
      aria-label="Explore component categories"
    >
      <div className="category-showcase-top">
        <span>
          <CircuitBoard size={14} /> THE ENGINEER’S WORKBENCH
        </span>
        <div className="catalog-workbench-tools">
          <button aria-pressed={index < 0} onClick={() => onCategory("All")}>
            All components <b>43</b>
          </button>
          {actions}
        </div>
      </div>
      <div className="category-showcase-stage" key={category}>
        <div className="category-showcase-copy">
          <span className="category-showcase-index">
            {String(active + 1).padStart(2, "0")} / 08 — EXPLORE
          </span>
          <h2>
            {index < 0 ? (
              <>
                One part.
                <br />
                <em>Endless possibilities.</em>
              </>
            ) : (
              labels[active]
            )}
          </h2>
          <p>
            {index < 0
              ? "Find the pieces that turn your idea into a working project."
              : descriptions[active]}
          </p>
          <button className="category-browse-button" onClick={onBrowse}>
            Browse {count} components <ArrowDown size={14} />
          </button>
        </div>
        <div
          className="category-showcase-object"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            event.currentTarget.style.setProperty(
              "--sensor-x",
              `${((event.clientX - rect.left) / rect.width) * 100}%`,
            );
            event.currentTarget.style.setProperty(
              "--sensor-y",
              `${((event.clientY - rect.top) / rect.height) * 100}%`,
            );
          }}
        >
          <span className="category-object-word" aria-hidden="true">
            {["CREATE", "SENSE", "MOVE", "SHOW", "BUILD", "DRIVE", "CONNECT", "MAKE"][active]}
          </span>
          <div className="category-object-orbit" />
          <div className="category-stage-floor" />
          <CatalogWorkbenchEffects category={active} partMode />
          <CatalogPartEffect model={item.model} />
          {([-1, 1] as const).map((step) => {
            const next = neighbor(step);
            return (
              <button
                key={step}
                className={`category-neighbor neighbor-${step < 0 ? "previous" : "next"}`}
                aria-label={`Explore ${labels[next.index]}`}
                onClick={() => move(step)}
              >
                {previews[next.item.model] ? (
                  <img src={previews[next.item.model]} alt="" />
                ) : (
                  <Cpu size={32} />
                )}
                <span>{labels[next.index]}</span>
              </button>
            );
          })}
          <div className="category-featured-image" key={item.key}>
            <ComponentPreview model={item.model} showcase demoCategory={active} />
          </div>
          <span className="category-object-caption">
            <i /> {item.voltage ? `${item.voltage}V` : "Circuit dependent"} <span>·</span>{" "}
            {item.def.pins.length} pins
          </span>
          <span className="category-rotate-hint">Drag the part to explore · Motion demo</span>
        </div>
        <div className="category-showcase-detail">
          <span className="category-featured-label">IN THE SPOTLIGHT</span>
          <h3>{item.name}</h3>
          <p>{item.key}</p>
          <button className="category-detail-button" onClick={() => onDetails(item)}>
            View specifications <ArrowRight size={14} />
          </button>
          <div className="category-featured-actions">
            <button onClick={() => onAdd(item)}>
              <Plus size={14} />
              Add to BOM
            </button>
            <button onClick={() => onLab(item)}>
              <Box size={14} />
              Open in 3D Lab
            </button>
          </div>
        </div>
      </div>
      <div className="workbench-parts-shelf">
        <div className="workbench-shelf-label">
          <span>ON YOUR BENCH</span>
          <small>
            Pick a part to bring it to life <ArrowRight size={12} />
          </small>
        </div>
        <div className="workbench-shelf-items" role="group" aria-label="Parts on your workbench">
          {shelf.map((part) => (
            <button
              key={part.key}
              aria-label={`Show ${part.name} on workbench`}
              aria-pressed={part.key === item.key}
              onClick={() => onSpotlight(part)}
            >
              <span>
                {previews[part.model] ? (
                  <img src={previews[part.model]} alt="" />
                ) : (
                  <Cpu size={24} />
                )}
              </span>
              <strong>{part.name}</strong>
              <i />
            </button>
          ))}
        </div>
      </div>
      <div className="category-showcase-bottom">
        <div className="category-showcase-tabs" role="group" aria-label="Explore categories">
          {catalogCategories.map((name, i) => {
            const part = componentCatalog.find((entry) => entry.key === representatives[i])!;
            return (
              <button
                key={name}
                aria-label={`${String(i + 1).padStart(2, "0")} ${labels[i]}`}
                aria-pressed={category === name}
                onClick={() => choose(i)}
              >
                <span className="category-tab-thumbnail">
                  {previews[part.model] ? (
                    <img src={previews[part.model]} alt="" />
                  ) : (
                    <Cpu size={16} />
                  )}
                </span>
                <span>{labels[i]}</span>
              </button>
            );
          })}
        </div>
        <div className="category-showcase-arrows">
          <button aria-label="Previous category" onClick={() => move(-1)}>
            <ArrowLeft size={17} />
          </button>
          <button aria-label="Next category" onClick={() => move(1)}>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
