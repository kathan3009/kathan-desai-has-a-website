import { projectStatusLabels, type PublicProject } from "@/lib/projects";
import "./projects/projects.css";

function BugBaseArtifact() {
  return (
    <div className="artifact-workspace artifact-program" aria-hidden="true">
      <div className="artifact-window-bar"><i /><i /><i /><span>Program workspace</span></div>
      <div className="artifact-dashboard">
        <aside><strong>BB</strong><span className="is-active">Overview</span><span>Reports</span><span>Researchers</span></aside>
        <div className="artifact-dashboard-main">
          <div className="artifact-dashboard-head"><div><small>Security program</small><strong>Report operations</strong></div><span>Live</span></div>
          <div className="artifact-metric-row">
            <div><small>New report</small><strong>Received</strong></div>
            <div><small>Validation</small><strong>In review</strong></div>
            <div><small>Resolution</small><strong>Ready</strong></div>
          </div>
          <div className="artifact-report"><span>BB-2847</span><strong>Authentication boundary</strong><i>Triaged</i></div>
          <div className="artifact-report"><span>BB-2846</span><strong>Access-control review</strong><i>Validating</i></div>
        </div>
      </div>
    </div>
  );
}

function CopilotArtifact() {
  return (
    <div className="artifact-workspace artifact-copilot" aria-hidden="true">
      <div className="artifact-window-bar"><i /><i /><i /><span>Pentest Copilot</span></div>
      <div className="artifact-copilot-main">
        <div className="artifact-run-head"><div><small>Engagement</small><strong>Internal cloud review</strong></div><span>Reasoning</span></div>
        <div className="artifact-path">
          <div><i /><span>External surface</span></div><b>→</b><div><i /><span>Identity role</span></div><b>→</b><div className="is-target"><i /><span>Production data</span></div>
        </div>
        <div className="artifact-evidence">
          <span>Evidence 03</span>
          <div><strong>Attack path confirmed</strong><small>Each step retains its source and proof.</small></div>
          <i>Ready</i>
        </div>
      </div>
    </div>
  );
}

function BuilderArtifact() {
  return (
    <div className="artifact-workspace artifact-builder" aria-hidden="true">
      <div className="artifact-window-bar"><i /><i /><i /><span>Build note</span></div>
      <div className="artifact-builder-main">
        <small>Question</small><strong>Can this be simpler?</strong>
        <div><span>01 Frame the problem</span><span>02 Make the prototype</span><span>03 Test the useful part</span></div>
      </div>
    </div>
  );
}

export default function ProjectArtifact({ project, compact = false }: { project: PublicProject; compact?: boolean }) {
  const value = project.name.toLowerCase();
  const variant = value === "bugbase" ? "bugbase" : value.includes("pentest copilot") ? "copilot" : "builder";
  return (
    <div className={`project-artifact project-artifact-${variant} ${compact ? "project-artifact-compact" : ""}`} aria-label={`${project.name} product interface artifact`}>
      <div className="artifact-top"><span>{project.name}</span><span>{projectStatusLabels[project.status] || project.status}</span></div>
      {variant === "bugbase" ? <BugBaseArtifact /> : variant === "copilot" ? <CopilotArtifact /> : <BuilderArtifact />}
      <p className="artifact-caption">{variant === "bugbase" ? "A single place to move a report from discovery to resolution." : variant === "copilot" ? "Reasoning, attack paths, and evidence kept in one working context." : "A working prototype is the fastest way to sharpen a question."}</p>
    </div>
  );
}
