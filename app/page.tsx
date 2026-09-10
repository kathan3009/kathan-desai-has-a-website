import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Blog from '@/models/Blog';
import Photo from '@/models/Photo';
import Landing from '@/components/landing/Landing';
import {orderPublicProjects} from '@/lib/projects';
export const dynamic='force-dynamic';
export default async function HomePage(){const conn=await dbConnect();const [projects,posts,photos]=conn?await Promise.all([Project.find().sort({order:1}).lean(),Blog.find({isDraft:{$ne:true}}).sort({publishedAt:-1}).limit(2).select('title slug excerpt publishedAt').lean(),Photo.find().sort({order:1}).limit(3).lean()]):[[],[],[]];const ordered=orderPublicProjects(projects.map(p=>({id:String(p._id),name:String(p.name),description:String(p.description||''),stack:Array.isArray(p.techStack)?p.techStack.map(String):[]})));return <><link rel="preload" as="image" href="/images/dusk-4k.webp" media="(min-width: 761px)"/><link rel="preload" as="image" href="/images/dusk-1920.webp" media="(max-width: 760px)"/><Landing available={!!conn} projects={ordered.filter(p=>p.name.toLowerCase()!=='bugbase').slice(0,2)} posts={posts.map(p=>({slug:String(p.slug),title:String(p.title),excerpt:String(p.excerpt||''),date:new Date(String(p.publishedAt)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}))} photos={photos.map(p=>({id:String(p._id),image:String(p.image),caption:String(p.caption||'')}))}/></>;}
