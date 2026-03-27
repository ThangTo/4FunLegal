"""
ChromaDB Client: Semantic search trên vector đã indexed.

Sử dụng dữ liệu indexed trong fastapi-ai/output/chroma_db.
Embedding model PHẢI trùng khớp: paraphrase-multilingual-MiniLM-L12-v2
"""
import chromadb
from sentence_transformers import SentenceTransformer

from src.config import (
    CHROMA_DB_DIR,
    CHROMA_COLLECTION_NAME,
    EMBEDDING_MODEL_NAME,
    VECTOR_TOP_K,
)


class ChromaClient:
    """Singleton ChromaDB client cho semantic search."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_clients()
        return cls._instance

    def _init_clients(self):
        """Khởi tạo ChromaDB + Embedding model."""
        self.chroma = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        self.collection = self.chroma.get_collection(
            name=CHROMA_COLLECTION_NAME
        )
        self.embed_model = SentenceTransformer(EMBEDDING_MODEL_NAME)

    def search(self, question: str, top_k: int = VECTOR_TOP_K) -> list[dict]:
        """
        Tìm kiếm ngữ nghĩa trên ChromaDB.

        Args:
            question: Câu hỏi pháp lý.
            top_k: Số kết quả trả về.

        Returns:
            Danh sách: [{id, document, distance, metadata}, ...]
        """
        query_embedding = self.embed_model.encode([question]).tolist()

        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        candidates = []
        for i in range(len(results["ids"][0])):
            candidates.append({
                "id": results["ids"][0][i],
                "document": results["documents"][0][i],
                "distance": results["distances"][0][i],
                "metadata": results["metadatas"][0][i],
            })

        return candidates

    def get_collection_count(self) -> int:
        """Trả về tổng số vectors trong collection."""
        return self.collection.count()
