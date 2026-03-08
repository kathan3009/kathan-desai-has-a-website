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
      <p className="text-foreground font-medium mb-3">{item.name}</p>
      <div className="rounded overflow-hidden w-full h-20 mb-3 bg-card">
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
