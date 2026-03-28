"""
Script test benchmark tốc độ truy xuất V-Legal Agentic GraphRAG.
Chạy: python test_benchmark.py
"""
import asyncio
import time
import sys
import os

# Thêm thư mục gốc vào path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.agents.orchestrator import Orchestrator


QUESTIONS = [
    ("LOOKUP", "Tôi muốn biết điều 15 theo luật nói gì"),
    ("ADVISORY", "Quyền của cổ đông trong công ty cổ phần"),
    ("INVALID", "Thời tiết hôm nay thế nào?"),
]


async def main():
    print("=" * 60)
    print("  V-Legal Agentic GraphRAG - Benchmark Test")
    print("=" * 60)

    print("\n⏳ Khởi tạo Orchestrator (load models lần đầu)...")
    t0 = time.time()
    orchestrator = Orchestrator()
    print(f"   → Init time: {time.time() - t0:.1f}s\n")

    for expected_type, question in QUESTIONS:
        print(f"{'─' * 60}")
        print(f"📝 Câu hỏi: {question}")
        print(f"   Expected route: {expected_type}")

        t1 = time.time()
        result = await orchestrator.process(question)
        elapsed = time.time() - t1

        print(f"   ✅ Route: {result['route_type']}")
        print(f"   ⏱  Thời gian: {elapsed:.2f}s")
        print(f"   📊 Confidence: {result['confidence_score']}")
        if result.get("citations"):
            print(f"   📎 Citations: {', '.join(result['citations'])}")
        if result.get("stats"):
            print(f"   📈 Stats: {result['stats']}")
        print(f"   💬 Answer:")
        print(f"      {result['answer']}")
        print()

    print("=" * 60)
    print("  BENCHMARK HOÀN TẤT")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
