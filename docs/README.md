# UserAgent Documentation

UserAgent is a UX research automation tool that simulates real human users interacting with web applications. It focuses on intuition, expectations, and user experience rather than test assertions — generating detailed reports with UX issues, improvement suggestions, and intuitiveness scores.

## Table of Contents

### Architecture

- [Overview](architecture/overview.md) — High-level architecture, module diagram, data flow
- [Step Lifecycle](architecture/step-lifecycle.md) — Session and step execution flow, context management

### Modules

- [LLM](modules/llm.md) — LLM provider system, prompt files, implementations
- [Vision](modules/vision.md) — Screenshot capture and ARIA accessibility snapshots
- [Browser](modules/browser.md) — Browser management, actions, coordinate clicking
- [Report](modules/report.md) — Markdown and JSON report generation

### Server

- [API](server/api.md) — REST API endpoints, authentication, webhooks

### Configuration

- [CLI](configuration/cli.md) — Command-line options reference
- [Defaults](configuration/defaults.md) — Default values, debug modes, budget system
- [Personas](configuration/personas.md) — Built-in persona presets
