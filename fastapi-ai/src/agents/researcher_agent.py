import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from src.config import RERANK_TOP_K, VECTOR_TOP_K
from src.database.chroma_client import ChromaClient
from src.database.neo4j_client import Neo4jClient


class ResearcherAgent:
    """Hybrid search: vector + graph expansion."""

    def __init__(self):
        self.chroma = ChromaClient()
        self.neo4j = Neo4jClient()
        self._executor = ThreadPoolExecutor(max_workers=2)

    async def research(
        self,
        question: str,
        document_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        loop = asyncio.get_event_loop()
        search_query = self._build_search_query(question, document_context)

        candidates = await loop.run_in_executor(
            self._executor,
            self.chroma.search,
            search_query,
            VECTOR_TOP_K,
        )
        sorted_candidates = sorted(candidates, key=lambda item: item["distance"])
        top_results = sorted_candidates[:RERANK_TOP_K]
        graph_node_ids = [
            item["metadata"].get("graph_node_id", item["id"])
            for item in top_results
        ]

        context_entries = await loop.run_in_executor(
            self._executor,
            self.neo4j.expand_context,
            graph_node_ids,
        )
        context = self._build_context(context_entries, document_context)

        return {
            "context": context,
            "context_entries": context_entries,
            "stats": {
                "vector_candidates": len(candidates),
                "top_results": len(top_results),
                "graph_nodes": len(context_entries),
                "context_length": len(context),
                "document_context": bool(document_context),
            },
        }

    def _build_search_query(
        self,
        question: str,
        document_context: dict[str, Any] | None,
    ) -> str:
        if not document_context:
            return question

        title = str(document_context.get("documentTitle", "")).strip()
        summary = str(document_context.get("documentSummary", "")).strip()
        highlights = document_context.get("highlights", []) or []

        query_parts = [question]
        if title:
            query_parts.append(f"Tai lieu dang xem: {title}")
        if summary:
            query_parts.append(f"Tom tat tai lieu: {summary}")
        if highlights:
            query_parts.append("Diem lien quan: " + "; ".join(str(item) for item in highlights[:3]))
        return "\n".join(query_parts)

    def _build_context(
        self,
        entries: list[dict[str, Any]],
        document_context: dict[str, Any] | None,
    ) -> str:
        sections = []

        if document_context:
            title = str(document_context.get("documentTitle", "")).strip()
            summary = str(document_context.get("documentSummary", "")).strip()
            source_name = str(document_context.get("sourceName", "")).strip()
            document_number = str(document_context.get("documentNumber", "")).strip()
            highlights = document_context.get("highlights", []) or []
            roadmap = document_context.get("roadmap", []) or []

            pinned = ["=== TAI LIEU DANG XEM ==="]
            if title:
                pinned.append(f"Tieu de: {title}")
            if document_number:
                pinned.append(f"So hieu: {document_number}")
            if source_name:
                pinned.append(f"Nguon: {source_name}")
            if summary:
                pinned.append(f"Tom tat: {summary}")
            if highlights:
                pinned.append("Noi dung chinh:")
                pinned.extend(f"- {item}" for item in highlights[:4])
            if roadmap:
                pinned.append("Lo trinh lien quan:")
                pinned.extend(
                    f"- Buoc {item.get('step')}: {item.get('title')} - {item.get('description')}"
                    for item in roadmap[:3]
                )
            sections.append("\n".join(pinned))

        direct = [entry for entry in entries if entry["source"] == "direct_match"]
        parents = [entry for entry in entries if entry["source"] == "parent_dieu"]
        crossrefs = [entry for entry in entries if entry["source"] == "cross_reference"]

        if direct:
            sections.append("=== KET QUA TRUY XUAT TRUC TIEP ===")
            for entry in direct:
                header = f"[{entry['type']}] {entry['path']}"
                if entry["title"]:
                    header += f" - {entry['title']}"
                sections.append(header)
                if entry["content"]:
                    sections.append(entry["content"])

        if parents:
            sections.append("=== DIEU LUAT CHA / NGU CANH DAY DU ===")
            for entry in parents:
                header = entry["title"] or entry["path"]
                sections.append(header)
                if entry["content"]:
                    sections.append(entry["content"])

        if crossrefs:
            sections.append("=== THAM CHIEU LIEN QUAN ===")
            for entry in crossrefs:
                header = f"[{entry['type']}] {entry['path']}"
                if entry["title"]:
                    header += f" - {entry['title']}"
                sections.append(header)
                if entry["content"]:
                    sections.append(entry["content"])

        return "\n\n".join(section for section in sections if section)
