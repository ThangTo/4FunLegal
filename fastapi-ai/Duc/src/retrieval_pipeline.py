"""
Retrieval Pipeline: Truy xuất GraphRAG cho văn bản luật.

Luồng hoạt động:
    1. Nhận câu hỏi pháp lý (ngôn ngữ tự nhiên)
    2. Vector Search: Embed câu hỏi → query ChromaDB → top 20 → rerank → top 5
    3. Graph Traversal: Dùng graph_node_id → Neo4j → lấy Điều cha + tham chiếu chéo
    4. Tổng hợp context
    5. Gọi Gemini API sinh câu trả lời

Sử dụng:
    python src/retrieval_pipeline.py
    python src/retrieval_pipeline.py --question "điều kiện thành lập doanh nghiệp"
"""
import json
from typing import Optional

import chromadb
import google.generativeai as genai
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer

from src.config import (
    CHROMA_COLLECTION_NAME,
    CHROMA_DB_DIR,
    EMBEDDING_MODEL_NAME,
    GEMINI_API_KEY,
    GEMINI_MODEL_NAME,
    NEO4J_PASSWORD,
    NEO4J_URL,
    NEO4J_USER,
    RERAN_TOP_K,
    VECTOR_TOP_K,
)


# ==============================================================================
# BƯỚC 1: KHỞI TẠO CÁC KẾT NỐI
# ==============================================================================

class RetrievalPipeline:
    """Pipeline truy xuất GraphRAG cho văn bản luật."""

    def __init__(self):
        print("=" * 60)
        print("KHỞI TẠO RETRIEVAL PIPELINE")
        print("=" * 60)

        # Embedding model
        print("[INIT] Tải embedding model...")
        self.embed_model = SentenceTransformer(EMBEDDING_MODEL_NAME)

        # ChromaDB
        print(f"[INIT] Kết nối ChromaDB: {CHROMA_DB_DIR}")
        self.chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        self.collection = self.chroma_client.get_collection(
            name=CHROMA_COLLECTION_NAME
        )
        print(f"  → Collection '{CHROMA_COLLECTION_NAME}': {self.collection.count()} vectors")

        # Neo4j
        print(f"[INIT] Kết nối Neo4j: {NEO4J_URL}")
        self.neo4j_driver = GraphDatabase.driver(
            NEO4J_URL, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        with self.neo4j_driver.session() as session:
            session.run("RETURN 1")
        print("  → Neo4j: ✓ kết nối thành công")

        # Gemini
        print(f"[INIT] Cấu hình Gemini API: {GEMINI_MODEL_NAME}")
        genai.configure(api_key=GEMINI_API_KEY)
        self.gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)

        print("[INIT] ✓ Sẵn sàng!\n")

    def close(self):
        """Đóng kết nối."""
        self.neo4j_driver.close()

    # ==========================================================================
    # BƯỚC 2: VECTOR SEARCH + RERANK
    # ==========================================================================

    def vector_search(self, question: str, top_k: int = VECTOR_TOP_K) -> list[dict]:
        """
        Tìm kiếm ngữ nghĩa trên ChromaDB.

        Args:
            question: Câu hỏi pháp lý.
            top_k: Số kết quả lấy từ ChromaDB.

        Returns:
            Danh sách kết quả: [{id, document, distance, metadata}, ...]
        """
        print(f"[BƯỚC 2a] Vector Search: top_k={top_k}")
        print(f"  Query: \"{question}\"")

        # Embed câu hỏi
        query_embedding = self.embed_model.encode([question]).tolist()

        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )

        # Chuyển đổi format
        candidates = []
        for i in range(len(results["ids"][0])):
            candidates.append({
                "id": results["ids"][0][i],
                "document": results["documents"][0][i],
                "distance": results["distances"][0][i],
                "metadata": results["metadatas"][0][i],
            })

        print(f"  → Tìm thấy {len(candidates)} candidates")
        return candidates

    def rerank(self, question: str, candidates: list[dict],
               top_k: int = RERAN_TOP_K) -> list[dict]:
        """
        Rerank candidates bằng Gemini API.

        Dùng LLM để đánh giá mức độ liên quan thực sự của mỗi candidate
        so với câu hỏi, thay vì chỉ dựa vào cosine similarity.

        Args:
            question: Câu hỏi gốc.
            candidates: Danh sách candidates từ vector search.
            top_k: Số kết quả giữ lại sau rerank.

        Returns:
            Top-k candidates đã rerank.
        """
        print(f"[BƯỚC 2b] Rerank: {len(candidates)} candidates → top {top_k}")

        if len(candidates) <= top_k:
            return candidates

        # Tạo prompt rerank cho Gemini
        candidates_text = ""
        for i, c in enumerate(candidates):
            path = c["metadata"].get("full_path", "")
            doc_preview = c["document"][:200]
            candidates_text += f"[{i}] ({path}) {doc_preview}\n\n"

        rerank_prompt = f"""Bạn là chuyên gia pháp luật Việt Nam. Cho câu hỏi pháp lý sau:

CÂU HỎI: {question}

Dưới đây là {len(candidates)} đoạn trích từ Luật Doanh nghiệp 2020. Hãy đánh giá và XẾP HẠNG theo mức độ liên quan đến câu hỏi.

{candidates_text}

Trả về CHÍNH XÁC một JSON array chứa index của top {top_k} đoạn liên quan nhất, theo thứ tự từ liên quan NHẤT đến ÍT liên quan hơn.
Ví dụ: [3, 7, 1, 15, 0]

CHỈ trả về JSON array, không giải thích gì thêm."""

        try:
            response = self.gemini_model.generate_content(rerank_prompt)
            response_text = response.text.strip()

            # Parse JSON array từ response
            # Xử lý trường hợp Gemini trả về markdown code block
            if "```" in response_text:
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            ranked_indices = json.loads(response_text)

            # Validate indices
            valid_indices = [
                idx for idx in ranked_indices
                if isinstance(idx, int) and 0 <= idx < len(candidates)
            ][:top_k]

            if valid_indices:
                reranked = [candidates[i] for i in valid_indices]
                print(f"  → Rerank thành công: giữ lại {len(reranked)} kết quả")
                for i, r in enumerate(reranked):
                    path = r["metadata"].get("full_path", "")
                    print(f"    [{i+1}] {path} (distance: {r['distance']:.4f})")
                return reranked

        except Exception as e:
            print(f"  [WARN] Rerank thất bại: {e}")
            print(f"  → Fallback: lấy top {top_k} theo cosine distance")

        # Fallback: sort theo distance (nhỏ nhất = giống nhất)
        sorted_candidates = sorted(candidates, key=lambda x: x["distance"])
        return sorted_candidates[:top_k]

    # ==========================================================================
    # BƯỚC 3: GRAPH TRAVERSAL
    # ==========================================================================

    def graph_traversal(self, graph_node_ids: list[str]) -> list[dict]:
        """
        Duyệt đồ thị Neo4j để mở rộng ngữ cảnh.

        Cho mỗi graph_node_id:
        1. Lấy nội dung node gốc
        2. Lấy Điều cha chứa nó (nếu node là Khoản/Điểm)
        3. Lấy tất cả node mà nó THAM_CHIEU_TOI

        Args:
            graph_node_ids: Danh sách graph_node_id từ vector search.

        Returns:
            Danh sách context entries.
        """
        print(f"[BƯỚC 3] Graph Traversal: {len(graph_node_ids)} nodes")

        context_entries = []
        seen_ids = set()

        with self.neo4j_driver.session() as session:
            for node_id in graph_node_ids:
                if node_id in seen_ids:
                    continue

                # ── Query 1: Lấy node gốc + Điều cha + Chương cha ──
                parent_query = """
                MATCH (n) WHERE n.id = $node_id
                OPTIONAL MATCH (n)-[:THUOC]->(dieu:Dieu)
                OPTIONAL MATCH (n)-[:THUOC]->(parent)
                OPTIONAL MATCH (dieu)-[:THUOC]->(chuong:Chuong)
                RETURN
                    n.id AS node_id,
                    labels(n) AS node_labels,
                    n.content AS node_content,
                    n.title AS node_title,
                    n.number AS node_number,
                    n.full_path AS node_path,
                    dieu.id AS dieu_id,
                    dieu.content AS dieu_content,
                    dieu.title AS dieu_title,
                    dieu.number AS dieu_number,
                    dieu.full_path AS dieu_path,
                    chuong.title AS chuong_title,
                    chuong.number AS chuong_number
                """
                result = session.run(parent_query, node_id=node_id)
                record = result.single()

                if not record:
                    print(f"  [WARN] Node không tồn tại: {node_id}")
                    continue

                # Thêm node gốc
                entry = {
                    "source": "direct_match",
                    "node_id": record["node_id"],
                    "type": record["node_labels"][0] if record["node_labels"] else "",
                    "path": record["node_path"] or "",
                    "title": record["node_title"] or "",
                    "content": record["node_content"] or "",
                }
                context_entries.append(entry)
                seen_ids.add(node_id)

                # Thêm Điều cha (nếu node là Khoản/Điểm)
                if record["dieu_id"] and record["dieu_id"] not in seen_ids:
                    dieu_entry = {
                        "source": "parent_dieu",
                        "node_id": record["dieu_id"],
                        "type": "Dieu",
                        "path": record["dieu_path"] or "",
                        "title": f"Điều {record['dieu_number']}. {record['dieu_title'] or ''}",
                        "content": record["dieu_content"] or "",
                    }
                    # Lấy tất cả Khoản con của Điều cha
                    children_query = """
                    MATCH (k)-[:THUOC]->(d:Dieu {id: $dieu_id})
                    RETURN k.id AS kid, k.content AS kcontent,
                           k.number AS knumber, labels(k) AS klabels,
                           k.full_path AS kpath
                    ORDER BY k.number
                    """
                    children_result = session.run(
                        children_query, dieu_id=record["dieu_id"]
                    )
                    children_texts = []
                    for child in children_result:
                        child_text = child["kcontent"] or ""
                        if child_text:
                            label = child["klabels"][0] if child["klabels"] else ""
                            children_texts.append(
                                f"{label} {child['knumber']}: {child_text}"
                            )

                    if children_texts:
                        dieu_entry["content"] += "\n" + "\n".join(children_texts)

                    context_entries.append(dieu_entry)
                    seen_ids.add(record["dieu_id"])

                    chuong_info = ""
                    if record["chuong_title"]:
                        chuong_info = f" (Chương {record['chuong_number']}: {record['chuong_title']})"
                    print(f"    + Điều cha: Điều {record['dieu_number']}{chuong_info}")

                # ── Query 2: Lấy tham chiếu chéo ──
                crossref_query = """
                MATCH (n)-[:THAM_CHIEU_TOI]->(ref)
                WHERE n.id = $node_id
                RETURN
                    ref.id AS ref_id,
                    labels(ref) AS ref_labels,
                    ref.content AS ref_content,
                    ref.title AS ref_title,
                    ref.number AS ref_number,
                    ref.full_path AS ref_path
                """
                crossref_result = session.run(crossref_query, node_id=node_id)

                for ref_record in crossref_result:
                    ref_id = ref_record["ref_id"]
                    if ref_id in seen_ids:
                        continue

                    ref_type = ref_record["ref_labels"][0] if ref_record["ref_labels"] else ""
                    ref_entry = {
                        "source": "cross_reference",
                        "node_id": ref_id,
                        "type": ref_type,
                        "path": ref_record["ref_path"] or "",
                        "title": ref_record["ref_title"] or "",
                        "content": ref_record["ref_content"] or "",
                    }

                    # Nếu tham chiếu tới Điều, lấy thêm Khoản con
                    if ref_type == "Dieu":
                        children_query2 = """
                        MATCH (k)-[:THUOC]->(d:Dieu {id: $dieu_id})
                        RETURN k.content AS kcontent, k.number AS knumber,
                               labels(k) AS klabels
                        ORDER BY k.number
                        """
                        children_result2 = session.run(
                            children_query2, dieu_id=ref_id
                        )
                        extra = []
                        for child in children_result2:
                            if child["kcontent"]:
                                label = child["klabels"][0] if child["klabels"] else ""
                                extra.append(
                                    f"{label} {child['knumber']}: {child['kcontent']}"
                                )
                        if extra:
                            ref_entry["content"] += "\n" + "\n".join(extra)

                    context_entries.append(ref_entry)
                    seen_ids.add(ref_id)
                    print(f"    → Tham chiếu: {ref_record['ref_path']}")

        print(f"  → Tổng context entries: {len(context_entries)}")
        return context_entries

    # ==========================================================================
    # BƯỚC 4: TỔNG HỢP CONTEXT
    # ==========================================================================

    def build_context(self, context_entries: list[dict]) -> str:
        """
        Gom tất cả text từ Neo4j thành chuỗi context hoàn chỉnh.

        Args:
            context_entries: Danh sách entries từ graph traversal.

        Returns:
            Chuỗi context formatted.
        """
        print(f"[BƯỚC 4] Tổng hợp context từ {len(context_entries)} entries")

        sections = []

        # Nhóm theo source type
        direct = [e for e in context_entries if e["source"] == "direct_match"]
        parents = [e for e in context_entries if e["source"] == "parent_dieu"]
        crossrefs = [e for e in context_entries if e["source"] == "cross_reference"]

        # Direct matches
        if direct:
            sections.append("═══ KẾT QUẢ TÌM KIẾM TRỰC TIẾP ═══")
            for entry in direct:
                header = f"\n📌 [{entry['type']}] {entry['path']}"
                if entry["title"]:
                    header += f" - {entry['title']}"
                sections.append(header)
                if entry["content"]:
                    sections.append(entry["content"])

        # Parent Điều
        if parents:
            sections.append("\n═══ ĐIỀU LUẬT CHA (NGỮ CẢNH ĐẦY ĐỦ) ═══")
            for entry in parents:
                header = f"\n📋 {entry['title']}"
                if entry["path"]:
                    header += f" ({entry['path']})"
                sections.append(header)
                if entry["content"]:
                    sections.append(entry["content"])

        # Cross references
        if crossrefs:
            sections.append("\n═══ ĐIỀU KHOẢN THAM CHIẾU LIÊN QUAN ═══")
            for entry in crossrefs:
                header = f"\n🔗 [{entry['type']}] {entry['path']}"
                if entry["title"]:
                    header += f" - {entry['title']}"
                sections.append(header)
                if entry["content"]:
                    sections.append(entry["content"])

        context = "\n".join(sections)
        print(f"  → Context length: {len(context):,} ký tự")
        return context

    # ==========================================================================
    # BƯỚC 5: GỌI GEMINI API
    # ==========================================================================

    def ask_gemini(self, question: str, context: str) -> str:
        """
        Đưa context + câu hỏi vào Gemini để sinh câu trả lời.

        Args:
            question: Câu hỏi pháp lý gốc.
            context: Chuỗi context đã tổng hợp.

        Returns:
            Câu trả lời từ Gemini.
        """
        print(f"[BƯỚC 5] Gọi Gemini API ({GEMINI_MODEL_NAME})...")

        prompt = f"""Bạn là một Luật sư tư vấn pháp lý chuyên nghiệp và đáng tin cậy tại Việt Nam. 
Nhiệm vụ của bạn là trả lời câu hỏi pháp lý dựa HOÀN TOÀN và CHỈ dựa vào các điều khoản luật được cung cấp bên dưới.

══════════════════════════════════════════
QUY TẮC BẮT BUỘC:
══════════════════════════════════════════
1. CHỈ sử dụng thông tin từ phần "NGỮ CẢNH PHÁP LÝ" bên dưới để trả lời. KHÔNG được bịa thêm điều khoản.
2. PHẢI trích dẫn chính xác số Điều, Khoản, Điểm khi đưa ra nhận định.
3. Nếu ngữ cảnh không đủ để trả lời, hãy nói rõ: "Dựa trên các điều khoản được cung cấp, tôi không tìm thấy quy định trực tiếp về vấn đề này."
4. Trình bày câu trả lời rõ ràng, có cấu trúc, dễ hiểu cho người không chuyên luật.
5. Nếu có nhiều điều khoản liên quan, hãy phân tích mối liên hệ giữa chúng.

══════════════════════════════════════════
NGỮ CẢNH PHÁP LÝ (từ Luật Doanh nghiệp 2020):
══════════════════════════════════════════
{context}

══════════════════════════════════════════
CÂU HỎI CỦA NGƯỜI DÙNG:
══════════════════════════════════════════
{question}

══════════════════════════════════════════
Hãy trả lời chi tiết, có trích dẫn điều khoản cụ thể:"""

        response = self.gemini_model.generate_content(prompt)
        answer = response.text
        print(f"  → Gemini đã trả lời ({len(answer):,} ký tự)")
        return answer

    # ==========================================================================
    # PIPELINE CHÍNH
    # ==========================================================================

    def run(self, question: str) -> dict:
        """
        Chạy toàn bộ retrieval pipeline.

        Args:
            question: Câu hỏi pháp lý.

        Returns:
            Dict chứa question, context, answer, và metadata.
        """
        print("\n" + "═" * 60)
        print(f"  CÂU HỎI: {question}")
        print("═" * 60 + "\n")

        # Bước 2a: Vector Search
        candidates = self.vector_search(question, top_k=VECTOR_TOP_K)

        # Bước 2b: Rerank
        top_results = self.rerank(question, candidates, top_k=RERAN_TOP_K)

        # Trích xuất graph_node_ids
        graph_node_ids = [
            r["metadata"].get("graph_node_id", r["id"])
            for r in top_results
        ]
        print(f"\n  Graph Node IDs: {graph_node_ids}\n")

        # Bước 3: Graph Traversal
        context_entries = self.graph_traversal(graph_node_ids)

        # Bước 4: Tổng hợp context
        context = self.build_context(context_entries)

        # Bước 5: Gọi Gemini
        answer = self.ask_gemini(question, context)

        # Kết quả
        result = {
            "question": question,
            "vector_candidates": len(candidates),
            "reranked_top": len(top_results),
            "graph_nodes_explored": len(context_entries),
            "context_length": len(context),
            "context": context,
            "answer": answer,
        }

        # In kết quả
        print("\n" + "═" * 60)
        print("  CÂU TRẢ LỜI")
        print("═" * 60)
        print(answer)
        print("\n" + "═" * 60)
        print(f"  Thống kê: {result['vector_candidates']} vectors → "
              f"{result['reranked_top']} reranked → "
              f"{result['graph_nodes_explored']} graph nodes → "
              f"{result['context_length']:,} chars context")
        print("═" * 60)

        return result


# ==============================================================================
# ENTRY POINT
# ==============================================================================

def main():
    """Chạy retrieval pipeline interactively."""
    import argparse

    parser = argparse.ArgumentParser(
        description="GraphRAG Retrieval Pipeline - Tư vấn Luật Doanh nghiệp 2020"
    )
    parser.add_argument(
        "--question", "-q",
        type=str,
        help="Câu hỏi pháp lý (nếu không chỉ định, sẽ chạy interactive mode)"
    )
    args = parser.parse_args()

    pipeline = RetrievalPipeline()

    try:
        if args.question:
            # Single question mode
            pipeline.run(args.question)
        else:
            # Interactive mode
            print("\n" + "=" * 60)
            print("  GRAPHRAG RETRIEVAL - CHẾ ĐỘ TƯƠNG TÁC")
            print("  Nhập câu hỏi pháp lý, gõ 'quit' để thoát")
            print("=" * 60)

            while True:
                print()
                question = input("❓ Câu hỏi: ").strip()
                if question.lower() in ("quit", "exit", "q", "thoát"):
                    print("Tạm biệt!")
                    break
                if not question:
                    continue

                pipeline.run(question)

    finally:
        pipeline.close()


if __name__ == "__main__":
    main()
