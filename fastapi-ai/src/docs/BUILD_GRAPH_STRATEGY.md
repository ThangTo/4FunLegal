# Chiến lược Xây dựng Đồ thị (Build Graph) Tối ưu cho V-Legal GraphRAG

Quá trình "Build Graph" trong hệ thống V-Legal không chỉ là nạp dữ liệu, mà là một quy trình **Cấu trúc hóa tri thức** để đạt hiệu suất tối đa cho Hackathon 2025.

---

## 1. Thiết kế Lược đồ (Schema) "Siêu phân cấp"

Để hỗ trợ truy xuất linh hoạt ("Small-to-Big") và xử lý dẫn chiếu chéo, lược đồ đồ thị được chuẩn hóa như sau:

| Nhãn Nút (Node Label) | Thuộc tính (Properties) | Quan hệ (Relationships) |
| :--- | :--- | :--- |
| **Law** | id, ten_luat, nam_ban_hanh, so_hieu | `HAS_CHAPTER` -> Chapter |
| **Chapter** | id, tieu_de, so_thu_tu | `HAS_ARTICLE` -> Article |
| **Article** | id, tieu_de, noi_dung_tom_tat, vector_id | `HAS_CLAUSE` -> Clause |
| **Clause** | id, so_thu_tu, noi_dung_full | `HAS_POINT` -> Point |
| **Point** | id, ky_hieu, noi_dung | `REFERENCES` -> Article/Clause |
| **Entity** | name, type (Cá nhân/Tổ chức/Cơ quan) | `SUBJECT_OF` -> Clause/Point |

---

## 2. Quy trình Xây dựng Đồ thị (3-Stage Pipeline)

### Giai đoạn 1: Trích xuất Cấu trúc (Structural Parsing)
- **Công cụ:** Docling / Llama Parse / Marker.
- **Kỹ thuật:** Sử dụng Regex (0 đồng, 0 token) để nhận diện tiêu đề chuẩn của luật Việt Nam:
    - `^Chương [IVXLCDM]+:.*$` -> Chapter
    - `^Điều \d+:.*$` -> Article
    - `^\d+\..*$` -> Clause
    - `^[a-z]\).*$` -> Point
- **Lợi ích:** Độ chính xác 100% với cấu trúc văn bản quy phạm pháp luật.

### Giai đoạn 2: Trích xuất Dẫn chiếu chéo (Cross-reference Extraction)
- **Logic:** Duyệt nội dung Article/Clause, sử dụng Regex tìm các cụm từ: *"theo quy định tại Điều..."* hoặc *"khoản... Điều..."*.
- **Hành động:** Tạo quan hệ `REFERENCES` từ node nguồn đến node mục tiêu.
- **Lợi ích:** Cho phép Agent lấy toàn bộ ngữ cảnh liên quan chỉ bằng 1 câu lệnh Cypher mà không cần Vector Search.

### Giai đoạn 3: Trích xuất Thực thể & SPO (SPO Extraction)
- **Công cụ:** Gemini 1.5 Flash (SPO: Subject-Predicate-Object).
- **Nhiệm vụ:** Trích xuất các thực thể và hành vi pháp lý cho các Điều luật phức tạp.
- **Hành động:** Tạo node `Entity` và kết nối với nội dung tương ứng để hỗ trợ suy luận logic.

---

## 3. Kỹ thuật "Double-Indexing" (Neo4j & ChromaDB)

Để đảm bảo tốc độ phản hồi tính bằng mili giây:
- **Neo4j:** Mỗi node Article/Clause lưu `vector_id`.
- **ChromaDB:** Metadata của mỗi vector lưu `neo4j_node_id`.
- **Cơ chế:** Khi tìm thấy chunk (Small) trong Vector DB, hệ thống lập tức "truy vết" ngược lên toàn bộ cấu trúc Cha/Dẫn chiếu (Big) thông qua ID đã đồng bộ.

---

## 4. Tối ưu hóa cho Demo Hackathon & Chi phí

1.  **Batch Processing:** Sử dụng câu lệnh `UNWIND` trong Cypher để đẩy dữ liệu theo lô (500-1000 quan hệ/lần), tăng tốc độ nạp dữ liệu lên 10-20 lần.
2.  **Local Entity Recognition:** Dùng SLM (Llama-3.2-1B) chạy local để gán nhãn thực thể, tiết kiệm chi phí gọi API.
3.  **Cụm tri thức (Knowledge Clusters):** Thay vì build toàn bộ hệ thống pháp luật, hãy tập trung build liên kết sâu giữa **Luật** và các **Nghị định hướng dẫn**. Việc truy xuất từ Luật sang Nghị định qua Graph sẽ tạo ấn tượng mạnh ("Wow factor") với ban giám khảo.

---

### Mẫu câu lệnh Cypher "Khoe" kỹ thuật:
```cypher
// Truy vấn lấy nội dung Điều luật + Toàn bộ nội dung các Điều được dẫn chiếu
MATCH (a:Article {id: $found_id})
OPTIONAL MATCH (a)-[:REFERENCES]->(ref_article)
OPTIONAL MATCH (law:Law)-[:HAS_CHAPTER]->(ch:Chapter)-[:HAS_ARTICLE]->(a)
RETURN a.noi_dung_full, 
       collect(ref_article.noi_dung_full) as references, 
       law.ten_luat + " - " + ch.tieu_de as metadata
```
