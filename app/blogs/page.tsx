import Link from "next/link";
import type {Metadata} from "next";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import {extractYoutubeId} from "@/lib/youtube";
import {BreadcrumbListSchema} from "@/components/schema/BreadcrumbList";
import {MediaBlock} from "@/components/MediaBlock";
import {postDate,readingMinutes} from "@/components/reading/post-utils";
import styles from "@/components/reading/reading.module.css";

export const metadata:Metadata={title:"Writing",description:"Build notes and essays by Kathan Desai.",alternates:{canonical:"/blogs"}};
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{category?:string|string[]}>};
type Post={_id:string;title:string;slug:string;excerpt:string;content:string;publishedAt:Date|string;category:string;featuredImage:string;videoEmbed:string;audioUrl:string;isTopStory:boolean;tags:string[]};
const single=(value:string|string[]|undefined)=>(Array.isArray(value)?value[0]:value)??"";

export default async function BlogPage({searchParams}:Props){
  const category=single((await searchParams).category);
  const conn=await dbConnect();
  const rawPosts=conn?await Blog.find({isDraft:{$ne:true}}).select("_id title slug excerpt content featuredImage videoEmbed audioUrl publishedAt category isTopStory tags").sort({publishedAt:-1}).lean():[];
  const posts:Post[]=rawPosts.map(post=>({_id:String(post._id),title:post.title,slug:post.slug,excerpt:post.excerpt??"",content:post.content??"",publishedAt:post.publishedAt,category:post.category??"",featuredImage:post.featuredImage??"",videoEmbed:post.videoEmbed??"",audioUrl:post.audioUrl??"",isTopStory:!!post.isTopStory,tags:post.tags??[]}));
  const categories=[...new Set(posts.map(post=>post.category).filter(Boolean))].sort();
  const filtered=category?posts.filter(post=>post.category===category):posts;
  const featured=filtered.find(post=>post.isTopStory)??filtered[0];
  const remaining=filtered.filter(post=>post._id!==featured?._id);

  return <div className={`${styles.surface} ${styles.index}`}>
    <BreadcrumbListSchema items={[{name:"Home",url:"/"},{name:"Writing",url:"/blogs"}]}/>
    <div className={styles.indexInner}>
      <header className={styles.indexHeader}><p className={styles.eyebrow}>Notes and essays</p><h1>Writing</h1><p>I write when an idea needs more room than a conversation.</p></header>
      <div className={styles.writingControls}><p>{filtered.length} {filtered.length===1?"essay":"essays"}</p>{categories.length>0&&<details className={styles.topicPicker}><summary>Topic: {category||"Everything"}</summary><nav aria-label="Writing topics"><Link href="/blogs" aria-current={!category?"page":undefined}>Everything</Link>{categories.map(item=><Link key={item} href={`/blogs?category=${encodeURIComponent(item)}`} aria-current={category===item?"page":undefined}>{item}</Link>)}</nav></details>}</div>
      {featured&&<PostItem post={featured} featured/>}
      {remaining.length>0&&<section className={styles.archive} aria-labelledby="archive-title"><h2 id="archive-title">More writing</h2>{remaining.map(post=><PostItem key={post._id} post={post}/>)}</section>}
      {filtered.length===0&&<div className={styles.empty}><h2>No essays in this topic yet.</h2><Link href="/blogs">See all writing</Link></div>}
    </div>
  </div>;
}

function PostItem({post,featured=false}:{post:Post;featured?:boolean}){const date=postDate(post.publishedAt);const hasMedia=!!(post.featuredImage||post.videoEmbed||extractYoutubeId(post.content));return <article className={featured?styles.featuredPost:styles.post}>
  <div className={styles.postCopy}><div className={styles.postMeta}>{featured&&<span>Featured</span>}{post.category&&<span>{post.category}</span>}</div><h2><Link href={`/blogs/${encodeURIComponent(post.slug)}`} prefetch={false}>{post.title}</Link></h2>{post.excerpt&&<p className={styles.excerpt}>{post.excerpt}</p>}<div className={styles.postMeta}>{date&&<time dateTime={date.iso}>{date.label}</time>}<span>{readingMinutes(post.content)} min read</span>{post.audioUrl&&<span>Audio</span>}</div></div>
  {featured&&hasMedia&&<Link href={`/blogs/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.postMedia} aria-label={`Read ${post.title}`} tabIndex={-1}><MediaBlock image={post.featuredImage} videoEmbed={post.videoEmbed} content={post.content} alt="" variant="blog-banner" className="w-full h-full" prioritizeVideo priority/></Link>}
</article>}
