# Portfolio project assets

Final image files in this directory are uploaded by `scripts/sync-portfolio-projects.mjs` to deterministic Cloudflare R2 keys under `portfolio/projects/2026/`. MongoDB stores the resulting public R2 URLs; the website does not serve these source files directly.

## Provenance

### Project-card logos

The PNG files in `logos/` are uploaded for the project grid so Next.js can optimize them consistently. Sentinel, VideoMemory, Video Studio, Swanlink, and Inde use project-specific wordmarks. The two Pentest Copilot entries use official BugBase artwork from their respective repositories:

- `pentest-copilot-oss.svg` comes from `frontend/src/assets/copilot-logo-full.svg` in the public `bugbasesecurity/pentest-copilot` repository.
- `pentest-copilot-enterprise.svg` comes from `backend/shared/assets/branding/pentest-copilot-full-color.svg` in the private `bugbasesecurity/redteamautomation` repository.

The SVGs are retained as provenance-quality originals; their transparent PNG exports are the files published to R2.

### Brag videos

Seven 16-second product stories were composed with the Brag/HyperFrames workflow at a native 1920x1080, 30 fps delivery size. Each film has its own art direction, pacing, sound bed, and use-case narrative. Pentest Copilot films preserve the official brand lockups and use real repository imagery where appropriate. The editable composition, rendered posters, and local masters live under the timestamped, gitignored `brag-output-2026-08-10-170347/` directory.

During portfolio sync, final MP4s and first-frame posters are staged in the gitignored `videos/` and `posters/` folders, uploaded to cache-busted `portfolio/projects/2026/brag-stories/` keys in Cloudflare R2, and referenced by MongoDB through `videoEmbed` and `featuredImage`. Music and SFX come from the Brag skill's bundled, attributed media pack.

- `sentinel.png`, `swanlink.png`, `videomemory.png`, and `pentest-copilot-enterprise.png` were generated with the built-in imagegen tool on August 10, 2026.
- `pentest-copilot-oss.png` is the public banner from `bugbasesecurity/pentest-copilot`.
- `video-studio.svg` is the public banner from `kathan3009/video-studio`; `video-studio.png` is its local PNG rendering for consistent browser and R2 handling.
- `inde.png` is the campaign hero from the private `kathan3009/inde` repository and is published here with the repository owner's authorization.

## Generated-image prompts

The generated covers use wide, center-safe technical editorial compositions with no text, logos, watermarks, fake dashboards, or sensitive product detail.

- **Sentinel:** an AI-native browser runtime represented by semantic UI nodes, a guarded execution boundary, network traces, and verified outcomes in graphite, indigo, cyan, and amber.
- **Swanlink:** three distinct agent nodes connected through a deterministic coordination lattice, with restrained task and heartbeat pulses in black, pearl, cobalt, and emerald.
- **VideoMemory:** a filmstrip and waveform flowing through a compact embedding constellation toward one illuminated retrieved frame in navy, violet, and coral-gold.
- **Pentest Copilot Enterprise:** a non-product-specific multi-cloud attack graph with identity links, guarded checkpoints, verified paths, and a visible rollback path in steel, crimson, violet, and emerald.

Do not place intermediate render outputs here. Only final assets used by the sync belong in this directory.
