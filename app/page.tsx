import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Blog from '@/models/Blog';
import Landing from '@/components/landing/Landing';
import {orderPublicProjects} from '@/lib/projects';
import {FEED_ALTERNATE} from '@/lib/site';
import {randomScene} from '@/lib/scenes';
export const dynamic='force-dynamic';
export const metadata={alternates:{canonical:'/',types:FEED_ALTERNATE}};
export default async function HomePage(){const conn=await dbConnect();const [projects,posts]=conn?await Promise.all([Project.find().sort({order:1}).lean(),Blog.find({isDraft:{$ne:true}}).sort({publishedAt:-1}).limit(1).select('title slug').lean()]):[[],[]];const [product]=orderPublicProjects(projects.map(p=>({id:String(p._id),name:String(p.name),description:String(p.description||''),stack:Array.isArray(p.techStack)?p.techStack.map(String):[]}))).filter(p=>p.name.toLowerCase()!=='bugbase');const [post]=posts;return <Landing product={product?{id:product.id,name:product.name}:null} post={post?{slug:String(post.slug),title:String(post.title)}:null} scene={randomScene()}/>;}
