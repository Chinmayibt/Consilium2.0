from __future__ import annotations

import json
import re
from typing import Any, Dict, TypedDict

from groq import Groq
from langgraph.graph import END, StateGraph

from app.core.config import settings


class RequirementsState(TypedDict, total=False):
    product_name: str
    product_description: str
    target_users: str
    key_features: str
    competitors: str
    constraints: str
    prd: Dict[str, Any]


def _get_client() -> Groq:
    api_key = settings.GROQ_REQUIREMENTS_API_KEY or settings.GROQ_API_KEY
    if not api_key:
        raise RuntimeError(
            "Set GROQ_REQUIREMENTS_API_KEY or GROQ_API_KEY in backend/.env for PRD generation"
        )
    return Groq(api_key=api_key)


# ---------------------------------------------------------------------------
# Root causes of the bad PRD output — and how we fix them:
#
# 1. max_tokens=3500  →  a full PRD needs 7000-8000 tokens. Every section
#    was silently truncated mid-sentence because the model hit the limit.
#    Fix: raise to 8000.
#
# 2. Vague system prompt with no quality bar  →  model defaulted to
#    "React, Angular, or Vue" style hedge lists and generic bullets.
#    Fix: explicit BAD vs GOOD examples inline in the prompt, plus hard
#    rules: one specific technology per layer, real field names, real
#    endpoint paths, measurable SLA values, numbered IDs on requirements.
#
# 3. No instruction to never truncate  →  model cut bullets mid-sentence
#    when approaching its internal length limits.
#    Fix: explicit "complete every sentence" rule in the prompt.
#
# 4. Two-pass generation for long PRDs  →  if the product is complex,
#    one call may still feel rushed. We split into two focused calls:
#    Pass A: narrative sections (overview, problem, users, market,
#            stories, functional/non-functional requirements)
#    Pass B: technical sections (stack, architecture, DB, API, security,
#            performance, deployment, folder structure, milestones, MVP,
#            future)
#    Then merge. Each call gets 8000 tokens and a narrower schema.
#
# 5. No JSON-repair fallback  →  on rare malformed output the agent
#    returned {"raw": "<garbage>"} silently. Fix: retry with an explicit
#    repair prompt.
# ---------------------------------------------------------------------------

# --- Shared quality rules injected into both prompts ---
_QUALITY_RULES = """
QUALITY RULES — violating any of these is unacceptable:
- This is a FULL PRD, not a summary. Do NOT compress, skim, or use terse bullets.
  Expand with concrete examples, rationale, and edge cases until minimums are met.
- Every bullet must be a COMPLETE sentence. Never end mid-sentence.
- Be SPECIFIC and OPINIONATED. Never offer lists of alternatives.
  BAD:  "Use React, Angular, or Vue.js"
  GOOD: "React 18 with TypeScript and Zustand for state management,
         chosen for mature ecosystem and existing team expertise."
- Include REAL names: real competitor names, real library versions,
  real column names, real HTTP method + path pairs.
- Include MEASURABLE thresholds: response times in ms, uptime as %,
  token TTL in minutes, cache TTL in seconds — never vague adjectives.
- Functional requirements use numbered IDs: FR-001, FR-002, etc.
- Non-functional requirements use numbered IDs: NFR-001, NFR-002, etc.
- Return STRICT JSON only. No markdown, no prose outside the JSON object.

MINIMUM DEPTH (count words; under-length output is invalid):
- "overview": at least 110 words.
- "problem_statement": at least 220 words total across its paragraphs.
- "target_users": at least 4 entries; each entry at least 45 words.
- "market_analysis": at least 6 entries; each at least 35 words (name a real product or cite a metric).
- "features": at least 10 entries; each at least 50 words (name the capability, user impact, and success signal).
- "user_stories": at least 10 entries; each includes 3 numbered acceptance criteria.
- "functional_requirements": at least 14 items (FR-001 …) with testable acceptance.
- "non_functional_requirements": at least 10 items (NFR-001 …) with measurable thresholds.

Pass B technical arrays: at least 8 items in tech_stack, database_design, api_design, security,
performance, deployment, folder_structure; at least 6 in system_architecture, milestones,
mvp_scope, future_enhancements. Each string entry must be substantive (not a label-only fragment).
"""

# ---------------------------------------------------------------------------
# PASS A: Narrative / product sections
# ---------------------------------------------------------------------------
_SYSTEM_A = f"""
You are a Principal Product Manager at a top-tier software company writing a
corporate-grade Product Requirements Document (PRD).

{_QUALITY_RULES}

Respond with STRICT JSON matching exactly this schema (honor MINIMUM DEPTH word counts above):
{{
  "overview": "110+ words: product name, core value proposition, target market segment, differentiators, and scope boundaries.",
  "problem_statement": "220+ words in 3 paragraphs: quantified pain, why incumbents fail, opportunity and urgency.",
  "target_users": [
    "Role title — 2-3 sentences describing their daily workflow, specific pain points, and what success looks like for them in this product."
  ],
  "market_analysis": [
    "Specific competitor name or market data point — their weakness and your differentiation. Each item is 2 sentences."
  ],
  "features": [
    "Feature name: what it does, why it matters, and the measurable outcome it produces. 2-3 sentences each."
  ],
  "user_stories": [
    "As a <specific role>, I want to <specific action with detail> so that <measurable benefit>. Acceptance criteria: (1) <criterion> (2) <criterion> (3) <criterion>."
  ],
  "functional_requirements": [
    "FR-001: <specific, testable requirement — include threshold value, role, or SLA where applicable>."
  ],
  "non_functional_requirements": [
    "NFR-001: <quality attribute with measurable threshold, e.g. p99 API latency < 200ms under 5000 concurrent users>."
  ]
}}
""".strip()

# ---------------------------------------------------------------------------
# PASS B: Technical architecture sections
# ---------------------------------------------------------------------------
_SYSTEM_B = f"""
You are a Principal Solutions Architect at a top-tier software company writing
the technical sections of a corporate Product Requirements Document (PRD).

{_QUALITY_RULES}

Additional rules for technical sections:
- tech_stack: one specific technology per layer, with version and rationale.
  Format: "Layer — Technology vX.Y: rationale."
- database_design: include real table/collection names with actual column
  names, types, constraints, and index strategy.
  Format: "table_name: col1 TYPE CONSTRAINT, col2 TYPE, ... Index: col."
- api_design: include HTTP method, path, request body fields, response shape,
  auth requirement, and relevant error codes.
  Format: "METHOD /api/v1/path — body: {{fields}}, response: {{fields}},
           auth: JWT, errors: 401, 422."
- folder_structure: real directory paths and what lives in each.

Respond with STRICT JSON matching exactly this schema:
{{
  "tech_stack": [
    "Layer — Technology vX.Y: one-sentence rationale for choosing it over alternatives."
  ],
  "system_architecture": [
    "Architecture decision or component — rationale and trade-offs considered."
  ],
  "database_design": [
    "table_name: field1 TYPE CONSTRAINT, field2 TYPE DEFAULT val. Relationships: FK. Index: field."
  ],
  "api_design": [
    "METHOD /api/v1/path — body: {{field: type}}, returns: {{field: type}}, auth: JWT Bearer, errors: 401 unauthenticated | 422 validation failed."
  ],
  "security": [
    "Security control — specific implementation detail with library/standard used."
  ],
  "performance": [
    "Performance target — measurable SLA and implementation approach to achieve it."
  ],
  "deployment": [
    "Deployment step or infrastructure decision — specific tooling and configuration."
  ],
  "folder_structure": [
    "path/to/dir/ — what lives here and why it is separated from sibling dirs."
  ],
  "milestones": [
    "Week N-M: milestone name — specific deliverables and definition of done."
  ],
  "mvp_scope": [
    "Feature or capability included in MVP — minimum viable version and what is explicitly deferred to Phase 2."
  ],
  "future_enhancements": [
    "Phase N (Quarter YYYY): enhancement name — business rationale and estimated effort."
  ]
}}
""".strip()


def _build_user_prompt(state: RequirementsState) -> str:
    parts = [f"Product name: {state.get('product_name') or 'Unnamed Product'}"]
    parts.append(f"\nProduct description:\n{state.get('product_description') or 'Not provided.'}")
    if state.get("target_users"):
        parts.append(f"\nTarget users:\n{state['target_users']}")
    if state.get("key_features"):
        parts.append(f"\nKey features requested:\n{state['key_features']}")
    if state.get("competitors"):
        parts.append(f"\nKnown competitors:\n{state['competitors']}")
    if state.get("constraints"):
        parts.append(f"\nConstraints / limitations:\n{state['constraints']}")
    return "\n".join(parts)


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _try_parse(text: str) -> Dict[str, Any] | None:
    try:
        result = json.loads(_strip_fences(text))
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass
    return None


def _repair_json(client: Groq, broken_text: str) -> Dict[str, Any]:
    """Ask the model to fix its own malformed JSON output."""
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": (
                    "The following text is almost-valid JSON but has syntax errors. "
                    "Return ONLY the corrected JSON — no prose, no fences:\n\n"
                    + broken_text[:12000]
                ),
            }
        ],
        temperature=0.0,
        max_tokens=8192,
    )
    raw = resp.choices[0].message.content or ""
    if isinstance(raw, list):
        raw = "".join(p.get("text", "") for p in raw if isinstance(p, dict))
    result = _try_parse(raw)
    return result if result is not None else {"raw": broken_text, "repair_failed": True}


def _call(client: Groq, system: str, user: str) -> Dict[str, Any]:
    """Single Groq call with parse + repair fallback."""
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=8192,
    )
    raw = resp.choices[0].message.content or ""
    if isinstance(raw, list):
        raw = "".join(p.get("text", "") for p in raw if isinstance(p, dict))

    result = _try_parse(raw)
    if result is None:
        result = _repair_json(client, raw)
    return result


def _generate_prd_node(state: RequirementsState) -> RequirementsState:
    client = _get_client()
    user_prompt = _build_user_prompt(state)

    # --- Pass A: narrative sections ---
    part_a = _call(client, _SYSTEM_A, user_prompt)

    # --- Pass B: technical sections ---
    # Give the technical pass the PRD context from Pass A so it stays consistent.
    tech_context = (
        f"{user_prompt}\n\n"
        f"Product overview already written:\n{part_a.get('overview', '')}\n\n"
        f"Key features already identified:\n"
        + "\n".join(f"- {f}" for f in (part_a.get("features") or [])[:10])
    )
    part_b = _call(client, _SYSTEM_B, tech_context)

    # Merge both passes into one PRD dict
    prd = {**part_a, **part_b}

    # Sanity-check: if either pass failed to parse, surface the error
    if "raw" in part_a:
        prd["_pass_a_error"] = "JSON parse failed for narrative sections"
    if "raw" in part_b:
        prd["_pass_b_error"] = "JSON parse failed for technical sections"

    return {**state, "prd": prd}


# ---------------------------------------------------------------------------
# Graph wiring — public API is unchanged
# ---------------------------------------------------------------------------
_graph = None


def get_requirements_agent():
    global _graph
    if _graph is None:
        workflow = StateGraph(RequirementsState)
        workflow.add_node("generate_prd", _generate_prd_node)
        workflow.set_entry_point("generate_prd")
        workflow.add_edge("generate_prd", END)
        _graph = workflow.compile()
    return _graph


def run_requirements_agent(inputs: Dict[str, Any]) -> Dict[str, Any]:
    graph = get_requirements_agent()
    result: RequirementsState = graph.invoke(inputs)
    return result["prd"]  # type: ignore[index]