"""
Pipeline Runner: Chạy toàn bộ pipeline xây dựng Database từ văn bản luật.

Thứ tự thực thi:
    1. Trích xuất văn bản từ Word → text thô
    2. Phân rã cấu trúc pháp lý → JSON
    3. Nạp vào Graph Database (Neo4j)
    4. Nạp vào Vector Database (ChromaDB)

Sử dụng:
    python run_pipeline.py                     # Chạy tất cả
    python run_pipeline.py --step extract      # Chỉ trích xuất
    python run_pipeline.py --step parse        # Chỉ phân rã
    python run_pipeline.py --step graph        # Chỉ build graph
    python run_pipeline.py --step vector       # Chỉ build vector
    python run_pipeline.py --skip-graph        # Bỏ qua Neo4j
"""
import argparse
import sys
import time
import traceback


def run_all(skip_graph: bool = False):
    """Chạy toàn bộ pipeline."""
    start_time = time.time()
    
    print("╔" + "═" * 58 + "╗")
    print("║  PIPELINE XÂY DỰNG DATABASE TỪ VĂN BẢN LUẬT DOANH NGHIỆP  ║")
    print("╚" + "═" * 58 + "╝")
    print()
    
    # ===== BƯỚC 1: Trích xuất văn bản =====
    try:
        from src.extract_text import run_extraction
        cleaned_text = run_extraction()
    except Exception as e:
        print(f"\n❌ LỖI Ở BƯỚC 1 (Trích xuất): {e}")
        traceback.print_exc()
        sys.exit(1)
    
    # ===== BƯỚC 2: Phân rã cấu trúc =====
    try:
        from src.parse_structure import run_parsing
        root_nodes, chunks = run_parsing(cleaned_text)
    except Exception as e:
        print(f"\n❌ LỖI Ở BƯỚC 2 (Phân rã): {e}")
        traceback.print_exc()
        sys.exit(1)
    
    # ===== BƯỚC 3: Graph Database =====
    if not skip_graph:
        try:
            from src.build_graph import run_build_graph
            graph_stats = run_build_graph()
        except Exception as e:
            print(f"\n⚠️ LỖI Ở BƯỚC 3 (Graph DB): {e}")
            print("  → Bỏ qua bước này. Đảm bảo Neo4j đang chạy.")
            traceback.print_exc()
            graph_stats = None
    else:
        print("\n[SKIP] Bỏ qua bước 3 (Graph DB) theo yêu cầu.")
        graph_stats = None
    
    # ===== BƯỚC 4: Vector Database =====
    try:
        from src.build_vector import run_build_vector
        vector_stats = run_build_vector()
    except Exception as e:
        print(f"\n❌ LỖI Ở BƯỚC 4 (Vector DB): {e}")
        traceback.print_exc()
        sys.exit(1)
    
    # ===== TÓM TẮT =====
    elapsed = time.time() - start_time
    print()

    print("TÓM TẮT KẾT QUẢ")
    print(f"Thời gian: {elapsed:.1f}s")
    print(f"Chunks tạo được: {len(chunks)}")
    if graph_stats:
        print(f"Neo4j nodes: {graph_stats['total_nodes']}")
        print(f"Neo4j relationships: {graph_stats['total_relationships']}")
    if vector_stats:
        print(f"ChromaDB vectors: {vector_stats['total_vectors']}")
        print(f"Embedding dim: {vector_stats['embedding_dimension']}")
    print("\n✅ PIPELINE HOÀN THÀNH!")


def run_step(step: str):
    """Chạy một bước cụ thể."""
    if step == "extract":
        from src.extract_text import run_extraction
        run_extraction()
    
    elif step == "parse":
        from src.config import RAW_TEXT_PATH
        with open(RAW_TEXT_PATH, "r", encoding="utf-8") as f:
            text = f.read()
        from src.parse_structure import run_parsing
        run_parsing(text)
    
    elif step == "graph":
        from src.build_graph import run_build_graph
        run_build_graph()
    
    elif step == "vector":
        from src.build_vector import run_build_vector
        run_build_vector()
    
    else:
        print(f"Bước không hợp lệ: {step}")
        print("Các bước: extract, parse, graph, vector")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pipeline xây dựng Database từ văn bản luật"
    )
    parser.add_argument(
        "--step",
        choices=["extract", "parse", "graph", "vector"],
        help="Chạy một bước cụ thể thay vì toàn bộ pipeline"
    )
    parser.add_argument(
        "--skip-graph",
        action="store_true",
        help="Bỏ qua bước Neo4j (nếu chưa cài)"
    )
    
    args = parser.parse_args()
    
    if args.step:
        run_step(args.step)
    else:
        run_all(skip_graph=args.skip_graph)
