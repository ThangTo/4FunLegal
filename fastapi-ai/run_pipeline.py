"""
Pipeline Runner: Chạy toàn bộ pipeline xây dựng Database từ văn bản luật.

Thứ tự thực thi:
    1. Trích xuất văn bản từ Word -> text thô
    2. Phân rã cấu trúc pháp lý -> JSON
    3. Nạp vào Graph Database (Neo4j)
    4. Nạp vào Vector Database (ChromaDB)
"""
import argparse
import sys
import time
import traceback


def _configure_console_encoding():
    """Cố gắng chuyển stdout/stderr sang UTF-8 để tránh lỗi Unicode trên Windows."""
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        reconfigure = getattr(stream, "reconfigure", None)

        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass


def run_all(skip_graph: bool = False):
    """Chạy toàn bộ pipeline."""
    start_time = time.time()

    print("╔" + "═" * 58 + "╗")
    print("║  PIPELINE XÂY DỰNG DATABASE TỪ VĂN BẢN LUẬT DOANH NGHIỆP  ║")
    print("╚" + "═" * 58 + "╝")
    print()

    try:
        from src.pipeline.extract_text import run_extraction

        cleaned_text = run_extraction()
    except Exception as exc:
        print(f"\n❌ LỖI Ở BƯỚC 1 (Trích xuất): {exc}")
        traceback.print_exc()
        sys.exit(1)

    try:
        from src.pipeline.parse_structure import run_parsing

        _, chunks = run_parsing(cleaned_text)
    except Exception as exc:
        print(f"\n❌ LỖI Ở BƯỚC 2 (Phân rã): {exc}")
        traceback.print_exc()
        sys.exit(1)

    if not skip_graph:
        try:
            from src.database.graph_builder import run_build_graph

            graph_stats = run_build_graph()
        except Exception as exc:
            print(f"\n⚠️ LỖI Ở BƯỚC 3 (Graph DB): {exc}")
            print("  -> Bỏ qua bước này. Đảm bảo Neo4j đang chạy.")
            traceback.print_exc()
            graph_stats = None
    else:
        print("\n[SKIP] Bỏ qua bước 3 (Graph DB) theo yêu cầu.")
        graph_stats = None

    try:
        from src.database.vector_builder import run_build_vector

        vector_stats = run_build_vector()
    except Exception as exc:
        print(f"\n❌ LỖI Ở BƯỚC 4 (Vector DB): {exc}")
        traceback.print_exc()
        sys.exit(1)

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
        from src.pipeline.extract_text import run_extraction

        run_extraction()
        return

    if step == "parse":
        from src.config import RAW_TEXT_PATH
        from src.pipeline.parse_structure import run_parsing

        with open(RAW_TEXT_PATH, "r", encoding="utf-8") as file_obj:
            text = file_obj.read()
        run_parsing(text)
        return

    if step == "graph":
        from src.database.graph_builder import run_build_graph

        run_build_graph()
        return

    if step == "vector":
        from src.database.vector_builder import run_build_vector

        run_build_vector()
        return

    print(f"Bước không hợp lệ: {step}")
    print("Các bước: extract, parse, graph, vector")
    sys.exit(1)


if __name__ == "__main__":
    _configure_console_encoding()

    parser = argparse.ArgumentParser(
        description="Pipeline xây dựng Database từ văn bản luật"
    )
    parser.add_argument(
        "--step",
        choices=["extract", "parse", "graph", "vector"],
        help="Chạy một bước cụ thể thay vì toàn bộ pipeline",
    )
    parser.add_argument(
        "--skip-graph",
        action="store_true",
        help="Bỏ qua bước Neo4j (nếu chưa cài)",
    )

    args = parser.parse_args()
    if args.step:
        run_step(args.step)
    else:
        run_all(skip_graph=args.skip_graph)
