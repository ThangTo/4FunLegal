# Walkthrough: Legal Document Database Pipeline

## Tổng quan

Đã xây dựng hoàn chỉnh pipeline chuyển đổi file Word Luật Doanh nghiệp 2020 thành Graph Database (Neo4j) và Vector Database (ChromaDB).

## Cấu trúc dự án

```
Code/
├── data/Luat-doanh-nghiep-2020-ban-word.doc
├── src/
│   ├── config.py           # Cấu hình đường dẫn, Neo4j, embedding model
│   ├── extract_text.py     # Trích xuất text từ .doc/.docx
│   ├── parse_structure.py  # Phân rã cấu trúc pháp lý
│   ├── build_graph.py      # Xây dựng Neo4j Graph
│   └── build_vector.py     # Xây dựng ChromaDB Vector
├── run_pipeline.py         # Chạy toàn bộ pipeline
└── requirements.txt
```

## Các file đã tạo

### [config.py](file:///d:/Đại%20học/Competitions/Hackathon%20(GDGOC)/Code/src/config.py)
Cấu hình tập trung: đường dẫn, Neo4j connection (`bolt://localhost:7687`), embedding model (`paraphrase-multilingual-MiniLM-L12-v2`).

### [extract_text.py](file:///d:/Đại%20học/Competitions/Hackathon%20(GDGOC)/Code/src/extract_text.py)
- Đọc [.doc](file:///d:/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/Competitions/Hackathon%20%28GDGOC%29/Code/data/~$at-doanh-nghiep-2020-ban-word.doc) bằng 3 phương thức fallback: `textract` → `antiword` → `LibreOffice`
- Đọc `.docx` bằng `python-docx`
- Làm sạch ký tự rác, chuẩn hóa khoảng trắng và xuống dòng

### [parse_structure.py](file:///d:/Đại%20học/Competitions/Hackathon%20(GDGOC)/Code/src/parse_structure.py)
- **Regex patterns** nhận diện: `PHẦN`, `Chương`, `Mục`, `Điều`, `Khoản (1. 2. 3.)`, `Điểm (a) b))`
- Xây dựng **cây phân cấp** với [LegalNode](file:///d:/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/Competitions/Hackathon%20%28GDGOC%29/Code/src/parse_structure.py#87-209) class, mỗi node có [id](file:///d:/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/Competitions/Hackathon%20%28GDGOC%29/Code/src/parse_structure.py#115-132), [full_path](file:///d:/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/Competitions/Hackathon%20%28GDGOC%29/Code/src/parse_structure.py#133-150), [parent_chain](file:///d:/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/Competitions/Hackathon%20%28GDGOC%29/Code/src/parse_structure.py#151-168)
- **Trích xuất tham chiếu chéo** (regex: "theo khoản X Điều Y", "quy định tại...")
- Export JSON cấu trúc + embeddable chunks

### [build_graph.py](file:///d:/Đại%20học/Competitions/Hackathon%20(GDGOC)/Code/src/build_graph.py)
- Tạo nodes: `Phan`, `Chuong`, `Muc`, `Dieu`, `Khoan`, `Diem` với constraints
- Relationships: `THUOC` (phân cấp) + `THAM_CHIEU_TOI` (tham chiếu chéo)
- Thống kê đầy đủ sau khi nạp

### [build_vector.py](file:///d:/Đại%20học/Competitions/Hackathon%20(GDGOC)/Code/src/build_vector.py)
- Tạo embeddings bằng `sentence-transformers` (multilingual)
- Lưu ChromaDB persistent với metadata liên kết `graph_node_id` → Neo4j
- Test query tự động với 3 câu hỏi mẫu tiếng Việt

## Cách chạy

```bash
# 1. Cài dependencies
pip install -r requirements.txt

# 2. Chạy toàn bộ pipeline
python run_pipeline.py

# 3. Chạy bỏ qua Neo4j (nếu chưa cài)
python run_pipeline.py --skip-graph

# 4. Chạy từng bước
python run_pipeline.py --step extract
python run_pipeline.py --step parse
python run_pipeline.py --step graph
python run_pipeline.py --step vector
```

> [!IMPORTANT]
> **Trước khi chạy:**
> - Cài Neo4j Desktop hoặc Docker, đổi password trong [config.py](file:///d:/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/Competitions/Hackathon%20%28GDGOC%29/Code/src/config.py)
> - File [.doc](file:///d:/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/Competitions/Hackathon%20%28GDGOC%29/Code/data/~$at-doanh-nghiep-2020-ban-word.doc) cần `textract` hoặc chuyển sang `.docx`
