import Link from "next/link";
import { MediaBlock } from "@/components/MediaBlock";

type ProjectCardProps = {
  item: {
    _id?: { toString: () => string };
    name: string;
    description: string;
    techStack?: string[];
    repoUrl?: string;
    liveUrl?: string;
    image?: string;
    status?: "active" | "in-development" | "production" | "beta" | "prototype" | "concept" | "archived";
  };
  className?: string;
};

export function ProjectCard({ item, className = "" }: ProjectCardProps) {
  const href = item.liveUrl || item.repoUrl || "#";
  const hasMedia = !!item.image;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`card block p-4 overflow-hidden hover:border-accent/30 transition-colors ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-foreground font-medium">{item.name}</p>
        {item.status && (
          <span
            className={`project-status shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyles[item.status]}`}
          >
            {statusLabels[item.status]}
          </span>
        )}
      </div>
      <div className="rounded-md overflow-hidden w-full h-28 mb-4 bg-card">
        {hasMedia ? (
          <MediaBlock image={item.image} alt={item.name} variant="project-card" className="w-full h-full" />
        ) : (
          <div className="w-full h-full media-project-card flex items-center justify-center" />
        )}
      </div>
      <p className="text-muted text-sm line-clamp-3">{item.description}</p>
      {item.techStack && item.techStack.length > 0 && (
        <p className="text-muted text-xs mt-3 font-mono">{item.techStack.join(", ")}</p>
      )}
    </Link>
  );
}

const statusLabels = {
  active: "Active",
  "in-development": "In development",
  production: "Production",
  beta: "Beta",
  prototype: "Prototype",
  concept: "Concept",
  archived: "Archived",
} as const;

const statusStyles = {
  active: "project-status-active",
  "in-development": "project-status-development",
  production: "project-status-production",
  beta: "project-status-beta",
  prototype: "project-status-prototype",
  concept: "project-status-concept",
  archived: "project-status-archived",
} as const;
