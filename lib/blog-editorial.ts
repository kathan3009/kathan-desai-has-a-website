// Editorial defaults for the existing archive. Admin fields take precedence.
// Keep these descriptions factual; the visible article titles remain unchanged.
export const BLOG_EDITORIAL: Record<string, { title: string; description: string; summary?: string; related: string[] }> = {
  "photoshop-mcp-let-your-agent-work-in-photoshop": {
    title: "Photoshop MCP: Let Your Agent Work in Photoshop",
    description: "Build notes for Photoshop MCP: connect a coding agent to Photoshop on your Mac, edit photos through MCP tools, and install the open-source server locally.",
    related: ["adding-mcp-access-to-pentest-copilot-oss", "video-studio-agentic-video-production-pipeline"],
  },
  "pentest-copilot-automating-mssql-server-exploitation-through-impersonation-and-trusted-links": {
    title: "MSSQL Impersonation and Trusted Links in the GOAD Lab",
    description: "A GOAD lab walkthrough of MSSQL impersonation and trusted links, showing how Pentest Copilot validates access and chains database permissions.",
    related: ["understanding-ntds-dumping-from-first-principles-sam-versus-ntds-and-dcsync", "pentest-copilot-vs-goad"],
  },
  "how-to-get-your-first-customer": {
    title: "How to Get Your First Customer",
    description: "Lessons from finding early customers: choose a specific buyer, build trust through conversations, and do the work that comes before scalable marketing.",
    related: ["inde-indian-craft-global-luxury-concept", "what-i-built-pentest-copilot-enterprise"],
  },
  "understanding-ntds-dumping-from-first-principles-sam-versus-ntds-and-dcsync": {
    title: "NTDS Dumping: SAM, NTDS.dit, and DCSync Explained",
    description: "Understand SAM versus NTDS.dit, how DCSync uses Active Directory replication, and what an NTDS dump exposes, with examples from the GOAD lab.",
    related: ["pentest-copilot-automating-mssql-server-exploitation-through-impersonation-and-trusted-links", "pentest-copilot-enterprise-vs-goad-from-discovery-to-domain-compromise"],
  },
  "pentest-copilot-vs-goad": {
    title: "Pentest Copilot vs GOAD: Attack Chains and Evidence",
    description: "Results from a Pentest Copilot Enterprise run against GOAD: Kerberos, AD CS, MSSQL, trust abuse, verified findings, and the limits of the assessment.",
    related: ["pentest-copilot-enterprise-vs-goad-from-discovery-to-domain-compromise", "understanding-ntds-dumping-from-first-principles-sam-versus-ntds-and-dcsync"],
  },
  "pentest-copilot-enterprise-vs-goad-from-discovery-to-domain-compromise": {
    title: "GOAD Walkthrough: Discovery to Domain Compromise",
    description: "Follow Pentest Copilot Enterprise through the GOAD lab, from host discovery and credential validation to attack paths across three Active Directory domains.",
    related: ["pentest-copilot-vs-goad", "what-i-built-pentest-copilot-enterprise"],
  },
  "building-sentinel-semantic-browser-runtime": {
    title: "Sentinel: Browser Tasks AI Agents Can Prove",
    description: "How Sentinel gives browser agents stable targets, permission checks, compact state updates, and evidence that a requested action actually succeeded.",
    related: ["how-id-hand-a-complex-feature-to-a-coding-agent", "swanlink-coordination-fabric-for-ai-agents"],
  },
  "videomemory-searchable-memory-for-ai-agents": {
    title: "VideoMemory: Find the Useful Moment in a Long Video",
    description: "Build notes for VideoMemory, a local video retrieval pipeline that answers a question with timestamps, transcript windows, and selected visual evidence.",
    related: ["why-i-think-everyone-getting-into-ai-should-build-a-small-ml-project", "video-studio-agentic-video-production-pipeline"],
  },
  "video-studio-agentic-video-production-pipeline": {
    title: "Video Studio: From Rough Capture to Finished Video",
    description: "How Video Studio connects script planning, screen capture, transcript-based editing, captions, audio, and delivery checks in a local production pipeline.",
    related: ["videomemory-searchable-memory-for-ai-agents", "photoshop-mcp-let-your-agent-work-in-photoshop"],
  },
  "swanlink-coordination-fabric-for-ai-agents": {
    title: "Swanlink: Coordinating Work Across AI Agents",
    description: "Build notes for Swanlink: explicit task ownership, acknowledgements, expiring leases, evidence-based handoffs, and recovery across AI agent sessions.",
    related: ["how-id-hand-a-complex-feature-to-a-coding-agent", "building-sentinel-semantic-browser-runtime"],
  },
  "inde-indian-craft-global-luxury-concept": {
    title: "Inde: Indian Craft and a Luxury Product Journey",
    description: "A design concept exploring Indian textile traditions through collection stories, contemporary garments, editorial design, and made-to-order consultations.",
    related: ["how-to-get-your-first-customer"],
  },
  "adding-mcp-access-to-pentest-copilot-oss": {
    title: "Pentest Copilot OSS: MCP Access for Authorized Testing",
    description: "How Pentest Copilot OSS connects local MCP clients to an engagement-aware workspace for supervised security tools, scope, evidence, and findings.",
    related: ["photoshop-mcp-let-your-agent-work-in-photoshop", "what-i-built-pentest-copilot-enterprise"],
  },
  "what-i-built-pentest-copilot-enterprise": {
    title: "Building Pentest Copilot Enterprise",
    description: "My work on Pentest Copilot Enterprise: multi-cloud attack paths, tool routing, evidence contracts, reversible execution, and scheduled assessments.",
    related: ["pentest-copilot-vs-goad", "adding-mcp-access-to-pentest-copilot-oss"],
  },
  "why-i-think-everyone-getting-into-ai-should-build-a-small-ml-project": {
    title: "Why Building a Small ML Project Helps You Understand AI",
    description: "Build a small image classifier to understand training data, overfitting, evaluation, and transfer learning before deciding which AI tool fits a problem.",
    summary: "Training a small image classifier makes data quality, overfitting, and evaluation concrete. This essay walks through what that teaches you, where transfer learning helps, and when an LLM is the better tool.",
    related: ["videomemory-searchable-memory-for-ai-agents", "how-id-hand-a-complex-feature-to-a-coding-agent"],
  },
  "how-id-hand-a-complex-feature-to-a-coding-agent": {
    title: "How to Hand a Complex Feature to a Coding Agent",
    description: "Use a state machine, a dependency graph, and a task ledger to give a coding agent room to build while keeping permissions, tests, and handoffs explicit.",
    summary: "I’d give the agent three things: a state machine for valid behavior, a task graph for dependencies, and a ledger of completed work and evidence. Here’s how I’d use them to build organization roles and permissions across sessions.",
    related: ["building-sentinel-semantic-browser-runtime", "swanlink-coordination-fabric-for-ai-agents"],
  },
};
