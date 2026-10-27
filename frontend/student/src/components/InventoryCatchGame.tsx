import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  ShoppingCart,
  Zap,
  TriangleAlert,
} from "lucide-react";

const parts = [
  { kind: "board", name: "Controller", price: 25 },
  { kind: "sensor", name: "Sensor", price: 9 },
  { kind: "resistor", name: "Resistor", price: 0.5 },
  { kind: "servo", name: "Servo", price: 8 },
];
type Drop = { id: number; type: number; x: number; y: number; faulty?: boolean };
export function InventoryCatchGame() {
  const [gameOver, setGameOver] = useState(false),
    [running, setRunning] = useState(false),
    [drops, setDrops] = useState<Drop[]>([]),
    [basket, setBasket] = useState<number[]>([]),
    [position, setPosition] = useState(50),
    [flash, setFlash] = useState(false);
  const arena = useRef<HTMLDivElement>(null),
    cart = useRef(50),
    items = useRef<Drop[]>([]),
    spawn = useRef(0),
    serial = useRef(0),
    elapsed = useRef(0),
    flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const move = (value: number) => {
    if (gameOver) return;
    cart.current = Math.max(14, Math.min(86, value));
    setPosition(cart.current);
  };
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const rect = arena.current?.getBoundingClientRect();
      if (!document.hidden && rect && rect.bottom > 0 && rect.top < innerHeight) {
        elapsed.current += delta;
        spawn.current -= delta;
        if (spawn.current <= 0) {
          items.current.push({
            id: serial.current++,
            type: serial.current % parts.length,
            x: 18 + Math.random() * 64,
            y: -12,
            faulty: serial.current % 4 === 0,
          });
          spawn.current = 1.65;
        }
        let hitFault = false;
        const caught: number[] = [];
        items.current = items.current.filter((item) => {
          const before = item.y;
          item.y += delta * 26;
          if (before < 73 && item.y >= 73 && Math.abs(item.x - cart.current) < 15) {
            if (item.faulty) hitFault = true;
            else caught.push(item.type);
            return false;
          }
          return item.y < 108;
        });
        if (hitFault) {
          setGameOver(true);
          setRunning(false);
          setFlash(false);
          setDrops(items.current.map((item) => ({ ...item })));
          return;
        }
        if (caught.length) {
          setBasket((old) => [...old, ...caught]);
          setFlash(true);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash(false), 550);
        }
        setDrops(items.current.map((item) => ({ ...item })));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  const total = basket.reduce((sum, type) => sum + parts[type]!.price, 0);
  const point = (clientX: number) => {
    const rect = arena.current?.getBoundingClientRect();
    if (rect) move(((clientX - rect.left) / rect.width) * 100);
  };
  const reset = () => {
    setRunning(false);
    setGameOver(false);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    items.current = [];
    spawn.current = 0;
    serial.current = 0;
    elapsed.current = 0;
    setDrops([]);
    setBasket([]);
    setFlash(false);
    cart.current = 50;
    setPosition(50);
  };
  return (
    <section className="inventory-catch-game" aria-label="Catch electronic parts mini game">
      <header>
        <span>BUILD YOUR LITTLE BASKET</span>
        <button aria-label="Reset game" onClick={reset}>
          <RotateCcw size={13} />
        </button>
      </header>
      <div className="inventory-game-score">
        <span>
          <b>{basket.length}</b> parts caught
        </span>
        <span>
          ₪{total.toFixed(2)} <small>sample total</small>
        </span>
      </div>
      <div
        ref={arena}
        className={`inventory-game-arena ${running ? "is-playing" : ""}`}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          point(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) point(event.clientX);
        }}
      >
        <div className="inventory-game-rail" />
        <span className="inventory-game-cloud cloud-one" />
        <span className="inventory-game-cloud cloud-two" />
        {!gameOver && !running && !drops.length && (
          <div className="inventory-game-intro">
            <span className="inventory-real-part part-board">
              <i />
              <b />
              <em />
            </span>
            <span className="inventory-price-ticket">
              <small>Controller</small>
              <strong>₪25</strong>
              <em>sample price</em>
            </span>
          </div>
        )}
        {drops.map((drop) => {
          const part = parts[drop.type]!;
          return (
            <div
              className={`inventory-falling-part ${drop.faulty ? "inventory-faulty-part" : ""}`}
              key={drop.id}
              style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
            >
              {drop.faulty ? (
                <>
                  <span className="inventory-broken-chip" aria-hidden="true">
                    <i />
                    <Zap size={22} />
                    <em>✦</em>
                  </span>
                  <span className="inventory-fault-tag">
                    <TriangleAlert size={10} />
                    FAULTY
                  </span>
                </>
              ) : (
                <>
                  <span className={`inventory-real-part part-${part.kind}`} aria-hidden="true">
                    {part.kind === "sensor" ? (
                      <>
                        <i />
                        <i />
                        <b />
                      </>
                    ) : (
                      <>
                        <i />
                        <b />
                        <em />
                      </>
                    )}
                  </span>
                  <span className="inventory-game-price">
                    <small>{part.name}</small>
                    <b>₪{part.price}</b>
                  </span>
                </>
              )}
            </div>
          );
        })}
        <div
          className={`inventory-game-cart ${gameOver ? "has-short-circuit" : ""} ${flash ? "just-caught" : ""}`}
          style={{ left: `${position}%` }}
        >
          <div className="inventory-cart-parts" aria-hidden="true">
            {basket.slice(-5).map((type, index) => (
              <i
                className={`basket-part basket-part-${type}`}
                key={index}
                style={{ rotate: `${index % 2 ? -15 : 12}deg` }}
              />
            ))}
          </div>
          <ShoppingCart size={65} strokeWidth={1.6} />
          {flash && <span className="inventory-catch-spark">+1 ✦</span>}
        </div>
        <div className="inventory-game-ground" />
        {!gameOver && !running && (
          <button className="inventory-game-play" onClick={() => setRunning(true)}>
            <Play size={13} />
            {drops.length ? "Continue" : "Try catching a part"}
          </button>
        )}
        {gameOver && (
          <div className="inventory-game-over" role="status">
            <span>
              <Zap size={23} />
            </span>
            <strong>Short circuit!</strong>
            <p>A faulty part landed in your basket.</p>
            <small>{basket.length} good parts collected · Avoid sparking chips</small>
            <button
              onClick={() => {
                reset();
                setRunning(true);
              }}
            >
              <RotateCcw size={12} />
              Try again
            </button>
          </div>
        )}
      </div>
      <div className="inventory-game-controls">
        <button aria-label="Move basket left" onClick={() => move(cart.current - 12)}>
          <ArrowLeft size={15} />
        </button>
        <input
          type="range"
          min="14"
          max="86"
          value={position}
          aria-label="Basket position"
          onChange={(event) => move(Number(event.target.value))}
        />
        <button aria-label="Move basket right" onClick={() => move(cart.current + 12)}>
          <ArrowRight size={15} />
        </button>
        <button
          aria-label={running ? "Pause game" : "Start game"}
          disabled={gameOver}
          onClick={() => setRunning((value) => !value)}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
      <footer>Catch good parts · Avoid the sparking chip</footer>
    </section>
  );
}
