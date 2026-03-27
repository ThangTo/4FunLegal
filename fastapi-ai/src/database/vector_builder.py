"""
Bước 4: Xây dựng Vector Database (ChromaDB).

Module này tạo embeddings cho các chunk văn bản luật bằng
sentence-transformers và lưu vào ChromaDB với metadata liên kết
ngược về Graph Database.
"""
import json

import chromadb
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from src.config import (
    CHROMA_COLLECTION_NAME,
    CHROMA_DB_DIR,
    EMBEDDING_MODEL_NAME,
    PARSED_STRUCTURE_PATH,
)


class VectorBuilder:
    """Xây dựng và quản lý ChromaDB Vector Database."""

    def __init__(self, persist_directory: str, model_name: str):
        print(f"[Vector] Khởi tạo ChromaDB tại: {persist_directory}")
        self.client = chromadb.PersistentClient(path=persist_directory)

        print(f"[Vector] Tải embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        print(
            f"  -> Model dimension: "
            f"{self.model.get_sentence_embedding_dimension()}"
        )

    def create_collection(self, collection_name: str, overwrite: bool = True):
        if overwrite:
            try:
                self.client.delete_collection(collection_name)
                print(f"[Vector] Đã xóa collection cũ: {collection_name}")
            except Exception:
                pass

        self.collection = self.client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        print(f"[Vector] ✓ Đã tạo collection: {collection_name}")
        return self.collection

    def generate_embeddings(self, texts: list[str], batch_size: int = 32) -> list:
        all_embeddings = []

        for index in tqdm(range(0, len(texts), batch_size), desc="Tạo embeddings"):
            batch = texts[index:index + batch_size]
            embeddings = self.model.encode(batch, show_progress_bar=False)
            all_embeddings.extend(embeddings.tolist())

        return all_embeddings

    def add_chunks(self, chunks: list[dict], batch_size: int = 100):
        if not chunks:
            print("[Vector] Không có chunks để thêm!")
            return

        print(f"[Vector] Chuẩn bị thêm {len(chunks)} chunks vào ChromaDB...")

        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            chunk_id = chunk["id"]
            doc_text = f"{chunk['full_path']}: {chunk['content']}"

            meta = {
                "type": chunk.get("type", ""),
                "number": chunk.get("number", ""),
                "full_path": chunk.get("full_path", ""),
                "graph_node_id": chunk_id,
                "parent_chain": " > ".join(chunk.get("parent_chain", [])),
                "cross_ref_count": len(chunk.get("cross_references", [])),
            }
            if "title" in chunk:
                meta["title"] = chunk["title"]

            ids.append(chunk_id)
            documents.append(doc_text)
            metadatas.append(meta)

        print("[Vector] Tạo embeddings...")
        embeddings = self.generate_embeddings(documents, batch_size=32)

        print("[Vector] Nạp vào ChromaDB...")
        for index in tqdm(range(0, len(ids), batch_size), desc="Nạp chunks"):
            end = min(index + batch_size, len(ids))
            self.collection.add(
                ids=ids[index:end],
                documents=documents[index:end],
                embeddings=embeddings[index:end],
                metadatas=metadatas[index:end],
            )

        print(f"[Vector] ✓ Đã thêm {len(ids)} chunks thành công!")

    def test_query(self, query_text: str, n_results: int = 5) -> dict:
        query_embedding = self.model.encode([query_text]).tolist()
        return self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )


def run_build_vector() -> dict:
    """
    Chạy toàn bộ bước xây dựng Vector Database.
    """
    print("=" * 60)
    print("BƯỚC 4: XÂY DỰNG VECTOR DATABASE (CHROMADB)")
    print("=" * 60)

    print(f"[4.1] Đọc chunks từ: {PARSED_STRUCTURE_PATH}")
    with open(PARSED_STRUCTURE_PATH, "r", encoding="utf-8") as file_obj:
        parsed_data = json.load(file_obj)

    chunks = parsed_data["chunks"]
    print(f"  -> {len(chunks)} chunks cần embedding")

    print("[4.2] Khởi tạo VectorBuilder...")
    builder = VectorBuilder(
        persist_directory=CHROMA_DB_DIR,
        model_name=EMBEDDING_MODEL_NAME,
    )

    print(f"[4.3] Tạo collection: {CHROMA_COLLECTION_NAME}")
    builder.create_collection(CHROMA_COLLECTION_NAME, overwrite=True)

    print("[4.4] Nạp chunks và tạo embeddings...")
    builder.add_chunks(chunks)

    stats = {
        "total_vectors": builder.collection.count(),
        "embedding_dimension": builder.model.get_sentence_embedding_dimension(),
        "model_name": EMBEDDING_MODEL_NAME,
        "collection_name": CHROMA_COLLECTION_NAME,
    }

    print("\n[4.5] Thống kê Vector Database:")
    print(f"  -> Tổng vectors: {stats['total_vectors']}")
    print(f"  -> Embedding dimension: {stats['embedding_dimension']}")
    print(f"  -> Model: {stats['model_name']}")

    print("\n[4.6] Test truy vấn thử nghiệm...")
    for query in [
        "điều kiện thành lập doanh nghiệp",
        "quyền của cổ đông",
        "trách nhiệm của giám đốc công ty",
    ]:
        print(f'\n  Query: "{query}"')
        results = builder.test_query(query, n_results=3)
        for index in range(len(results["ids"][0])):
            meta = results["metadatas"][0][index]
            distance = results["distances"][0][index]
            doc_preview = results["documents"][0][index][:100]
            print(
                f"    [{index + 1}] (score: {1 - distance:.4f}) "
                f"{meta['full_path']}"
            )
            print(f"        {doc_preview}...")

    print("\n[Vector] ✓ Hoàn thành xây dựng Vector Database!")
    return stats


if __name__ == "__main__":
    run_build_vector()
