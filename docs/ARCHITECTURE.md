# AinerSpeak Architecture

## Product Source

The implementation follows `AinerSpeak_AI_Expression_OS_Design_v1.1_FULL.md` as the primary product specification and keeps the v1.0 document's MVP and deployment guidance.

## Architecture Principles

- API-first: future H5, PC, React Native, Swift, Kotlin, or desktop clients should reuse the same backend contracts.
- Domain-first modules: auth, profile, conversations, assets, grammar, voice, providers, and admin stay independent.
- Provider-pluggable: LLM, ASR, TTS, realtime voice, embedding, and storage providers live behind stable interfaces.
- Multilingual from day one: no code path assumes English only.
- Upgrade path without microservices: keep a modular monolith until traffic or team size requires extraction.

## Runtime Shape

```text
apps/web H5/PWA
apps/admin Admin Console
future native app
        |
        v
apps/api FastAPI Modular Monolith
        |
        +-- PostgreSQL / SQLite local
        +-- Redis queue and quota cache
        +-- Object storage for audio and exports
        +-- LLM / Voice providers
```

## Domains

- Identity: users, roles, memberships, usage quotas.
- Profile: onboarding, user AI profile, correction style, coach style, language settings.
- Conversations: thought dialogue, target-language correction, bilingual replies, message analysis.
- Assets: Thought Freeze, expression variants, versions, sentence units, audio hooks.
- Learning Queue: grammar, patterns, vocabulary, review attempts, mastery scores.
- Voice: push-to-talk MVP, ASR/TTS adapters, realtime session placeholder.
- Admin: user membership, provider routing, prompt templates, call logs.

## Future App Upgrade

Native apps should call the same REST APIs and share response models. Keep client-only state small; persist durable learning state on the backend. Realtime voice can later be exposed as a WebRTC/token endpoint without changing the conversation and asset models.
