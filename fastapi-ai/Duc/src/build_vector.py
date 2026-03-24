"""
Phần 3: Xây dựng Vector Database (ChromaDB).

Module này tạo embeddings cho các chunk văn bản luật bằng
sentence-transformers và lưu vào ChromaDB với metadata liên kết
ngược về Graph Database.
"""
import json

import chromadb
from chromadb.config import Settings
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
        """
        Khởi tạo VectorBuilder.
        
        Args:
            persist_directory: Thư mục lưu trữ ChromaDB persistent.
            model_name: Tên model sentence-transformers.
        """
        print(f"[Vector] Khởi tạo ChromaDB tại: {persist_directory}")
        self.client = chromadb.PersistentClient(path=persist_directory)
        
        print(f"[Vector] Tải embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        print(f"  → Model dimension: {self.model.get_sentence_embedding_dimension()}")
    
    def create_collection(self, collection_name: str, overwrite: bool = True):
        """
        Tạo hoặc lấy collection trong ChromaDB.
        
        Args:
            collection_name: Tên collection.
            overwrite: Xóa collection cũ nếu tồn tại.
        """
        if overwrite:
            # Xóa collection cũ nếu có
            try:
                self.client.delete_collection(collection_name)
                print(f"[Vector] Đã xóa collection cũ: {collection_name}")
            except Exception:
                pass
        
        self.collection = self.client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}  # Sử dụng cosine similarity
        )
        print(f"[Vector] ✓ Đã tạo collection: {collection_name}")
        return self.collection
    
    def generate_embeddings(self, texts: list[str], batch_size: int = 32) -> list:
        """
        Tạo embeddings cho danh sách texts.
        
        Args:
            texts: Danh sách văn bản cần embed.
            batch_size: Kích thước batch.
        
        Returns:
            Danh sách embedding vectors.
        """
        all_embeddings = []
        
        for i in tqdm(range(0, len(texts), batch_size), desc="Tạo embeddings"):
            batch = texts[i:i + batch_size]
            embeddings = self.model.encode(batch, show_progress_bar=False)
            all_embeddings.extend(embeddings.tolist())
        
        return all_embeddings
    
    def add_chunks(self, chunks: list[dict], batch_size: int = 100):
        """
        Thêm chunks vào ChromaDB.
        
        Mỗi chunk gồm:
        - id: ID duy nhất (trùng với graph_node_id)
        - content: Nội dung text
        - metadata: Thông tin phụ (type, full_path, parent_chain, etc.)
        
        Args:
            chunks: Danh sách chunks từ parse_structure.
            batch_size: Số chunks xử lý mỗi batch.
        """
        if not chunks:
            print("[Vector] Không có chunks để thêm!")
            return
        
        print(f"[Vector] Chuẩn bị thêm {len(chunks)} chunks vào ChromaDB...")
        
        # Chuẩn bị dữ liệu
        ids = []
        documents = []
        metadatas = []
        
        for chunk in chunks:
            chunk_id = chunk["id"]
            
            # Tạo document text: kết hợp path + content cho context tốt hơn
            doc_text = f"{chunk['full_path']}: {chunk['content']}"
            
            # Chuẩn bị metadata
            meta = {
                "type": chunk.get("type", ""),
                "number": chunk.get("number", ""),
                "full_path": chunk.get("full_path", ""),
                "graph_node_id": chunk_id,  # ID liên kết với Neo4j
            }
            
            # Thêm parent chain (flatten vì ChromaDB không hỗ trợ nested)
            parent_chain = chunk.get("parent_chain", [])
            meta["parent_chain"] = " > ".join(parent_chain)
            
            # Thêm title nếu có (cho Điều)
            if "title" in chunk:
                meta["title"] = chunk["title"]
            
            # Thêm cross_reference count
            meta["cross_ref_count"] = len(chunk.get("cross_references", []))
            
            ids.append(chunk_id)
            documents.append(doc_text)
            metadatas.append(meta)
        
        # Tạo embeddings
        print("[Vector] Tạo embeddings...")
        embeddings = self.generate_embeddings(documents, batch_size=32)
        
        # Thêm vào ChromaDB theo batch
        print("[Vector] Nạp vào ChromaDB...")
        for i in tqdm(range(0, len(ids), batch_size), desc="Nạp chunks"):
            end = min(i + batch_size, len(ids))
            self.collection.add(
                ids=ids[i:end],
                documents=documents[i:end],
                embeddings=embeddings[i:end],
                metadatas=metadatas[i:end],
            )
        
        print(f"[Vector] ✓ Đã thêm {len(ids)} chunks thành công!")
    
    def test_query(self, query_text: str, n_results: int = 5) -> dict:
        """
        Chạy truy vấn thử nghiệm trên ChromaDB.
        
        Args:
            query_text: Câu truy vấn tiếng Việt.
            n_results: Số kết quả trả về.
        
        Returns:
            Dictionary chứa kết quả truy vấn.
        """
        # Tạo embedding cho query
        query_embedding = self.model.encode([query_text]).tolist()
        
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )
        
        return results


def run_build_vector() -> dict:
    """
    Chạy toàn bộ bước xây dựng Vector Database.
    
    Returns:
        Statistics dict.
    """
    print("=" * 60)
    print("BƯỚC 4: XÂY DỰNG VECTOR DATABASE (CHROMADB)")
    print("=" * 60)
    
    # Đọc dữ liệu đã parse
    print(f"[4.1] Đọc chunks từ: {PARSED_STRUCTURE_PATH}")
    with open(PARSED_STRUCTURE_PATH, "r", encoding="utf-8") as f:
        parsed_data = json.load(f)
    
    chunks = parsed_data["chunks"]
    print(f"  → {len(chunks)} chunks cần embedding")
    
    # Khởi tạo VectorBuilder
    print(f"[4.2] Khởi tạo VectorBuilder...")
    builder = VectorBuilder(
        persist_directory=CHROMA_DB_DIR,
        model_name=EMBEDDING_MODEL_NAME
    )
    
    # Tạo collection
    print(f"[4.3] Tạo collection: {CHROMA_COLLECTION_NAME}")
    builder.create_collection(CHROMA_COLLECTION_NAME, overwrite=True)
    
    # Thêm chunks
    print(f"[4.4] Nạp chunks và tạo embeddings...")
    builder.add_chunks(chunks)
    
    # Thống kê
    collection_count = builder.collection.count()
    stats = {
        "total_vectors": collection_count,
        "embedding_dimension": builder.model.get_sentence_embedding_dimension(),
        "model_name": EMBEDDING_MODEL_NAME,
        "collection_name": CHROMA_COLLECTION_NAME,
    }
    
    print(f"\n[4.5] Thống kê Vector Database:")
    print(f"  → Tổng vectors: {stats['total_vectors']}")
    print(f"  → Embedding dimension: {stats['embedding_dimension']}")
    print(f"  → Model: {stats['model_name']}")
    
    # Test query
    print(f"\n[4.6] Test truy vấn thử nghiệm...")
    test_queries = [
        "điều kiện thành lập doanh nghiệp",
        "quyền của cổ đông",
        "trách nhiệm của giám đốc công ty",
    ]
    
    for query in test_queries:
        print(f"\n  Query: \"{query}\"")
        results = builder.test_query(query, n_results=3)
        
        for i in range(len(results["ids"][0])):
            doc_id = results["ids"][0][i]
            distance = results["distances"][0][i]
            meta = results["metadatas"][0][i]
            doc_preview = results["documents"][0][i][:100]
            
            print(f"    [{i+1}] (score: {1-distance:.4f}) {meta['full_path']}")
            print(f"        {doc_preview}...")
    
    print(f"\n[Vector] ✓ Hoàn thành xây dựng Vector Database!")
    return stats


if __name__ == "__main__":
    run_build_vector()
