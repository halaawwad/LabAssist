import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Camera, CircuitBoard, ImagePlus, X } from "lucide-react";

const ProjectImageContext = createContext<{ image: string | null; setImage: (value: string | null) => void } | null>(null);
export function ProjectImageProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<string | null>(null);
  return <ProjectImageContext.Provider value={{ image, setImage }}>{children}</ProjectImageContext.Provider>;
}

export function ProjectMedia() {
  const context = useContext(ProjectImageContext);
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  if (!context) return null;
  const { image, setImage } = context;
  return <div className="project-media">
    <div className={`project-media-frame ${image ? "has-photo" : ""}`}>
      {image ? <img src={image} alt="Your project photo" /> : <div className="project-media-empty"><span className="project-media-orbit orbit-one"/><span className="project-media-orbit orbit-two"/><span className="project-media-camera"><Camera size={18}/></span><span className="project-media-circuit"><CircuitBoard size={24}/></span><ImagePlus size={34}/><strong>Your project, your picture</strong><small>Prototype, sketch, or a work in progress</small></div>}
      {image && <button className="project-media-remove" aria-label="Remove project photo" onClick={() => { setImage(null); setError(""); }}><X size={13}/></button>}
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose project photo" className="sr-only" onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a JPG, PNG or WebP image under 5 MB."); return; }
      setError("");
      const reader = new FileReader();
      reader.onerror = () => setError("This image could not be opened. Try another file.");
      reader.onload = () => {
        const source = String(reader.result);
        const check = new Image();
        check.onload = () => setImage(source);
        check.onerror = () => setError("This image could not be opened. Try another file.");
        check.src = source;
      };
      reader.readAsDataURL(file);
    }}/>
    <button className="project-media-upload" onClick={() => input.current?.click()}><ImagePlus size={13}/>{image ? "Change photo" : "Add project photo"}</button>
    <p className="project-media-note">{error || "Shared across your pages · saved for this session"}</p>
  </div>;
}
