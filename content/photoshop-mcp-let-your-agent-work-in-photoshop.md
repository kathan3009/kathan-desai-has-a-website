I spent a weekend letting Claude grade raw photos through Photoshop, and the thing that came out the other side is a small Mac app I now leave running in the menu bar. This is the build note: what it does, why it exists, what Photoshop quietly lies about, and where to get it.

**[Install Photoshop MCP from source](/photoshop-mcp#install)** · [Source on GitHub](https://github.com/kathan3009/photoshop-mcp)

> Updated October 23, 2026: source installation is now the recommended setup. The old 1.2.0 DMGs are unnotarized and can trigger macOS’s “damaged” warning. A notarized desktop release is pending.

## The short version

Photoshop MCP is a [Model Context Protocol](https://modelcontextprotocol.io) server for the Photoshop already running on your Mac, plus a desktop app that bundles it. Connect it to Claude Code, Claude Desktop, Cursor or Codex once, and your agent gets 20 tools by default, with an optional ExtendScript tool: it can look at the document (an sRGB render, a crop at 100%, histogram numbers), build non-destructive adjustment layers, run Select Subject, mask, place images, set type with real fonts, batch many steps into one undo, and export. The app shows you every call as it happens, keeps a gallery of what the agent looked at and exported, and has a pause switch.

No plugin inside Photoshop. The recommended source installation needs Node.js 18+ with npm (prefer a supported LTS). The server is MIT licensed; Photoshop and your model provider may charge separately. Execution is local, but requested previews and tool results may be sent to your model provider through your MCP client.

## Why not just use the Photoshop UI

Because the agent is genuinely good at the slow part. On the Golden Gate shoot that started this, Claude opened each raw through Camera Raw sidecars, rendered the frame, read the histogram, selected the bridge with Select Subject, built masked curves and colour balance on top, checked the result at 100% for halos, and exported sRGB JPEGs and layered PSDs — while I argued with it about taste. The arguing is the fun part. The twenty tool calls per photo are not.

What it is *not* good at without help is being safe. An agent that can call `save` can overwrite your file. One that can `close` can discard an hour of work. One malformed command can crash Photoshop and take every open document with it (this happened to me, once, which is why the test suite now refuses to run next to unsaved work). So most of the engineering went into the guardrails rather than the tools:

- A **checkpoint before the agent's first edit** of every document: a history snapshot, plus a layered copy of unsaved work written to disk.
- **Your files stay yours.** Saving over a file requires `overwrite: true`; closing a dirty document requires `discard: true`. These flags are programmatic guards, not separate approval dialogs. The agent must still get your permission.
- **Each edit is one undo step**, and a multi-step batch is one state too, rolled back entirely if any step fails. The app's Undo button reverts the agent's last step; Revert goes back to the checkpoint.
- A **pause switch** in the app and the menu bar. While it's on, the server refuses every edit and tells the agent to ask you.
- Parameters are **strictly validated**. A typo in a curve point is an error, not a silent no-op.

## What Photoshop quietly lies about

Every one of these was found by a real failure during the shoot and then confirmed with a live probe before it was fixed. If you script Photoshop, you may want them:

**New layers land inside a selected group.** After you create a group, Photoshop selects it, and the next layer you create goes *into* the group. My agent built a black-and-white variant that nested inside a hidden group, and the export came out identical to the original. The server now lifts new layers above a selected group unless you ask for `inside`.

**Text sizes are points at document resolution.** Set a text layer to 100 "px" on a 300 ppi document and it renders 417 px tall. Paragraph boxes behave the same way. Leading and position are true pixels. The fix is a 72/ppi factor on exactly the right properties.

**Exports carry the working profile.** Camera Raw hands Photoshop a Display P3 document, so a plain JPEG export embeds P3 and looks dull in a browser. Exports and previews are now converted to sRGB by default.

**ExtendScript mis-parses nested ternaries.** `a ? b : c ? d : e` takes the wrong branch without parentheses. This one cost an afternoon.

**Deleting a mask drops the active selection**, adding an alpha channel makes Select Subject reject its parameters, and making an adjustment layer consumes the selection that became its mask. All handled, all tested.

The README has the full table, with how each one is worked around.

## The optional app

The desktop interface described here is separate from the recommended source setup. Its old downloads are not the current installation path.

The server is plain Node, and developers can keep using it that way (`scripts/install.sh` registers it with whatever clients you have). But most of the people I wanted to give this to don't have Node and shouldn't need it. So the app is an Electron shell whose only trick is that its own binary runs the server: the MCP client launches the app in Node mode with the bundled server, which means a 125 MB DMG is the entire install.

Once it's running it earns its place by making the agent visible. **Activity** is a live feed of every call with its arguments, duration and error. **Gallery** shows every render the agent looked at and every file it exported. **Checkpoints** lists the safety copies and opens them in Photoshop. **Doctor** checks Photoshop, automation permission and each client registration. And the three buttons in the toolbar — Undo last step, Revert to checkpoint, Pause edits — are the ones I actually use.

## Install

You need macOS, licensed Photoshop, Git, Node.js 18+ with npm, and an MCP client. From a permanent folder, run:

```bash
git clone https://github.com/kathan3009/photoshop-mcp.git
cd photoshop-mcp
./scripts/install.sh --client claude-code
```

Replace `claude-code` with `claude-desktop`, `cursor` or `codex`. Restart that client, open Photoshop, then ask your agent to run `ps_status`. Approve macOS’s Automation request to control Photoshop. Keep the clone in place because your client uses its absolute path.

Start with a disposable copy of a photo:

> Show me this photo, add a named exposure adjustment layer to brighten it slightly, then show the result. Leave the original file untouched.

For connection issues, run `node bin/photoshop-mcp.mjs doctor` from the clone. The [installation guide](https://github.com/kathan3009/photoshop-mcp/blob/main/docs/INSTALLATION.md) covers troubleshooting, privacy, updates and uninstalling.

The latest validation passed 167 end-to-end checks against Photoshop 27.11.0, plus clean source-install and MCP startup checks. Other Photoshop versions are unverified; `doctor` flags them. See the [validation notes](https://github.com/kathan3009/photoshop-mcp/blob/main/docs/VALIDATION.md).

## What's next

A UXP transport would bring Windows and cut per-call latency. Selective colour, channel mixer and layer styles are the next tools. And a Camera Raw filter as a smart filter would let the agent do the develop step inside the document rather than through sidecars. If you build something with it, I'd like to see it.
