import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {isValidObjectId} from 'mongoose';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Blog from '@/models/Blog';
import {projectFromDocument,projectStatusLabels} from '@/lib/projects';
import {BreadcrumbListSchema} from '@/components/schema/BreadcrumbList';
import {MarkdownRenderer} from '@/components/MarkdownRenderer';
import ProjectArtifact from '@/components/ProjectArtifact';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
async function getProject(id:string){if(!isValidObjectId(id))return null;const conn=await dbConnect();if(!conn)return null;return Project.findById(id).lean();}
export async function generateMetadata({params}:Props):Promise<Metadata>{const p=await getProject((await params).id);return p?{title:String(p.name),description:String(p.description).slice(0,160),alternates:{canonical:`/projects/${p._id}`}}:{title:'Project not found'};}
export default async function ProjectPage({params}:Props){const raw=await getProject((await params).id);if(!raw)notFound();const p=projectFromDocument(raw);const escaped=p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const stories=await Blog.find({isDraft:{$ne:true},title:{$regex:escaped,$options:'i'}}).select('slug title excerpt').sort({publishedAt:-1}).limit(4).lean();return <><BreadcrumbListSchema items={[{name:'Home',url:'/'},{name:'Projects',url:'/projects'},{name:p.name,url:`/projects/${p.id}`}]}/><article className="page-shell projects-page"><Link className="text-link" href="/projects">← All projects</Link><header style={{marginTop:45}}><p className="page-kicker">{projectStatusLabels[p.status] || p.status}</p><h1>{p.name}</h1><div className="project-links">{p.liveUrl&&<a href={p.liveUrl} target="_blank" rel="noreferrer">Open project ↗</a>}{p.repoUrl&&<a href={p.repoUrl} target="_blank" rel="noreferrer">Source code ↗</a>}</div></header><div className="project-detail-artifact"><ProjectArtifact project={p} compact/></div><div className="project-detail-body"><MarkdownRenderer content={p.description}/></div>{p.techStack.length>0&&<div className="project-detail-meta">Built with {p.techStack.join(' · ')}</div>}{stories.length>0&&<section className="project-detail-story"><h2>The build notes</h2>{stories.map(s=><Link key={String(s._id)} href={`/blogs/${s.slug}`}>{String(s.title)} →</Link>)}</section>}</article></>;}
