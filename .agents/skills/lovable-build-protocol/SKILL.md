---
name: lovable-build-protocol
description: Navigation map for the external agent/plugin/skill catalog (191 agents, 83 plugins, 155 skills from Major7Apps marketplace). Use when the user references this catalog by name, asks "which agent/plugin/skill should I use for X", says "/skill:lovable-build-protocol", or wants to map a Lovable build task onto a specialized agent or skill from this registry.
---

# Lovable Build Protocol — External Catalog Map

This is a **reference skill**, not a workflow. It indexes an external marketplace of specialized agents/plugins/skills the user keeps around for delegation decisions. Load a reference file only when the user's request matches its scope.

## When to load what

| User intent | Read |
|---|---|
| "Which agent handles X" / picking an agent by capability | `references/agents.md` |
| "Which plugin should I install" / plugin bundle questions | `references/plugins.md` |
| "Which skill fits X" / activation triggers, skill composition | `references/skills.md` |

## Usage rules

1. **Catalog only** — entries describe external Claude Code marketplace items (Major7Apps). They are NOT tools available in this Lovable session. Do not try to invoke them.
2. **Recommend, don't execute** — when the user asks "what should I use for X", surface 1–3 candidates from the relevant reference with a one-line reason each. Do not list everything.
3. **Bridge to Lovable** — after recommending, note what the equivalent action is *inside this Lovable project* (e.g. "the `backend-architect` agent maps to: design the schema, then write a Supabase migration via the migration tool").
4. **Don't bloat context** — never paste the full catalog into chat. Reference by name + one-line description.

## Quick lookup heuristics

- Architecture / API design / DB schema → agents.md (architecture section)
- Frontend / mobile / UI polish → agents.md (UI section) + skills.md (UI Design, Frontend Mobile)
- Testing / QA / a11y → skills.md (Developer Essentials, Accessibility, JavaScript/TypeScript)
- DevOps / cloud / k8s → plugins.md (Cloud Infrastructure, Kubernetes Operations, CI/CD)
- LLM / RAG / prompt → skills.md (LLM Application Development)
- Payments → skills.md (Payment Processing) — but inside Lovable, prefer the built-in Stripe/Paddle connectors first.

## Hand-off

If the user wants the actual build work done (not just a recommendation), drop this skill and proceed with normal Lovable tooling — migrations, server functions, file edits.
