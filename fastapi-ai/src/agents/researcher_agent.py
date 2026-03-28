"""
Researcher Agent: Hybrid Search (Vector + Graph).

Thực hiện truy xuất song song:
1. Vector Search trên ChromaDB → top candidates
2. Lọc theo cosine distance
3. Graph Expansion trên Neo4j (Small-to-Big + Cross-refs)
4. Tổng hợp context entries
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor

from src.config import VECTOR_TOP_K, RERANK_TOP_K
from src.database.chroma_client import ChromaClient
from src.database.neo4j_client import Neo4jClient


class ResearcherAgent:
    """Hybrid Search: Vector + Graph Expansion."""

    def __init__(self):
        self.chroma = ChromaClient()
        self.neo4j = Neo4jClient()
        self._executor = ThreadPoolExecutor(max_workers=2)

    async def research(self, question: str) -> dict:
        """
        Thực hiện truy xuất song song và tổng hợp ngữ cảnh.

        Returns:
            {
                "context": str,
                "context_entries": list[dict],
                "stats": {"vector_candidates", "graph_nodes", "context_length"}
            }
        """
        loop = asyncio.get_event_loop()

        # Bước 1: Vector Search (chạy trong thread pool vì blocking I/O)
        candidates = await loop.run_in_executor(
            self._executor,
            self.chroma.search,
            question,
            VECTOR_TOP_K,
        )

        # Bước 2: Lọc theo cosine distance (top-k nhỏ nhất)
        sorted_candidates = sorted(candidates, key=lambda x: x["distance"])
        top_results = sorted_candidates[:RERANK_TOP_K]

        # Bước 3: Trích xuất graph_node_ids
        graph_node_ids = [
            r["metadata"].get("graph_node_id", r["id"])
            for r in top_results
        ]

        # Bước 4: Graph Expansion (Small-to-Big + Cross-refs)
        context_entries = await loop.run_in_executor(
            self._executor,
            self.neo4j.expand_context,
            graph_node_ids,
        )

        # Bước 5: Tổng hợp context string
        context = self._build_context(context_entries)

        return {
            "context": context,
            "context_entries": context_entries,
            "stats": {
                "vector_candidates": len(candidates),
                "top_results": len(top_results),
                "graph_nodes": len(context_entries),
                "context_length": len(context),
            },
        }

    def _build_context(self, entries: list[dict]) -> str:
        """Gom context entries thành chuỗi có cấu trúc."""
        sections = []

        direct = [e for e in entries if e["source"] == "direct_match"]
        parents = [e for e in entries if e["source"] == "parent_dieu"]
        crossrefs = [e for e in entries if e["source"] == "cross_reference"]

        if direct:
            sections.append("═══ KẾT QUẢ TÌM KIẾM TRỰC TIẾP ═══")
            for e in direct:
                header = f"\n📌 [{e['type']}] {e['path']}"
                if e["title"]:
                    header += f" - {e['title']}"
                sections.append(header)
                if e["content"]:
                    sections.append(e["content"])

        if parents:
            sections.append("\n═══ ĐIỀU LUẬT CHA (NGỮ CẢNH ĐẦY ĐỦ) ═══")
            for e in parents:
                header = f"\n📋 {e['title']}"
                if e["path"]:
                    header += f" ({e['path']})"
                sections.append(header)
                if e["content"]:
                    sections.append(e["content"])

        if crossrefs:
            sections.append("\n═══ ĐIỀU KHOẢN THAM CHIẾU LIÊN QUAN ═══")
            for e in crossrefs:
                header = f"\n🔗 [{e['type']}] {e['path']}"
                if e["title"]:
                    header += f" - {e['title']}"
                sections.append(header)
                if e["content"]:
                    sections.append(e["content"])

        return "\n".join(sections)
