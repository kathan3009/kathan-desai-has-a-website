import '@/components/projects/projects.css';
import Link from 'next/link';
import {projectHref,projectStatusLabels,type PublicProject} from '@/lib/projects';

const tone=(project:PublicProject)=>{const name=project.name.toLowerCase();return name.includes('pentest copilot')&&!name.includes('oss')?'tile-dark':name==='bugbase'?'tile-tint':'';};

export default function ProjectIndex({items}:{items:PublicProject[]}){const featured=items.slice(0,2);const experiments=items.slice(2);let i=0;return <>
  <section className="bento project-featured-grid" aria-label="Featured work">{featured.map(project=><Link href={projectHref(project)} className={`tile project-featured span-2 ${tone(project)} rise`} key={project.id} style={{'--i':i++} as React.CSSProperties}><small>{projectStatusLabels[project.status]||project.status}</small><div><h2>{project.name}</h2><p>{project.description}</p><span className="tile-link">View the work ›</span></div></Link>)}</section>
  {experiments.length>0&&<section aria-labelledby="experiments-title" className="project-experiments"><h2 id="experiments-title">Experiments and tools</h2><p>Smaller builds, open questions, and useful detours.</p><div className="bento project-grid">{experiments.map(project=><Link href={projectHref(project)} className="tile project-item rise" key={project.id} style={{'--i':i++} as React.CSSProperties}><small>{projectStatusLabels[project.status]||project.status}</small><div><h3>{project.name}</h3><p>{project.description}</p>{project.techStack.length>0&&<span className="project-stack">{project.techStack.slice(0,4).join(', ')}</span>}</div></Link>)}</div></section>}
  {items.length===0&&<p className="page-description">No projects published yet.</p>}
</>}
