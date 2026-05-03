from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""


@dataclass
class PageContent:
    url: str
    title: str
    text: str
    status_code: int
    error: Optional[str] = None


@dataclass
class CompetitorProfile:
    name: str
    source_url: str
    pricing_summary: str
    key_features: List[str]
    positioning: str
    confidence: float
    data_quality_notes: str = ""


def search_web(query: str, max_results: int = 8) -> List[Dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []
    results: List[Dict[str, Any]] = []
    try:
        with DDGS() as ddgs:
            items = ddgs.text(q, max_results=max_results)
            for item in items:
                sr = SearchResult(
                    title=str(item.get("title") or "").strip(),
                    url=str(item.get("href") or "").strip(),
                    snippet=str(item.get("body") or "").strip(),
                )
                if sr.url:
                    results.append(asdict(sr))
    except Exception:
        return []
    return results


def fetch_page(url: str, timeout_sec: float = 12.0, max_chars: int = 30000) -> Dict[str, Any]:
    cleaned_url = (url or "").strip()
    if not cleaned_url:
        return asdict(
            PageContent(
                url="",
                title="",
                text="",
                status_code=0,
                error="empty_url",
            )
        )
    try:
        with httpx.Client(follow_redirects=True, timeout=timeout_sec) as client:
            resp = client.get(
                cleaned_url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0 Safari/537.36"
                    )
                },
            )
        soup = BeautifulSoup(resp.text or "", "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.extract()
        text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True)).strip()
        page = PageContent(
            url=cleaned_url,
            title=(soup.title.string.strip() if soup.title and soup.title.string else ""),
            text=text[:max_chars],
            status_code=resp.status_code,
            error=None if resp.status_code < 400 else f"http_{resp.status_code}",
        )
        return asdict(page)
    except Exception as exc:
        return asdict(
            PageContent(
                url=cleaned_url,
                title="",
                text="",
                status_code=0,
                error=str(exc),
            )
        )


def extract_competitor_pricing(
    page_content: Dict[str, Any],
    competitor_name: Optional[str] = None,
) -> Dict[str, Any]:
    text = str(page_content.get("text") or "")
    name = (competitor_name or page_content.get("title") or "Competitor").strip()
    url = str(page_content.get("url") or "")
    if not text:
        profile = CompetitorProfile(
            name=name,
            source_url=url,
            pricing_summary="No pricing content could be extracted from source page.",
            key_features=[],
            positioning="Unknown",
            confidence=0.15,
            data_quality_notes="empty_page_content",
        )
        return asdict(profile)

    money_matches = re.findall(r"(?:\$|USD\s?)\s?\d+(?:[.,]\d{1,2})?(?:\s?/\s?(?:mo|month|user|seat|year))?", text, flags=re.I)
    tier_keywords = re.findall(r"\b(free|starter|pro|business|enterprise|team|premium)\b", text, flags=re.I)
    feature_sentences = re.findall(
        r"([^.]{0,60}\b(?:feature|automation|integration|analytics|dashboard|workflow|collaboration|api)\b[^.]{0,120}\.)",
        text,
        flags=re.I,
    )
    pricing_bits = []
    if money_matches:
        pricing_bits.append("Observed price markers: " + ", ".join(dict.fromkeys(money_matches[:8])))
    if tier_keywords:
        tiers = ", ".join(dict.fromkeys([k.lower() for k in tier_keywords[:10]]))
        pricing_bits.append(f"Detected tier labels: {tiers}.")
    if not pricing_bits:
        pricing_bits.append("Pricing markers were not clearly detected on the fetched page.")

    positioning = "B2B SaaS project/collaboration tool"
    if "issue" in text.lower() or "kanban" in text.lower():
        positioning = "Engineering workflow and issue tracking"
    elif "wiki" in text.lower() or "docs" in text.lower():
        positioning = "Documentation-centric collaboration platform"

    confidence = 0.35
    if money_matches:
        confidence += 0.25
    if feature_sentences:
        confidence += 0.20
    if page_content.get("error") is None:
        confidence += 0.10
    confidence = max(0.0, min(0.95, confidence))

    profile = CompetitorProfile(
        name=name,
        source_url=url,
        pricing_summary=" ".join(pricing_bits),
        key_features=[s.strip() for s in feature_sentences[:6]],
        positioning=positioning,
        confidence=confidence,
        data_quality_notes="" if confidence >= 0.5 else "low_confidence_extraction",
    )
    return asdict(profile)
