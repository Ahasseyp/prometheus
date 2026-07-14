# Research: Voice-to-Text Options for Mobile-First Finance Input

**Ticket:** #5 — Research: Voice-to-text options for mobile-first finance input  
**Map:** #1 — Map: Architecture for AI-first personal finance tracker/planner  
**Repo:** Ahasseyp/prometheus  
**Date:** 2026-07-13  
**Researcher:** opencode (k2p7)

## 1. Executive Summary

For a mobile-first personal-finance web app (PWA vs. native TBD) targeting Mexico with likely Spanish/English mixed input, we compared five speech-to-text (STT) paths: **OpenAI Whisper API**, **Deepgram**, **AssemblyAI**, **Web Speech API**, and **self-hosted Whisper**.

**Preliminary recommendation:** Start with the **OpenAI Audio API (`gpt-4o-transcribe` or `gpt-4o-mini-transcribe`)** or **Deepgram Nova-3 Multilingual**. Both are cloud APIs with strong Spanish support, low per-minute cost, and easy integration from a PWA. If the product later requires strict on-device privacy or offline operation, **whisper.cpp** on-device is the most mature self-hosted option.

The final choice should be validated with a small eval on real Mexican Spanish/Spanglish finance utterances (amounts, merchant names, categories) before committing.

## 2. Comparison Table

| Criterion | OpenAI Whisper API | Deepgram | AssemblyAI | Web Speech API | Self-hosted Whisper |
|-----------|-------------------|----------|------------|----------------|---------------------|
| **Best model** | `gpt-4o-transcribe` / `gpt-realtime-whisper` | `nova-3` Multilingual | `universal-3.5-pro` | OS/browser native | `whisper.cpp` / `faster-whisper` / Deepgram self-hosted |
| **Accuracy** | Strong on multilingual; no published WER for finance | Strong; benchmarks published for Nova family | Strong; ≤10% WER on Spanish per self-reported metrics | Variable; no standardized benchmark | Same as underlying Whisper model; depends on size/hardware |
| **Latency** | ~streaming via Realtime API; batch file <25 MB | Low; streaming & pre-recorded | Async pre-recorded (poll); streaming available | Near-zero on-device (when supported); otherwise cloud | Depends on device/GPU; mobile CPU slower |
| **Cost (pre-recorded)** | ~$0.003–$0.006/min | $0.0050–$0.0058/min (multilingual) | $0.0035/min (U3.5 Pro) / $0.0025/min (U2) | Free | Infra + ops only; no API metered cost |
| **Privacy** | Cloud; ZDR eligible; audio not used for training | Cloud; EU endpoint; self-hosted option | Cloud; EU endpoint; HIPAA/BAA included | Usually cloud-dependent (Chrome sends audio to Google) | Best; data stays on device/infra |
| **Mobile browser support** | Any browser (HTTPS fetch/WebSocket) | Any browser (HTTPS fetch/WebSocket) | Any browser (HTTPS fetch) | **Limited** — Chrome/Edge/Samsung mainly; iOS Safari weak | WebAssembly possible (whisper.cpp) but heavy |
| **Spanish / Mexico** | Spanish supported; no explicit Mexican dialect | Spanish + `language=multi`; no explicit Mexican dialect docs | **Mexican Spanish & Spanglish explicitly noted** | Depends on OS language pack | Depends on model training data |
| **Mixed-language (code-switching)** | Translates or auto-detects language per request | `language=multi` with multilingual models | Automatic language detection | Single language per session usually | Auto-detects language per segment |

## 3. Context from the Map

- Mobile-first web app (PWA vs. native still undecided).
- AI already uses cloud LLM APIs; financial data is already sent to cloud AI.
- Voice input is intended as a dedicated STT service, not Web Speech API, but we compare all options.
- Target market is Mexico; Spanish and English mixed-language support is likely needed.

## 4. Option Analysis

### 4.1 OpenAI Whisper API

**What it is:** Cloud audio transcription and translation endpoints (`/v1/audio/transcriptions`, `/v1/audio/translations`) plus a streaming Realtime API.

**Models available:**
- `whisper-1` — original Whisper-based endpoint.
- `gpt-4o-transcribe` — higher accuracy for non-streaming files.
- `gpt-4o-mini-transcribe` — lower cost, lower accuracy.
- `gpt-realtime-whisper` — streaming model for live transcript deltas via WebSocket/WebRTC [[OpenAI Realtime Transcription](https://platform.openai.com/docs/guides/realtime-transcription)].

**Accuracy / languages:**
- Official docs list 50+ supported languages including Spanish and English, using the open-source Whisper language list [[OpenAI Speech to Text](https://platform.openai.com/docs/guides/speech-to-text)].
- The model will auto-detect language or accept a `language` hint. It can also translate any supported language to English via the translations endpoint.
- No official finance-domain benchmark is published; Whisper is generally considered strong on multilingual audio.

**Latency:**
- File-based endpoint returns after processing the whole file (best for short utterances).
- Realtime API streams partial transcript deltas as audio arrives; `delay` can be tuned from `minimal` to `xhigh` to trade latency for accuracy [[OpenAI Realtime Transcription](https://platform.openai.com/docs/guides/realtime-transcription)].

**Cost:**
- `gpt-4o-transcribe`: ~$0.006 / minute
- `gpt-4o-mini-transcribe`: ~$0.003 / minute
- `gpt-realtime-whisper`: $0.017 / minute
- Pricing is per minute of audio [[OpenAI Pricing](https://platform.openai.com/docs/pricing)].

**Privacy / data retention:**
- OpenAI states API data is not used to train models by default (as of March 1, 2023) unless opted in.
- `/v1/audio/transcriptions` and `/v1/audio/translations` are listed as **Zero Data Retention eligible** with no application state retention and no abuse-monitoring retention [[OpenAI Data Controls](https://platform.openai.com/docs/guides/your-data)].
- Enterprise customers can request Zero Data Retention or Modified Abuse Monitoring.
- Data residency endpoints are available in the US, EU, etc., with a 10% uplift for newer models [[OpenAI Data Controls](https://platform.openai.com/docs/guides/your-data)].

**Mobile/PWA integration:**
- Standard HTTPS multipart upload or WebSocket; works from any modern mobile browser.
- File uploads are limited to 25 MB and supported formats include `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm` [[OpenAI Speech to Text](https://platform.openai.com/docs/guides/speech-to-text)].
- A backend proxy is recommended to avoid exposing the API key in the browser.

**Pros:** Simple SDK, strong multilingual model, already in the OpenAI ecosystem if the app uses GPT/LLM APIs, streaming option.
**Cons:** Realtime streaming is more expensive than competitors; no explicit Mexican Spanish dialect optimization documented.

### 4.2 Deepgram

**What it is:** Dedicated STT/TTS/voice-agent platform with Nova-family models and extensive features (diarization, smart formatting, keyterm prompting, PII redaction).

**Models available:**
- `nova-3` Multilingual — highest accuracy, automatic language detection, recommended for mixed-language and noisy audio.
- `nova-3` Monolingual, `flux` English, `flux` Multilingual, `enhanced`, `base`.
- Deepgram also offers a hosted **Whisper Cloud** model and a self-hosted Enterprise option.

**Accuracy / languages:**
- Nova models support 45+ languages.
- `language=multi` is recommended for code-switching audio [[Deepgram Language](https://developers.deepgram.com/docs/language)].
- Deepgram publishes Smart Formatting (currency, dates, phone numbers) as included, which is useful for finance input [[Deepgram Pricing](https://deepgram.com/pricing)].
- No independent, published WER benchmark on Mexican Spanish was found; Deepgram claims Nova-3 is its highest-performing model.

**Latency:**
- Pre-recorded REST returns after processing; 2 GB max file size, up to 100 concurrent requests for Nova on Pay-As-You-Go.
- Streaming via WebSocket is available with low latency and built-in turn detection.

**Cost:**
- Pre-recorded Nova-3 Multilingual: **$0.0058/min** Pay-As-You-Go / **$0.0050/min** Growth plan.
- Streaming Nova-3 Multilingual: **$0.0058/min** (promotional rate noted on site).
- Add-ons: speaker diarization +$0.0020/min, redaction +$0.0020/min, keyterm prompting +$0.0013/min. Smart formatting is included.
- $200 free credit for new Pay-As-You-Go accounts [[Deepgram Pricing](https://deepgram.com/pricing)].

**Privacy / data retention:**
- Deepgram does not store transcripts; the API response is the only retrieval opportunity [[Deepgram Pre-recorded Audio](https://developers.deepgram.com/docs/pre-recorded-audio)].
- SOC 2 Type 1 & 2, HIPAA BAA available, GDPR-ready EU endpoint (`api.eu.deepgram.com`), PCI compliant [[Deepgram Pricing](https://deepgram.com/pricing)].
- Self-hosted Enterprise option keeps audio/transcripts within customer infrastructure; only licensing/usage metadata contacts Deepgram [[Deepgram Self-Hosted Introduction](https://developers.deepgram.com/docs/self-hosted-introduction)].

**Mobile/PWA integration:**
- REST and WebSocket from any browser; official SDKs for JS, Python, Go, C#, Java, etc.
- A backend proxy is recommended for the API key.

**Pros:** Purpose-built STT platform, competitive price, strong feature set for finance (smart formatting, redaction, keyterms), streaming option.
**Cons:** Mexican Spanish dialect not explicitly documented; Growth plan requires $4K+/year commitment for best rates.

### 4.3 AssemblyAI

**What it is:** Speech AI platform with Universal models, pre-recorded and streaming transcription, and a wide array of add-ons (speaker diarization, sentiment, entity detection, summarization, LLM Gateway).

**Models available:**
- `universal-3.5-pro` — 18 languages, strong dialect handling.
- `universal-2` — 99 languages.
- `u3-rt-pro` — real-time streaming version of Universal-3.5 Pro.

**Accuracy / languages:**
- Universal-3.5 Pro explicitly supports **Mexican Spanish** and **Spanglish** as dialect variants, plus Castilian, Argentine, Colombian, Chilean, Caribbean Spanish [[AssemblyAI Supported Languages](https://www.assemblyai.com/docs/speech-to-text/supported-languages)].
- Universal-2 lists Spanish in the “high accuracy (≤10% WER)” bucket per AssemblyAI’s self-reported metrics.
- Automatic language detection is available; set `speech_models: ["universal-3-5-pro", "universal-2"]` to fall back.

**Latency:**
- Pre-recorded is async: submit URL/file, poll `GET /v2/transcript/{id}` until `completed`.
- Streaming uses WebSocket `wss://streaming.assemblyai.com/v3/ws`.
- File size up to 5 GB, duration 160 ms to 10 hours [[AssemblyAI Quickstart](https://www.assemblyai.com/docs/speech-to-text)].

**Cost:**
- Pre-recorded Universal-3.5 Pro: **$0.21/hr** = **$0.0035/min**.
- Pre-recorded Universal-2: **$0.15/hr** = **$0.0025/min**.
- Streaming Universal-3.5 Pro Realtime: **$0.45/hr** = **$0.0075/min**.
- Add-ons stack: speaker diarization +$0.02/hr async, +$0.12/hr streaming; entity detection +$0.08/hr; custom formatting +$0.03/hr; PII text redaction +$0.08/hr [[AssemblyAI Pricing](https://www.assemblyai.com/pricing)].
- $50 free credit, no card required.

**Privacy / data retention:**
- EU region (`api.eu.assemblyai.com`) at same price for GDPR compliance.
- HIPAA BAA available without premium pricing; SOC 2 Type 2, ISO 27001, PCI-certified Voice Agent API.
- AssemblyAI retains transcript data until deleted by customer; the API docs advise logging `transcript.id` for support/retry/deletion.

**Mobile/PWA integration:**
- Standard REST/WebSocket; SDKs for Python and JS.
- Backend proxy recommended for API key.

**Pros:** Explicit Mexico/Spanglish support, very low pre-recorded cost, rich add-on ecosystem, EU data residency at no premium.
**Cons:** Async pre-recorded adds polling latency; streaming is more expensive than Deepgram; over-featured if only basic transcription is needed.

### 4.4 Web Speech API

**What it is:** Browser-native `SpeechRecognition` interface (part of the Web Speech API). No external SDK required.

**Accuracy / languages:**
- Accuracy depends entirely on the underlying engine (Google on Android/Chrome, Apple on Safari/iOS, Microsoft on Edge, etc.).
- No standardized benchmark or guaranteed behavior across browsers.
- Supports `lang` hints; on-device recognition exists on some platforms via `processLocally` or `SpeechRecognition.available()` / `install()` APIs, but support is limited [[MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)].

**Latency:**
- Near real-time interim results when supported; otherwise audio is sent to a cloud service (e.g., Google) with network latency.

**Cost:**
- Free to the developer; users may bear data costs.

**Privacy / data retention:**
- On Chrome, recognition is server-based by default and audio is sent to a web service; it will not work offline [[MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)].
- On-device mode is gated by browser support and the `on-device-speech-recognition` permissions policy.

**Mobile browser support:**
- **Limited and inconsistent.** MDN marks `SpeechRecognition` as *Limited availability* / not Baseline. Android Chrome/Edge and Samsung Internet generally work; iOS Safari has historically had weak or no support, and the experience varies by locale [[Can I Use — Speech Recognition](https://caniuse.com/speech-recognition)].
- For a PWA targeting Mexico, this is risky: iOS users may have no voice input, and Android behavior depends on the device/OS version.

**Pros:** No API key, no backend, no usage cost, instant gratification for demos.
**Cons:** Unreliable cross-browser/mobile support, inconsistent accuracy, no control over model/domain vocabulary, privacy depends on browser vendor, not suitable as the primary production STT for a mobile-first app.

### 4.5 Self-Hosted Whisper

**What it is:** Running OpenAI’s Whisper model (or a derivative) on your own server, edge device, or mobile device instead of calling a cloud API.

**Common implementations:**
- **openai/whisper** (Python/PyTorch) — reference implementation; supports tiny/base/small/medium/large/turbo models, 99 languages [[OpenAI Whisper GitHub](https://github.com/openai/whisper)].
- **whisper.cpp** (C/C++) — highly optimized port; supports CPU, Metal (Apple), CUDA, Vulkan, OpenVINO, WebAssembly, Android, iOS; can run on-device [[whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)].
- **faster-whisper** (Python/CTranslate2) — up to 4× faster than reference Whisper, with INT8 quantization, VAD filter, batched inference; GPU recommended [[faster-whisper GitHub](https://github.com/SYSTRAN/faster-whisper)].
- **Deepgram self-hosted** — Enterprise-only; runs Deepgram API + Engine in customer infra, GPU-based, license server still contacts Deepgram for usage validation [[Deepgram Self-Hosted Introduction](https://developers.deepgram.com/docs/self-hosted-introduction)].

**Accuracy / languages:**
- Same base model as OpenAI Whisper; `large-v3` generally strongest. Accuracy varies by language and model size; Spanish is in the better-performing group.
- For finance, you can fine-tune or prompt on domain vocabulary (merchant names, categories, amounts).

**Latency:**
- Depends on hardware. On a modern GPU, faster-whisper can transcribe faster than real-time. On mobile CPUs, expect higher latency; quantized `whisper.cpp` models are needed.
- `whisper.cpp` supports streaming examples, but real-time on mobile requires careful tuning.

**Cost:**
- No per-minute API cost; pays for infrastructure, electricity, GPU/CPU, and operational burden.
- Deepgram self-hosted requires an Enterprise contract.
- Cloud GPU cost example: a small always-on GPU instance can exceed cloud API costs unless volume is high.

**Privacy / data retention:**
- Best-in-class privacy: audio and transcripts never leave the device/infra (unless you choose to send them to the LLM afterward).
- Note: the map already says financial data will be sent to a cloud LLM, so the STT step could be the only on-prem component if privacy is a hard requirement.

**Mobile/PWA integration:**
- `whisper.cpp` has WebAssembly, iOS, and Android examples, making it viable for a future native app or advanced PWA.
- Running a `large` model in a mobile browser is impractical; `tiny`/`base` quantized models are feasible but less accurate.
- Requires building and shipping model binaries, complicating updates.

**Pros:** Maximum privacy, no usage limits, no vendor lock-in, can run offline.
**Cons:** Highest operational burden, latency/accuracy trade-offs on mobile, requires ML-ops expertise, model updates are your responsibility.

## 5. Recommendation for the Project

Given the map constraints:

1. **Cloud is acceptable.** The project already sends financial data to cloud LLMs, so the incremental privacy risk of a cloud STT API is small if we choose a provider with clear data policies.
2. **Spanish/English mixed input is important.** AssemblyAI has the most explicit Mexico/Spanglish documentation; Deepgram and OpenAI are strong alternatives but do not advertise Mexican dialect support as clearly.
3. **Mobile browser is the primary target.** Web Speech API is insufficient due to inconsistent iOS/Android support. A server-side STT call from the PWA is more reliable.
4. **Cost is likely low at startup scale.** All three cloud APIs are ~$0.003–$0.006/min — negligible for a beta with a few hundred users.

### Proposed decision path

1. **Short-term prototype (PWA):** Use **OpenAI `gpt-4o-transcribe`** or **Deepgram `nova-3` Multilingual**.
   - Choose OpenAI if the team wants a single vendor for both STT and LLM.
   - Choose Deepgram if dedicated STT features (smart formatting, redaction, keyterms) are useful.
2. **Short-term prototype if Mexico/Spanglish accuracy is critical:** Use **AssemblyAI `universal-3.5-pro`** because it explicitly documents Mexican Spanish and Spanglish.
3. **Build an abstraction layer** so the STT provider can be swapped without changing the mobile client.
4. **Long-term / privacy pivot:** Evaluate **whisper.cpp on-device** or **Deepgram self-hosted** once usage volume justifies the infrastructure cost or if regulators/users demand on-device processing.

## 6. Open Questions / Next Steps

- [ ] Record 50–100 representative Mexican Spanish/Spanglish finance utterances (e.g., “gasté trescientos pesos en Oxxo,” “paid $45.50 at Starbucks”) and run an eval across OpenAI, Deepgram, and AssemblyAI.
- [ ] Decide whether the MVP is a PWA or native app. Native apps can use on-device STT more easily; PWAs are constrained to Web APIs.
- [ ] Confirm whether the project requires PCI/financial-data compliance beyond what cloud STT providers offer.
- [ ] Evaluate whether `gpt-realtime-whisper` streaming latency justifies its 2–3× cost premium over file-based transcription for short finance utterances.
- [ ] Decide if a backend proxy for STT is acceptable (adds server latency but protects API keys).

## 7. Sources

1. OpenAI — Speech to Text guide: <https://platform.openai.com/docs/guides/speech-to-text>
2. OpenAI — Realtime transcription guide: <https://platform.openai.com/docs/guides/realtime-transcription>
3. OpenAI — API pricing: <https://platform.openai.com/docs/pricing>
4. OpenAI — Data controls / Your data: <https://platform.openai.com/docs/guides/your-data>
5. OpenAI — Whisper GitHub (languages, models, requirements): <https://github.com/openai/whisper>
6. Deepgram — Pre-recorded Audio guide: <https://developers.deepgram.com/docs/pre-recorded-audio>
7. Deepgram — Language support: <https://developers.deepgram.com/docs/language>
8. Deepgram — Pricing: <https://deepgram.com/pricing>
9. Deepgram — Self-hosted introduction: <https://developers.deepgram.com/docs/self-hosted-introduction>
10. AssemblyAI — Speech-to-Text quickstart: <https://www.assemblyai.com/docs/speech-to-text>
11. AssemblyAI — Supported languages (Mexican Spanish / Spanglish): <https://www.assemblyai.com/docs/speech-to-text/supported-languages>
12. AssemblyAI — Pricing: <https://www.assemblyai.com/pricing>
13. MDN — Web Speech API: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API>
14. MDN — SpeechRecognition: <https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition>
15. Can I Use — Speech Recognition API: <https://caniuse.com/speech-recognition>
16. whisper.cpp — GitHub (mobile, WebAssembly, Metal, CUDA): <https://github.com/ggerganov/whisper.cpp>
17. faster-whisper — GitHub: <https://github.com/SYSTRAN/faster-whisper>
