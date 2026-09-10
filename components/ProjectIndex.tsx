import Link from 'next/link';
import ProjectArtifact from '@/components/ProjectArtifact';
import {projectStatusLabels,type PublicProject} from '@/lib/projects';

export default function ProjectIndex({items}:{items:PublicProject[]}){const featured=items.slice(0,2);const experiments=items.slice(2);return <>
  <section className="project-featured-grid" aria-label="Featured work">{featured.map(project=><article className="project-featured" key={project.id}><ProjectArtifact project={project}/><div className="project-featured-copy"><h2><Link href={`/projects/${project.id}`}>{project.name}</Link></h2><p>{project.description}</p><div className="project-meta"><span>{projectStatusLabels[project.status]||project.status}</span><Link href={`/projects/${project.id}`}>View the work ↗</Link></div></div></article>)}</section>
  {experiments.length>0&&<section aria-labelledby="experiments-title"><div className="project-secondary-heading"><h2 id="experiments-title">Experiments and tools</h2><p>Smaller builds, open questions, and useful detours.</p></div><div className="project-index-list">{experiments.map((project,index)=><article className="project-item" key={project.id}><span className="project-number">{String(index+1).padStart(2,'0')}</span><div><h3><Link href={`/projects/${project.id}`}>{project.name}</Link></h3><p>{project.description}</p>{project.techStack.length>0&&<p className="project-stack">{project.techStack.slice(0,5).join(' · ')}</p>}</div><Link className="project-open" href={`/projects/${project.id}`}>Open ↗</Link></article>)}</div></section>}
  {items.length===0&&<p className="page-description">No projects published yet.</p>}
</>}
