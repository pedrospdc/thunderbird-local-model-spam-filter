# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `make build` — Zips `extension/` into `ai-spam-filter.xpi`
- `make test` — Runs tests via `node --test test/`
- `make clean` — Removes built XPI
- Single test: `node --test test/parse-response.test.js`

No package.json or npm dependencies. Tests use Node.js native test runner.

## Architecture

Thunderbird Manifest V3 email extension that classifies emails as spam/ham using a local Ollama LLM instance. All AI inference stays local.

### Extension files (`extension/`)

- **background.js** — Core logic: email classification, tag management, folder scanning, spam review. Runs as Thunderbird background script.
- **popup.html/popup.js** — Toolbar popup with "Scan Current Folder" and "Review Spam" buttons, progress bars, polling.
- **options.html/options.js** — Settings UI (Ollama URL, model, spam action, threshold, system prompt).
- **manifest.json** — Permissions: messagesRead, messagesMove, messagesDelete, messagesTags, messagesUpdate, accountsRead, storage.

### Classification flow

Two classification modes configured via `modelType` setting:
- **"chat"** (default) — `/api/chat` with structured JSON output (`{classification, confidence}`)
- **"classify"** — `/api/generate` for binary 0/1 models, with fallback parsing of `<think>` blocks

`classifyMessage()` builds a prompt with metadata headers (From, To, Reply-To, Subject, Content-Type, List-Unsubscribe, Authentication-Results, attachments, URL count) plus truncated body (default 8000 chars).

### Concurrency

Folder scan and spam review use configurable concurrent workers (default 4, matching `OLLAMA_NUM_PARALLEL`). Both support cancellation via flags polled by workers.

### Tagging

Messages are tagged `ham_verified` (green) or `spam_detected` (red) after classification. Tags are created on startup via `ensureTags()`. Tags are applied via `addTag()`/`removeTag()` helpers that use `messenger.messages.update()` — **not** `messenger.messages.tag()`/`untag()` which don't exist.

### Spam review

`reviewSpam()` iterates all Junk folders across accounts, reclassifies each message, and restores false positives (removes spam tag, adds ham tag, moves to inbox).

## Thunderbird API Notes

- Tags on messages are set via `messenger.messages.update(messageId, { tags: [...] })`. There is no `messenger.messages.tag()` or `messenger.messages.untag()` method.
- `messages.update()` requires the `messagesUpdate` permission.
- Email headers are accessed via `full.headers["header-name"]` which returns arrays.
- Message IDs are ephemeral — they don't persist across restarts or moves.
- Attachments are listed via `messenger.messages.listAttachments(messageId)`.

## Testing

Tests only cover response parsing (`parseClassifyResponse` extracted from `classifyViaGenerate` logic). The `messenger.*` API is not available in Node.js, so background.js functions that use it are not currently tested. Adding mock-based tests for tagging, scanning, and review flows would improve coverage.

## System prompt

The default system prompt classifies newsletters in any language as spam, except Substack. Marketing, promotional, and advertising emails are spam. Invoices, receipts, transactional emails, and personal messages are ham. The prompt instructs the model to use provided metadata headers as additional signals.
