import { useEffect, useState } from "react";
import { ProgressRing } from "@/components/ProjectVisuals";

export function TeamConnectionVisual({
  members,
  average,
  photo,
}: {
  members: { name: string; initials: string; progress: number; index: number }[];
  average: number;
  photo: string;
}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(average);
      return;
    }
    const frame = requestAnimationFrame(() => setValue(average));
    return () => cancelAnimationFrame(frame);
  }, [average]);
  const positions = [
    { left: "50%", top: "2%" },
    { left: "11%", top: "65%" },
    { left: "89%", top: "65%" },
  ];
  return (
    <div
      className="team-connection-visual"
      aria-label="Each teammate contributes to shared project progress"
    >
      <div className="team-connection-halo" />
      <svg className="team-connection-lines" viewBox="0 0 340 320" aria-hidden="true">
        <g className="team-network-grid">
          <path d="M170 63 37 230H303ZM170 63V182L37 230M170 182 303 230" />
        </g>
        {[
          "M170 94V146",
          "M59 230H83Q97 230 111 213L129 201",
          "M281 230H257Q243 230 229 213L211 201",
        ].map((path, index) => (
          <g key={index} className={`connection-tone-${index}`}>
            <path className="team-wire-base" d={path} />
            <path className="team-wire-current" d={path} />
          </g>
        ))}
      </svg>
      <div className="team-connection-core">
        <ProgressRing value={value} size={100} label="Team average progress">
          <strong>{average}%</strong>
          <small>Team average</small>
        </ProgressRing>
        <span className="team-core-pins pins-top" />
        <span className="team-core-pins pins-bottom" />
      </div>
      {members.map((member, index) => (
        <div
          key={member.name}
          className={`team-network-person member-${member.index}`}
          style={positions[index]}
        >
          <span className="team-network-avatar">
            {index === 0 ? <img src={photo} alt="" /> : member.initials}
            <i />
          </span>
          <strong>{member.name.split(" ")[0]}</strong>
          <span className="team-network-percent">{member.progress}%</span>
        </div>
      ))}
      <span className="team-network-caption">ONE PROJECT · CONNECTED EFFORT</span>
    </div>
  );
}
