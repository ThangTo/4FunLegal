# V-Legal: Hệ thống Agentic GraphRAG Tư vấn Luật Doanh nghiệp 2020

Dự án này là một thành phần cốt lõi trong hệ thống **4FunLegal**, ứng dụng AI thế hệ mới để giải quyết bài toán tra cứu và tư vấn pháp luật Việt Nam theo tiêu chí **"Nhanh - Chính xác - Rẻ"** cho Hackathon 2025.

---

## 1. Bài toán & Tầm nhìn (Vision)
Hệ thống giải quyết các nhược điểm của RAG truyền thống (mất ngữ cảnh phân cấp, bỏ sót tham chiếu) bằng cách chuyển dịch từ "Tìm kiếm từ khóa mờ" sang **"Truy vết quan hệ logic"**.

- **Agentic of Change:** Thay đổi cách AI tương tác với tri thức pháp luật thông qua đồ thị tri thức (Knowledge Graph), cho phép cập nhật luật mới (`AMENDED_BY`) mà không cần tái huấn luyện mô hình.
- **Tối ưu hóa đa mục tiêu:** Sử dụng SLM cho tác vụ nhẹ, LLM cho tác vụ phức tạp, và Graph cho tính xác thực.

---

## 2. Cấu trúc thư mục Refactor (Dự kiến)
Để triển khai hệ thống Đa Agent và Pipeline tối ưu, cấu trúc mã nguồn được quy hoạch như sau:

```text
fastapi-ai/
├── src/
│   ├── agents/                   # Hệ thống Đa Agent chuyên biệt
│   │   ├── router_agent.py       # SLM (Llama 3.2 1B) phân loại yêu cầu
│   │   ├── researcher_agent.py   # Hybrid Search (BGE-M3 + Neo4j)
│   │   ├── validator_agent.py    # Fact-check dữ liệu đối soát Graph
│   │   └── synthesizer_agent.py  # Tổng hợp văn phong pháp lý (Gemini)
│   ├── database/                 # Layer quản lý dữ liệu
│   │   ├── graph_builder.py      # Xây dựng Neo4j (Cypher, UNWIND)
│   │   ├── vector_builder.py     # Xây dựng ChromaDB (Cosine similarity)
│   │   └── connection_pool.py    # Quản lý kết nối DB
│   ├── pipeline/                 # Pipeline tiền xử lý & Indexing 
│   │   ├── structural_parser.py  # Regex parsing chuẩn Việt Nam
│   │   ├── cross_ref_extractor.py # Trích xuất dẫn chiếu chéo linh hoạt
│   │   └── spo_extractor.py      # Trích xuất Subject-Predicate-Object
│   ├── utils/                    # Các công cụ bổ trợ (Docling, Llama Parse)
│   └── config.py                 # Cấu hình tập trung (Model, API, DB)
├── data/                         # Văn bản luật thô (PDF/DOCX)
├── output/                       # Kết quả trung gian (JSON, Vector store, Logs)
├── run_pipeline.py               # Orchestrator cho bước xây dựng DB
└── main.py                       # FastAPI Entry point cho hệ thống tư vấn
```

---

## 3. Kiến trúc Tri thức (Graph Schema)
Hệ thống sử dụng lược đồ **Siêu phân cấp** để bảo toàn logic pháp lý:
- **Nodes:** `Law` -> `Chapter` -> `Article` -> `Clause` -> `Point` -> `Entity`.
- **Relationships:**
    - `HAS_...`: Phân cấp nội dung (Small-to-Big).
    - `REFERENCES`: Tham chiếu chéo giữa các Điều/Khoản.
    - `AMENDED_BY`: Liên kết luật sửa đổi, bổ sung.
    - `SUBJECT_OF`: Liên kết chủ thể hành vi pháp lý.

---

## 4. Pipeline Xây dựng (Build Pipeline)
Giai đoạn "Cấu trúc hóa tri thức" gồm 3 bước:
1.  **Structural Parsing:** Dùng Regex nhận diện chuẩn 100% tiêu đề luật.
2.  **Cross-ref Extraction:** Tự động hóa việc tạo quan hệ `REFERENCES` bằng Regex.
3.  **SPO Extraction:** Dùng Gemini 1.5 Flash trích xuất thực thể và hành vi cho các điều luật phức tạp.

---

## 5. Pipeline Truy xuất & Đa Agent (Retrieval)
Hệ thống vận hành theo quy trình **Agentic GraphRAG**:
1.  **Router:** Phân loại. Nếu tra cứu số hiệu -> Gọi thẳng Cypher. Nếu tư vấn -> Chuyển Researcher.
2.  **Researcher:** Thực hiện **Double-Indexing Search** (ChromaDB `vector_id` <-> Neo4j `node_id`) và duyệt đồ thị mở rộng ngữ cảnh.
3.  **Validator:** Đối soát câu trả lời dự thảo với dữ liệu thô trong Graph để đảm bảo không có "ảo giác".
4.  **Synthesizer:** Trình bày chuyên nghiệp, trích dẫn chính xác Điều/Khoản và tính hiệu lực pháp lý.

---

## 6. Chỉ số Tối ưu (Evaluation)
- **Tốc độ:** Parallel Retrieval + SLM Router.
- **Chính xác:** Deterministic Graph + Double-Check Validation.
- **Chi phí:** SPO Triples (giảm 70% token context) + Batch Processing (UNWIND).

---
*Tài liệu Master cho dự án V-Legal - Cập nhật ngày 24/03/2026.*
