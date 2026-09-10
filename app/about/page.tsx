import Link from "next/link";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";

export const metadata = {
  title: "About",
  description: "Kathan Desai founded BugBase and is building Pentest Copilot Enterprise in San Francisco.",
};

export default function AboutPage() {
  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "About", url: "/about" }]} />
      <article className="page-shell about-story">
        <header>
          <p className="page-kicker">A short version</p>
          <h1>I build things.</h1>
          <p className="about-lede">I am Kathan, founder of BugBase and the person building Pentest Copilot Enterprise.</p>
        </header>

        <div className="about-moments">
          <section>
            <span>01</span>
            <div>
              <h2>It started with four friends.</h2>
              <p>We began BugBase while we were still in college. The idea was simple: make it easier for companies and security researchers to work together, then keep building until it was useful.</p>
            </div>
          </section>
          <section>
            <span>02</span>
            <div>
              <h2>The company became the education.</h2>
              <p>I left college before graduating because BugBase had become the work I wanted to do. It taught me how to make products, earn trust, change my mind, and keep going when the answer was not obvious.</p>
            </div>
          </section>
          <section>
            <span>03</span>
            <div>
              <h2>Now, San Francisco.</h2>
              <p>I am here building Pentest Copilot Enterprise. New Delhi is still home in another sense. Away from the laptop, I write to understand what I am learning and photograph places that make me slow down.</p>
            </div>
          </section>
        </div>

        <footer className="about-next">
          <p>The useful version of my story is in the things themselves.</p>
          <div>
            <Link href="/projects">See the work →</Link>
            <Link href="/blogs">Read the notes →</Link>
            <Link href="/photography">See the photographs →</Link>
          </div>
        </footer>
      </article>
    </>
  );
}
