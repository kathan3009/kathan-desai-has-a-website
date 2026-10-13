import { AUTHOR, absoluteUrl } from "@/lib/site";
import { projectHref, type PublicProject } from "@/lib/projects";

export function ProjectSchema({ project, description, datePublished }: { project: PublicProject; description: string; datePublished?: string }) {
  const self = absoluteUrl(projectHref(project));
  const schema = {
    "@context": "https://schema.org",
    "@type": project.repoUrl ? "SoftwareSourceCode" : "CreativeWork",
    "@id": self,
    name: project.name,
    description,
    url: self,
    ...(project.liveUrl && { sameAs: project.liveUrl }),
    ...(project.repoUrl && { codeRepository: project.repoUrl }),
    ...(project.image && { image: absoluteUrl(project.image) }),
    ...(project.techStack.length && { keywords: project.techStack.join(", ") }),
    ...(datePublished && { datePublished }),
    author: { "@id": AUTHOR.id },
    creator: { "@id": AUTHOR.id },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
