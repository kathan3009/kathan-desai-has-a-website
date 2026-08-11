export const portfolioArticles = {
  sentinel: String.raw`> **Status:** In development. Sentinel is a working browser-backed runtime today, with a deliberate path toward deeper Chromium instrumentation.

## The use case: give an agent a browser task it can prove

Imagine asking an AI agent to request temporary access to a workspace. A conventional automation script can locate a button and dispatch a click. That is not enough for an autonomous system.

The agent needs to know which control represents the intended action, whether the form is complete, whether submission is permitted, and whether the resulting page state proves that access was actually granted. If any of those checks fail, “the click succeeded” is the wrong answer.

Sentinel is the runtime layer I am building for that gap. Its job is to turn a live browser or mobile session into a compact, stable, policy-aware environment for an agent.

A typical task looks like this:

1. The operator provides a goal and a permission boundary.
2. Sentinel produces a semantic view of the page instead of sending the whole DOM.
3. The agent chooses a stable target such as a role field or submit action.
4. Sentinel checks readiness and policy before a consequential action.
5. The runtime observes the resulting state and reports whether the intended outcome occurred.

The important product promise is not “an agent can click websites.” It is **an agent can act in a browser with a traceable relationship between intent, action, and observed outcome**.

## How Sentinel is engineered

~~~mermaid
flowchart LR
  G[Agent goal] --> S[Semantic page graph]
  S --> T[Stable target selection]
  T --> P[Policy and readiness gate]
  P --> A[Browser or mobile action]
  A --> O[Outcome observation]
  O --> D[State diff and evidence]
  D --> G
~~~

The current TypeScript runtime drives real Chromium-compatible sessions through Playwright. A separate mobile path uses Appium-compatible sessions. Above those drivers sit the product-specific layers: semantic extraction, stable IDs, action contracts, policy checks, network intelligence, crawl topology, replay, and MCP tools.

### Semantic state instead of raw page noise

The DOM is optimized for rendering, not for agent reasoning. It contains duplicated labels, layout wrappers, framework artifacts, and transient identifiers. Sentinel reduces that surface into interactive and meaningful elements, then assigns stable references that can survive more than one model turn.

Search and best-target helpers operate on that semantic layer. The agent can ask for the control that best matches “temporary security-reviewer role” without binding its plan to a brittle CSS selector.

### Actions are typed contracts

Navigation, typing, selection, upload, and submission are exposed as explicit operations. Higher-level helpers can fill a group of fields or execute a planned workflow, but those helpers still resolve to inspectable steps.

Consequential actions pass through readiness and policy checks. This is where the runtime can stop an incomplete form, a disallowed target, or a step that exceeds the operator's instruction.

### Execution and outcome are different states

Sentinel models “the browser accepted the action” separately from “the intended result was observed.” Outcome checks can use URL changes, semantic state, visible confirmations, network behavior, or task-specific assertions. The response carries evidence and confidence instead of turning tool success into artificial certainty.

### State diffs keep the agent loop compact

After an action, the agent usually needs to know what changed—not receive the entire page again. Incremental semantic diffs and an event stream make that loop cheaper and easier to audit. Crawl and replay data preserve how the session reached its current state.

### A replaceable browser seam

The Playwright attachment is intentionally isolated from the semantic and policy layers. That makes the runtime useful now while preserving a clean seam for selected Blink, V8, or network instrumentation later. I would rather expose the current milestone honestly than present scaffolding as a finished browser fork.

## Engineering boundaries

Sentinel is not a guarantee that every page can be understood. Adversarial interfaces, canvases, remote desktops, unusual accessibility trees, and mobile-specific controls can require different strategies. The custom Chromium path is not yet the default runtime, and production persistence and distributed orchestration are still future work.

Those limitations shape the product: the runtime reports uncertainty, keeps policy explicit, and preserves enough evidence for a human or another agent to review the result.

This project reflects my direct work across browser automation, security instrumentation, MCP tool design, mobile control, and autonomous workflow contracts. Private source, credentials, and unpublished security detail are intentionally omitted.`,

  videomemory: String.raw`> **Status:** Beta and open source. VideoMemory runs locally by default and is available under the MIT license.

## The use case: find one useful moment in a long recording

The practical question people ask about a long video is rarely “summarize every minute.” It is more often: **where did they explain this specific thing?**

Consider a two-hour product review. A coding agent needs the moment where the team explains the launch sequence. Reading the entire transcript wastes context, uniform frame sampling misses the relationship between words and slides, and uploading the whole recording to a hosted vision service creates cost and privacy trade-offs.

[VideoMemory](https://github.com/kathan3009/videomemory) turns that request into temporal retrieval:

1. Add a local video or supported URL to a local library.
2. Ask a natural-language question.
3. Retrieve the best transcript window and timestamp.
4. Inspect query-selected frames around that moment.
5. Open the source at the exact location when human review is needed.

The output is not merely an answer. It is an answer connected to a timestamp, transcript passage, and visual evidence.

## How VideoMemory is engineered

~~~mermaid
flowchart LR
  V[Video file or URL] --> M[ffmpeg and metadata]
  M --> T[faster-whisper transcript]
  T --> W[Temporal text windows]
  W --> E[Local embeddings]
  M --> F[Keyframe candidates]
  F --> C[Visual deduplication and CLIP index]
  E --> Q[(SQLite library)]
  C --> Q
  Q --> R[Query-aware retrieval]
  R --> X[Timestamp + transcript + frame evidence]
~~~

### A local, portable library

SQLite stores video metadata, transcript windows, and embeddings. The database is portable and easy to inspect; original videos remain where the user keeps them. There is no mandatory hosted vector database or cloud API in the steady-state path.

The transcript pipeline uses faster-whisper, then groups words into temporal windows. Compact local embeddings make those windows searchable. A query retrieves candidate passages by semantic similarity and keeps the original time boundaries attached.

### Visual retrieval only after the query is known

Uniformly sending frames to a vision model is wasteful. VideoMemory first creates a smaller visual index from keyframe candidates, perceptual similarity, color information, and a compact CLIP representation. Query-aware ranking then selects the frames most likely to clarify the retrieved passage.

Time diversity matters. Several visually similar frames from the same second add little evidence, so selection favors useful temporal spread.

### Contact sheets are a context optimization

Selected frames are normally packed into one labeled contact sheet. That lets an agent compare nearby moments in a single vision request and keeps timestamp labels visible. When a question depends on small text or OCR, the system can return separate full-resolution frames instead. The optimization is conditional, not dogmatic.

### MCP makes retrieval part of the agent workflow

The MCP server exposes operations for temporal search, visual inspection, frame sampling, cross-video search, and library management. A terminal interface uses the same underlying services, so the product is not locked to one agent client.

The useful abstraction is **temporal memory with evidence**. An agent can find the passage, inspect the scene, and continue working without pretending the recording was compressed into a perfect summary.

## Engineering boundaries

Initial model downloads and media tooling make setup heavier than a pure Python package. Transcription can miss jargon. Visual sampling can miss a brief event between candidate frames, and performance depends on local hardware. Source downloads are also constrained by the policies and behavior of each host.

The next improvements I care about are segmented re-indexing for very long media, confidence-driven escalation to more frames, and broader source handling. The public repository is the source of truth for installation and current behavior.`,

  videoStudio: String.raw`> **Status:** Active and open source. Video Studio is a local-first production pipeline, not a hosted editing service.

## The use case: turn a rough capture into a publishable story

A coding agent can call ffmpeg. That does not make it an editor.

The hard part of producing a useful video is the chain of judgment between the commands: deciding what the story is, allocating time to each beat, capturing legible footage, cutting on meaningful boundaries, aligning captions, mixing audio, and checking that the output still works at its destination size.

[Video Studio](https://github.com/kathan3009/video-studio) makes that chain explicit. A typical product-reel workflow is:

1. Start with a brief or raw footage.
2. Write a short script and allocate a beat budget.
3. Capture browser, terminal, desktop, or mobile material.
4. Transcribe and edit against word-level timing.
5. Add captions, music, and motion-matched sound.
6. Evaluate readability, audio, and output format before publishing.

The product is useful for launch reels, explainers, podcast excerpts, tutorials, and square social video because those outputs share production stages even when their creative direction differs.

## How Video Studio is engineered

~~~mermaid
flowchart LR
  B[Brief or footage] --> S[Script and beat plan]
  S --> C[Browser, screen, terminal, or mobile capture]
  C --> T[Word-level transcription]
  T --> E[Timeline edit]
  E --> A[Captions, music, and mix]
  A --> Q[Visual and audio quality gates]
  Q --> P[Format-specific publish output]
~~~

### A production state machine, not a pile of commands

Each stage has inputs, outputs, and validation criteria. That matters for agents because an implicit creative process is difficult to resume or review. The workflow records decisions such as target aspect ratio, duration, caption posture, capture source, and delivery platform.

The pipeline can stop when a prerequisite is missing instead of quietly producing an incoherent file. A transcript cannot drive an edit before timing exists; a caption pass cannot be approved before safe-zone and line-fit checks; publishing should not happen before the rendered file is inspected.

### Capture is part of editing

Browser and screen capture are planned around the final crop. Small UI recorded at desktop scale is unreadable inside a social frame, so capture recipes account for zoom, viewport, cursor behavior, and the visual moment the story needs. The best edit cannot rescue footage that never showed the action clearly.

### Transcript-led timing

faster-whisper provides word-level timing for spoken material. That enables cuts near linguistic boundaries, caption placement, terminology correction, and alignment between visual beats and narration. Silence and handles are kept deliberately so joins do not feel abrupt.

### ffmpeg as a deterministic assembly layer

ffmpeg handles media normalization, trims, scaling, composition, audio mixing, and delivery encoding. Pillow and related utilities produce selected graphic assets. Playwright supports controlled browser capture. Model APIs can help with evaluation or script work, but the media pipeline does not depend on an opaque hosted editor.

### Quality gates turn “rendered” into “ready”

The workflow checks dimensions, duration, codecs, audio peaks, caption fit, and representative frames. A finished file must match the requested destination, not merely exist on disk.

## Engineering boundaries

Creative judgment remains the limiting factor. Automated checks can detect clipping or silence; they cannot decide whether a pause feels emotionally right. Capture also inherits the behavior of the source application, and transcription requires correction when names or technical terms are unusual.

That is why Video Studio is a supervised agent workflow. It gives an agent production discipline and deterministic tools while leaving room for a human to redirect the story. The repository includes the current workflows, examples, and public implementation.`,

  swanlink: String.raw`> **Status:** Prototype. Swanlink is a working coordination fabric for heterogeneous AI sessions.

## The use case: let several agents share one outcome without duplicating work

Multi-agent work often fails in mundane ways. Two agents claim the same task. A third assumes a dependency is finished. A worker disappears while holding context no one else can recover. Messages arrive, but no one knows whether they were acknowledged or acted upon.

Swanlink treats coordination as a product surface instead of hoping agents coordinate through prose.

Imagine a portfolio release handled by three different sessions:

1. A research agent collects product behavior and source evidence.
2. A build agent leases the implementation task and acknowledges ownership.
3. A review agent waits for the build receipt, then verifies the result.
4. If the build agent disappears, its lease expires and the task becomes recoverable.
5. The handoff keeps evidence and dependency state attached to the work.

The user experience is simple: many agents can participate, but every task has a visible owner, lifecycle, and result.

## How Swanlink is engineered

~~~mermaid
sequenceDiagram
  participant R as Research agent
  participant S as Swanlink
  participant B as Build agent
  participant V as Review agent
  R->>S: publish evidence receipt
  S->>B: dispatch implementation task
  B->>S: acknowledge + acquire lease
  B->>S: complete with evidence
  S->>V: release dependent review task
  V->>S: verified outcome
~~~

### Coordination state lives outside the model

Presence, tasks, acknowledgements, leases, and receipts are stored as explicit state. Agents reason about the work, but they do not have to reconstruct coordination truth from chat history.

This separation is important. A model can decide that it should accept a task; the fabric decides whether the task is available, who currently owns it, when the lease expires, and what transition is valid next.

### Lease-backed ownership

A lease makes task ownership temporary and observable. The worker renews while it is active. If heartbeats stop, Swanlink can recover the task rather than leaving it permanently “in progress.” Completion releases dependencies and attaches the result needed by the next worker.

### Acknowledgements are part of delivery

Sending a message is not equivalent to delivering work. Dispatch and acknowledgement are different events, just as task completion and downstream acceptance are different events. That distinction makes failure and retry behavior easier to reason about.

### Cloudflare primitives fit the control plane

The TypeScript implementation uses MCP for client access and Cloudflare Workers for the service edge. Durable Objects provide a natural home for serialized coordination state, while D1 supports durable records and telemetry. The design keeps client-side reasoning flexible: different agent runtimes can participate without needing the same model or framework.

### Telemetry answers operational questions

Coordination needs more than logs. Useful signals include lease age, acknowledgement latency, retry cause, dependency wait time, recovery events, and task outcomes. Those signals make it possible to distinguish slow reasoning from a lost worker or a broken handoff.

## Engineering boundaries

Swanlink does not make an incorrect decomposition correct. It coordinates tasks that have already been defined, and poor dependency design can still serialize work unnecessarily. Lease duration and retry policy also require tuning for the type of work being coordinated.

The prototype focuses on deterministic lifecycle behavior before higher-level planning. That ordering is intentional: a clever planner is not useful if the underlying task ownership can split into two realities.`,

  inde: String.raw`> **Status:** Concept. Inde is an illustrative luxury-fashion product and digital experience; campaign imagery is concept imagery, not a claim of a currently shipping collection.

## The use case: carry a craft story through the entire buying journey

Many fashion experiences use craft as surface decoration. Inde explores a different product question: what would it look like if Indian textile memory shaped the collection, the editorial system, and the made-to-order interaction model?

The intended customer journey is slower and more contextual than a conventional product grid:

1. Discover a collection through a textile or craft story.
2. See how ajrak rhythm or bandhani detail informs a contemporary silhouette.
3. Understand material, technique, and provenance before choosing.
4. Select a garment for a made-to-order consultation.
5. Keep the garment's story attached to the order rather than losing it at checkout.

The product use case is not only selling clothing. It is giving a global luxury customer enough context to value the source of the design.

## How the Inde experience is engineered

~~~mermaid
flowchart LR
  C[Craft story] --> E[Editorial collection page]
  E --> P[Product and silhouette detail]
  P --> M[Made-to-order consultation]
  M --> O[Order with provenance context]
  O --> S[Structured product and editorial data]
~~~

### A bespoke visual system

The Next.js interface uses a restrained editorial palette, serif-led typography, strong image crops, and asymmetric composition. Components are designed around collection stories and garment detail rather than a generic commerce template.

Responsive behavior matters because editorial layouts can collapse badly on small screens. The design system treats type scale, image focal point, rhythm, and action placement as coordinated tokens instead of one-off page styling.

### Content and commerce remain connected

Collection, product, technique, and order-intent data are modeled so a garment does not become an isolated SKU. A product page can reference its collection narrative, craft context, material, silhouette, and made-to-order process.

The consultation action is intentionally different from an instant “add to cart.” It creates room for measurements, production expectations, and customer questions while reinforcing the concept's slower-production posture.

### Structured data supports discovery

Metadata, canonical pages, product information, breadcrumb structure, and editorial entities are designed for both human navigation and search systems. Structured data cannot create authority on its own, but it can make the relationship between organization, collection, article, and product legible.

### Imagery is treated as concept communication

The campaign imagery establishes silhouette, material mood, and art direction. It is labeled honestly as concept work. Generated or illustrative media should not be presented as documentary proof of artisans, factories, customers, or finished inventory.

## Engineering and product boundaries

Inde is not a live fashion house, and the experience does not prove a supply chain, production capacity, or artisan partnership. Those would require operational work and evidence outside the website.

The value of the project is the integrated concept: product strategy, brand system, interaction design, responsive implementation, structured data, and a made-to-order flow all organized around the same craft-first thesis.`,

  pentestOss: String.raw`> **Status:** Active and open source. Pentest Copilot is a BugBase team project for authorized security testing. My public work includes the backend-integrated MCP access flow described below; I am not claiming sole authorship of the product.

## The use case: one supervised workspace for an authorized assessment

A penetration tester normally moves between a browser, terminal, Burp Suite, notes, findings, credentials, and target scope. The technical tools are powerful; the workflow around them is fragmented.

[Pentest Copilot OSS](https://github.com/bugbasesecurity/pentest-copilot) is a browser-based AI assistant that brings those activities into an engagement-aware workspace.

A realistic use case begins with authorization:

1. The operator creates an engagement and defines the approved target.
2. A Kali environment and relevant tooling are connected.
3. The operator gives the agent an objective inside that scope.
4. Pentest Copilot runs or proposes actions while exposing commands and output.
5. Artifacts and observations stay attached to the engagement.
6. The operator reviews evidence before turning an observation into a finding.

The product is not “press a button to hack a target.” It is **an assisted operating environment where the tester can supervise reasoning, tools, evidence, and findings in one place**.

## How Pentest Copilot OSS is engineered

~~~mermaid
flowchart LR
  O[Authorized operator] --> E[Engagement and target scope]
  E --> A[Agent loop]
  A --> T[Terminal, browser, Burp, and utilities]
  T --> R[Tool results and artifacts]
  R --> F[Reviewable findings]
  F --> O
  M[MCP client] -->|local token + engagement context| E
~~~

### Engagement context is the control boundary

Targets, actions, artifacts, and findings belong to an engagement. That context makes the history reviewable and prevents an external client from becoming a parallel source of truth.

The backend coordinates agent state and tool integrations; the Next.js interface gives the operator a live view of execution and evidence. Docker-based setup makes the public system reproducible across development environments, while MongoDB and Redis support durable and active state.

### Tools remain visible to the operator

The agent can work with browser and terminal surfaces, Burp Suite data, utilities, artifacts, and finding workflows. The interface exposes enough of that loop for the operator to understand what was attempted and what evidence was produced.

This matters in security work because confident language is not evidence. A finding should connect to an observed request, response, command result, artifact, or other reviewable material.

### MCP access uses the existing backend

My public contribution made MCP another client of the existing control plane rather than a privileged side door. An operator enables local MCP access, receives an endpoint and bearer token, and uses a compatible client such as Codex or Claude Code.

Requests still resolve inside an engagement and pass through the product's backend services. The MCP adapter does not create a second task history or bypass the UI's evidence model. That architecture keeps local agent clients useful without separating them from the operator's workspace.

### Why local access needs explicit authentication

“Local” is not the same as “trusted.” Development machines run browsers, extensions, background services, and other tools. A bearer token and explicit enablement make the MCP surface intentional. Engagement scope remains part of every operation.

## Safety and product boundaries

Pentest Copilot does not grant authorization to test a system. It is intended only for targets where the operator has explicit permission. Models can be wrong, tools can be noisy, websites can behave unexpectedly, and scanners have their own limitations.

Human scoping and review are part of the product model. The public repository is the source of truth for current setup, license, features, and contributors. Pentest Copilot Enterprise is a separate production surface with broader orchestration and assessment requirements.`,

  pentestEnterprise: String.raw`> **Status:** Production. Pentest Copilot Enterprise is a BugBase team product. This article describes areas I worked on in the private red-team automation platform while omitting customer data, credentials, private endpoints, and exploit implementation detail.

## The use case: turn scattered exposure into a controlled, reviewable attack path

An enterprise security team can see thousands of resources, identities, permissions, credentials, and network relationships across cloud and internal environments. The difficult question is not “did a scanner find something?” It is:

**Can these relationships form a meaningful path to an objective, can the path be validated from the right environment, and can every state change be recovered and proven?**

Pentest Copilot Enterprise is the production automation surface built around that problem.

A representative workflow is:

1. Discover identities, resources, permissions, credentials, and reachability across AWS, Azure, GCP, Windows, Linux, and network environments.
2. Normalize those observations into a graph without erasing provider-specific meaning.
3. Identify candidate paths toward an operator-defined objective.
4. Route a validation step to an agent with the required network or cloud reachability.
5. Capture evidence for each path relationship and executed step.
6. If validation changes state, execute the module-owned rollback plan.
7. Verify that the prior state was restored and expose the result to the operator.

The product use case is broader than autonomous pentesting. It is **continuous, evidence-driven red-team automation with explicit control over scope, execution, and recovery**.

## The systems I worked on

~~~mermaid
flowchart LR
  D[Multi-environment discovery] --> G[(Canonical attack graph)]
  G --> P[Candidate attack paths]
  P --> R[Capability and reachability routing]
  R --> X[Controlled module execution]
  X --> E[Evidence contracts]
  X --> B[Rollback ledger]
  B --> V[Recovery verification]
  E --> O[Operator review]
  V --> O
~~~

### Multi-cloud attack-path coverage

I worked on discovery and actionable path behavior across AWS, Azure, and GCP. That included identity and permission relationships, workload and service-account paths, storage and disk exposure, execution opportunities, and provider-specific guardrails.

Provider-neutral orchestration cannot mean provider-blind modeling. An AWS role, Azure managed identity, and GCP service account have different semantics. The graph preserves those distinctions while using shared lifecycle fields such as scope, provenance, eligible agent capability, evidence state, and recovery ownership.

### Capability-aware agent routing

An online agent is not automatically able to execute a step. Routing considers network location, cloud context, operating-system role, available tooling, and the module's declared capabilities.

Queue messages use identifiers and controlled references rather than copying raw secrets across services. Redis, RabbitMQ, and backend services coordinate active work; identity and OIDC boundaries keep service and operator access explicit.

### Reversible execution

I worked on treating rollback as a first-class lifecycle rather than a generic cleanup hook.

~~~text
prepared → executed → evidence persisted → rollback scheduled
    ↓             ↓                              ↓
 failed      partial result              restored → verified
~~~

The module that changes state owns the recovery logic because it knows what changed and what prior-state evidence is required. A rollback record tracks ownership, schedule, attempts, result, and verification. Failure after execution can still enqueue recovery.

This does not make every action risk-free. It makes side effects explicit and reviewable instead of hiding them behind a success flag.

### Evidence contracts and graph consistency

Evidence attaches to entities, edges, and path steps—not only to a final report paragraph. Operators can distinguish relationships that were observed, inferred, or actively validated.

Canonical scope-aware identifiers keep concurrent agents from creating parallel versions of the same resource or identity. Neo4j supports path and coverage views, while backend contracts control how new observations become graph state.

### Scheduled and continuous assessments

I also worked on scheduled assessment behavior, state coordination, and the surrounding operational surfaces needed to repeat work safely. Continuous testing requires clear ownership of runs, concurrency rules, evidence retention, retry policy, and recovery—not merely a cron expression.

## Security and trust boundaries

The platform operates only within authorized scopes. Autonomous reasoning does not remove the need for operator intent, environment controls, secret handling, evidence review, and recovery ownership.

This article deliberately stays at the system-design level. It describes the engineering categories I worked on without exposing customer environments, internal endpoints, credentials, or procedural exploit detail. For an inspectable public companion, [Pentest Copilot OSS](https://github.com/bugbasesecurity/pentest-copilot) demonstrates the supervised agent workspace and open-source control flow.`,
};
