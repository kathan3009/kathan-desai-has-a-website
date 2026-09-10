import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import {BreadcrumbListSchema} from '@/components/schema/BreadcrumbList';
import ProjectIndex from '@/components/ProjectIndex';
import {orderPublicProjects,projectFromDocument} from '@/lib/projects';
export const dynamic='force-dynamic';
export const metadata={title:'Projects',description:'AI, cybersecurity, and useful side projects built by Kathan Desai.'};
export default async function ProjectsPage(){const conn=await dbConnect();const items=conn?await Project.find().sort({order:1}).lean():[];return <><BreadcrumbListSchema items={[{name:'Home',url:'/'},{name:'Projects',url:'/projects'}]}/><div className="page-shell projects-page"><header><p className="page-kicker">Selected work</p><h1>Built to be used.</h1><p className="page-description">BugBase is the company. Pentest Copilot is the product I’m focused on now. Everything else is evidence of how I think and build.</p></header>{conn?<ProjectIndex items={orderPublicProjects(items.map(projectFromDocument))}/>:<p className="page-description">Projects are temporarily unavailable. Please try again shortly.</p>}</div></>;}
