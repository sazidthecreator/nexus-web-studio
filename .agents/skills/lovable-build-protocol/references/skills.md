# Skills Catalog — 155 skills across 41 plugins

Source: Anthropic Agent Skills Spec (Major7Apps marketplace). External — not invokable in Lovable.

## By plugin

### Kubernetes Operations (4)
- **k8s-manifest-generator** — Deployments, Services, ConfigMaps, Secrets
- **helm-chart-scaffolding** — chart design & packaging
- **gitops-workflow** — ArgoCD/Flux
- **k8s-security-policies** — NetworkPolicy, PSP, RBAC

### LLM Application Development (8)
- **langchain-architecture**, **prompt-engineering-patterns**, **rag-implementation**, **llm-evaluation**, **embedding-strategies**, **similarity-search-patterns**, **vector-index-tuning**, **hybrid-search-implementation**

### Backend Development (9)
- **api-design-principles**, **architecture-patterns** (Clean/Hex/DDD), **microservices-patterns**, **workflow-orchestration-patterns** (Temporal), **temporal-python-testing**, **event-store-design**, **cqrs-implementation**, **projection-patterns**, **saga-orchestration**

### Developer Essentials (11)
- **git-advanced-workflows**, **sql-optimization-patterns**, **error-handling-patterns**, **code-review-excellence**, **e2e-testing-patterns** (Playwright/Cypress), **auth-implementation-patterns** (JWT/OAuth2/RBAC), **debugging-strategies**, **monorepo-management**, **nx-workspace-patterns**, **turborepo-caching**, **bazel-build-optimization**

### Blockchain & Web3 (4)
- **defi-protocol-templates**, **nft-standards** (ERC-721/1155), **solidity-security**, **web3-testing** (Hardhat/Foundry)

### CI/CD Automation (4)
- **deployment-pipeline-design**, **github-actions-templates**, **gitlab-ci-patterns**, **secrets-management** (Vault/AWS SM)

### Cloud Infrastructure (8)
- **terraform-module-library**, **multi-cloud-architecture**, **hybrid-cloud-networking**, **cost-optimization**, **istio-traffic-management**, **linkerd-patterns**, **mtls-configuration**, **service-mesh-observability**

### Framework Migration (4)
- **react-modernization**, **angular-migration**, **database-migration**, **dependency-upgrade**

### Observability & Monitoring (4)
- **prometheus-configuration**, **grafana-dashboards**, **distributed-tracing** (Jaeger/Tempo), **slo-implementation**

### Payment Processing (4)
- **stripe-integration**, **paypal-integration**, **pci-compliance**, **billing-automation**
- *Inside Lovable: prefer built-in Stripe/Paddle connectors first.*

### Python Development (16, top 5 listed)
- **async-python-patterns**, **python-testing-patterns**, **python-packaging**, **python-performance-optimization**, **uv-package-manager**, …

### JavaScript/TypeScript (4)
- **typescript-advanced-types**, **nodejs-backend-patterns**, **javascript-testing-patterns** (Jest/Vitest/RTL), **modern-javascript-patterns**

### API Scaffolding (1)
- **fastapi-templates**

### ML Ops (1)
- **ml-pipeline-workflow**

### Security Scanning (5)
- **sast-configuration**, **stride-analysis-patterns**, **attack-tree-construction**, **security-requirement-extraction**, **threat-mitigation-mapping**

### Accessibility Compliance (2)
- **wcag-audit-patterns** (WCAG 2.2), **screen-reader-testing** (NVDA/JAWS/VoiceOver)

### Business Analytics (2)
- **kpi-dashboard-design**, **data-storytelling**

### Data Engineering (4)
- **spark-optimization**, **dbt-transformation-patterns**, **airflow-dag-patterns**, **data-quality-frameworks**

### Documentation Generation (3)
- **openapi-spec-generation**, **changelog-automation**, **architecture-decision-records**

### Frontend Mobile Development (4)
- **react-state-management** (Zustand/Jotai/RQ), **nextjs-app-router-patterns**, **tailwind-design-system**, **react-native-architecture**

### UI Design (9)
- **design-system-patterns**, **accessibility-compliance**, **responsive-design**, **mobile-ios-design**, **mobile-android-design**, **react-native-design**, **web-component-design**, **interaction-design**, **visual-design-foundations**

### Game Development (2)
- **unity-ecs-patterns**, **godot-gdscript-patterns**

### HR Legal Compliance (2)
- **gdpr-data-handling**, **employment-contract-templates**

### Incident Response (3)
- **postmortem-writing**, **incident-runbook-templates**, **on-call-handoff-patterns**

### Quantitative Trading (2)
- **backtesting-frameworks**, **risk-metrics-calculation**

### Systems Programming (3)
- **rust-async-patterns**, **go-concurrency-patterns**, **memory-safety-patterns**

### Conductor — Project Management (3)
- **context-driven-development**, **track-management**, **workflow-patterns**

### Agent Teams (6)
- **multi-reviewer-patterns**, **parallel-debugging**, **parallel-feature-development**, **task-coordination-strategies**, **team-communication-protocols**, **team-composition-patterns**

### Reverse Engineering (4)
- **anti-reversing-techniques**, **binary-analysis-patterns**, **memory-forensics**, **protocol-reverse-engineering**

### Startup Business Analyst (5)
- **competitive-landscape**, **market-sizing-analysis**, **startup-financial-modeling**, **startup-metrics-framework**, **team-composition-analysis**

### Shell Scripting (3)
- **bash-defensive-patterns**, **bats-testing-patterns**, **shellcheck-configuration**

### Misc singletons
- **postgresql-table-design** · **hads** (Human-AI Doc Standard) · **dotnet-backend-patterns** · **evaluation-methodology** (PluginEval) · **block-no-verify-hook** · **protect-mcp-setup**

## How activation works (external spec)

Three-tier progressive disclosure: **Metadata** (always loaded) → **Instructions** (on activation) → **Resources** (on demand). YAML frontmatter requires `name` (hyphen-case) and `description` with a "Use when" clause, <1024 chars.

## Composition examples

- "Build RAG over PDFs" → `rag-implementation` + `embedding-strategies` + `prompt-engineering-patterns`
- "Ship a Stripe-billed SaaS" → `stripe-integration` + `billing-automation` + `pci-compliance`
- "K8s deploy with GitOps" → `k8s-manifest-generator` + `helm-chart-scaffolding` + `gitops-workflow`
- "Audit a React app for a11y" → `wcag-audit-patterns` + `screen-reader-testing` + `accessibility-compliance`

## Bridge to Lovable

These skills are *external recommendations*. Inside this project, the equivalents are:
- DB schema → Supabase migration tool
- Auth → Lovable Cloud auth (Google/email)
- Payments → Stripe/Paddle connectors
- AI → Lovable AI Gateway (`@/lib/ai-gateway`)
- Server logic → `createServerFn` (NOT edge functions)
