# Kosmo Notion Vision Synthesis - 2026-06-14

Status time: 2026-06-14 00:14 Europe/Zurich  
Source mode: Notion read-only synthesis  
Primary Notion source: `AI (2)` (`https://app.notion.com/p/366c5f77d5f78023843eec81d63ea890`)  
Additional Notion sources:

- `AI-Scan 2026-06-13` (`https://app.notion.com/p/37ec5f77d5f7816483c2c7bca9367540`)
- `Prepare-Scan 2026-06-13` (`https://app.notion.com/p/37ec5f77d5f781108297e2d704b9ddd4`)

Searches: `ArchitekturKosmos KosmoZentrale Odysseus Kosmo`, `KosmoData KosmoReferences KosmoAsset ArchitekturKosmos`

## Confirmed From Notion

- ArchitectureKosmos is framed as a node-based architecture workflow system, not only a website or database.
- The core hierarchy includes KosmoZentrale / KI Kosmo, KosmoDesign, KosmoPrepare, KosmoDraw/Vis/Publish and KosmoData.
- The workflow separates manual actions, manually adjustable pipeline nodes, programmed pipeline-node automation, internet-capable KI agents, local KI memory and KI generators.
- KosmoPrepare is intended to build a digital base model and design dossier from competition PDFs, location data, planning rules, site/context information, 2D/3D basis imports and research.
- KosmoDesign/Draw/Vis/Publish is intended to run through Blender-centric design, AR/sketch workflows, rendering, material workflows, AI image variants, 2D plan generation, layout generation and export.
- The architecture database is intended to provide reference projects, including images, plans and texts, usable directly inside Blender and as a reasoning basis for visual, plan and layout generation.
- KosmoData is explicitly present as project database and asset database.
- Odysseus is noted as a possible KI workspace foundation for Kosmo.

## Alignment With Current Repo Work

- Current KosmoReferences/KosmoAsset work matches the Notion vision: references are not just text records, but future project packages with media, plans, models, material/structure evidence and asset extraction paths.
- The local LLM / Odysseus role matches Notion's local KI memory/generator categories, but current repo guardrails correctly keep it in metadata-review mode until source-root and rights issues are resolved.
- The current worker hierarchy matches the Notion split: smart overseers handle reasoning, review and gates; local models handle repeatable metadata/fleissarbeit only inside strict boundaries.
- The new Source-Root Unlock Runbook is necessary because Notion's intended database/reference workflow depends on real private source access, but current diagnostics still show no probable large private library.

## Current Gap Against Vision

- The private book/ETH/HSLU/OneDrive library is not unlocked as a trustworthy source root.
- KosmoData has the conceptual mandate, but private ingestion must remain blocked until the real source root is selected and the guard allows private diagnostics.
- Blender/AR/render/generative workflows remain downstream. They should not be treated as ready until references/assets have provenance, rights and source-traceable evidence.
- Odysseus can be a workspace layer, but it must consume guarded task packs rather than operate freely over private files.

## Scan-Derived Technical Priorities

- KosmoPrepare M2: MarkItDown is the strongest immediate candidate for local document-to-Markdown extraction.
- KosmoPrepare M2 fallback: DeepSeek-OCR / document vision OCR is relevant for scanned pages, but license and local setup must be checked before integration.
- KosmoPrepare M4: Qwen3-Embedding and reranking are relevant for future local RAG, but they are not a source-root unlock substitute.
- KosmoPublish Toolkit 5: Paper2Poster is a strong architectural analogy for poster/layout generation; it should be studied as a layout-planner pattern, not directly adopted without an asset adapter.
- KosmoPublish / 2D plan pipeline: IfcOpenShell remains a concrete IFC geometry foundation for later plan/vector workflows.
- Odysseus was again classified as a possible Kosmo workspace/UI foundation, not as a direct KosmoPrepare engine.

## Recommended Next Architecture

- KosmoZentrale remains the control/memory plane.
- KosmoReferences becomes the curated reference-project layer: Villa Savoye, Sogn Benedetg and Ingenbohl stay as pilot references.
- KosmoAsset becomes the element/texture/model library layer, populated only after source and rights gates pass.
- Odysseus/local LLM workers become metadata workers under `worker_boundary_pack_guard_passed`, not autonomous source readers.
- Codex Central and Claude/KosmoOverseer remain review, challenge, code, provenance and system-design overseers.
- MarkItDown can be tested later as a local KosmoPrepare document extraction tool, but not on private/source-dependent material until source-root policy is cleared.

## Source Notes

- Notion page `AI (2)` contains the clearest available project map and describes the module vocabulary, toolkits and intended Blender/database/reference integration.
- Notion page `AI-Scan 2026-06-13` adds KosmoPublish candidates such as Paper2Poster and IfcOpenShell.
- Notion page `Prepare-Scan 2026-06-13` adds KosmoPrepare candidates such as MarkItDown, DeepSeek-OCR and Qwen3-Embedding.
- Notion search did not expose a separate richer KosmoReferences/KosmoAsset page in this pass; local repo artifacts remain the stronger source for current implementation status.
- This synthesis is paraphrased. It does not copy long Notion passages into Git.
