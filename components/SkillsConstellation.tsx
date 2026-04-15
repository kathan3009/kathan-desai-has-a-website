"use client";

import { useState } from "react";

type SkillsByCategory = Record<string, { name: string; icon?: string }[]>;

const CATEGORY_RADIUS = 180;
const SKILL_RADIUS = 70;

function polarToXY(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

export default function SkillsConstellation({ byCategory }: { byCategory: SkillsByCategory }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = Object.entries(byCategory);
  if (categories.length === 0) return null;

  const cx = 400;
  const cy = 400;
  const viewBox = "0 0 800 800";

  const categoryAngleStep = 360 / categories.length;

  return (
    <div className="w-full flex justify-center">
      <svg
        viewBox={viewBox}
        className="w-full max-w-2xl aspect-square"
        onMouseLeave={() => setActiveCategory(null)}
      >
        {/* Connecting rings */}
        <circle
          cx={cx}
          cy={cy}
          r={CATEGORY_RADIUS}
          fill="none"
          stroke="rgba(184,115,51,0.08)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />

        {categories.map(([category, skills], catIdx) => {
          const catAngle = catIdx * categoryAngleStep;
          const catPos = polarToXY(cx, cy, CATEGORY_RADIUS, catAngle);
          const isActive = activeCategory === category;
          const isDimmed = activeCategory !== null && !isActive;

          const skillAngleSpread = Math.min(360 / categories.length - 8, skills.length * 28);
          const skillAngleStart = catAngle - skillAngleSpread / 2;
          const skillStep = skills.length > 1 ? skillAngleSpread / (skills.length - 1) : 0;

          return (
            <g
              key={category}
              className="transition-opacity duration-300"
              style={{ opacity: isDimmed ? 0.2 : 1 }}
              onMouseEnter={() => setActiveCategory(category)}
            >
              {/* Line from center to category */}
              <line
                x1={cx}
                y1={cy}
                x2={catPos.x}
                y2={catPos.y}
                stroke="rgba(184,115,51,0.12)"
                strokeWidth="1"
              />

              {/* Skill nodes */}
              {skills.map((skill, skillIdx) => {
                const skillAngle = skills.length === 1
                  ? catAngle
                  : skillAngleStart + skillIdx * skillStep;
                const skillPos = polarToXY(catPos.x, catPos.y, SKILL_RADIUS, skillAngle);

                return (
                  <g key={skill.name}>
                    <line
                      x1={catPos.x}
                      y1={catPos.y}
                      x2={skillPos.x}
                      y2={skillPos.y}
                      stroke={isActive ? "rgba(184,115,51,0.3)" : "rgba(184,115,51,0.1)"}
                      strokeWidth="0.75"
                      className="transition-all duration-300"
                    />
                    <circle
                      cx={skillPos.x}
                      cy={skillPos.y}
                      r={isActive ? 4 : 3}
                      fill={isActive ? "rgba(184,115,51,0.6)" : "rgba(184,115,51,0.2)"}
                      className="transition-all duration-300"
                    />
                    <text
                      x={skillPos.x}
                      y={skillPos.y + 14}
                      textAnchor="middle"
                      className="transition-all duration-300"
                      style={{
                        fontSize: isActive ? "10px" : "9px",
                        fill: isActive ? "var(--foreground)" : "var(--muted)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {skill.name}
                    </text>
                  </g>
                );
              })}

              {/* Category node */}
              <circle
                cx={catPos.x}
                cy={catPos.y}
                r={isActive ? 24 : 20}
                fill={isActive ? "rgba(184,115,51,0.18)" : "rgba(184,115,51,0.08)"}
                stroke={isActive ? "rgba(184,115,51,0.6)" : "rgba(184,115,51,0.2)"}
                strokeWidth="1.5"
                className="transition-all duration-300 cursor-pointer"
              />
              <text
                x={catPos.x}
                y={catPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="transition-all duration-300 cursor-pointer pointer-events-none"
                style={{
                  fontSize: isActive ? "10px" : "9px",
                  fontWeight: 600,
                  fill: isActive ? "var(--accent)" : "var(--foreground)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {category.length > 10 ? category.slice(0, 9) + "..." : category}
              </text>
            </g>
          );
        })}

        {/* Center node */}
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="rgba(184,115,51,0.15)"
          stroke="rgba(184,115,51,0.3)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
