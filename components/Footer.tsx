export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border mt-16 sm:mt-24 bg-background shrink-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-muted text-sm">© {new Date().getFullYear()} Kathan Desai. Founder of bugbase.</p>
        <div className="flex gap-6">
          <a href="https://x.com/kathandesai3009" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent text-sm transition-colors">X</a>
          <a href="https://github.com/kathan3009" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent text-sm transition-colors">GitHub</a>
          <a href="https://www.linkedin.com/in/kathandesai1/" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent text-sm transition-colors">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
