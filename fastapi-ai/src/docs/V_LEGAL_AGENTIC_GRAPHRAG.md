# V-Legal: Agentic GraphRAG for 2020 Vietnamese Enterprise Law

Hệ thống **V-Legal Agentic GraphRAG** đại diện cho một bước tiến quan trọng trong việc ứng dụng AI vào lĩnh vực pháp luật, tối ưu hóa cho các tiêu chí "Nhanh - Chính xác - Rẻ", sẵn sàng cho các cuộc thi Hackathon năm 2025.

---

## 1. Hệ thống Đa Agent (Multi-Agent System)

Hệ thống được thiết kế với 4 "nhân sự" AI chuyên biệt để đảm bảo hiệu suất và độ tin cậy tối đa:

| Agent | Công nghệ | Vai trò & Nhiệm vụ |
| :--- | :--- | :--- |
| **Agent Điều phối (Router)** | SLM (Llama-3.2-1B / Phi-3 Mini) | Phân loại câu hỏi ngay tại local. Bỏ qua Vector Search cho các câu hỏi tra cứu trực tiếp (ví dụ: "Điều 15 nói gì?") để gọi thẳng Cypher query tới Neo4j. |
| **Agent Truy xuất (Legal Researcher)** | BGE-M3 (Hybrid) + Neo4j | Thực hiện truy vấn song song. Sử dụng kỹ thuật "Small-to-Big" và duyệt đồ thị theo quan hệ `REFERENCES` hoặc `AMENDED_BY` để không bỏ sót luật sửa đổi. |
| **Agent Kiểm chứng (Validator)** | Gemini 1.5 Flash | Thực hiện "Fact-check" đối soát câu trả lời với dữ liệu gốc trong Graph. Kiểm tra tính tồn tại của số hiệu Điều/Khoản và độ chính xác của trích dẫn. |
| **Agent Luật sư (Final Synthesizer)** | Gemini 1.5 Flash | Tổng hợp thông tin, trình bày theo văn phong pháp lý chuyên nghiệp, kèm nguồn trích dẫn và ghi chú về tính hiệu lực hiện hành. |

---

## 2. Phân tích Mức độ Tối ưu (Optimization Analysis)

*   **Tốc độ (Speed):** Tối ưu hóa nhờ cơ chế **Parallel Retrieval** (truy xuất song song) giữa Graph và Vector. Sử dụng SLM làm Router giúp phản hồi gần như tức thì mà không phụ thuộc hoàn toàn vào API cloud.
*   **Độ chính xác (Accuracy):** Tính chất **Deterministic** (xác định) của Neo4j giúp AI không phải suy đoán mối quan hệ giữa các điều luật. Kỹ thuật **Table-to-Graph** (Llama Parse) đảm bảo cấu trúc bảng biểu được bảo toàn tuyệt đối.
*   **Chi phí (Cost):** Sử dụng **SPO Triples** (Subject-Predicate-Object) để cô đọng ngữ cảnh. Giảm lượng token tiêu thụ lên đến **70%** bằng cách chỉ đẩy các quan hệ cốt lõi vào prompt thay vì toàn bộ văn bản thô.

---

## 3. Giá trị cốt lõi: "Agentic of Change"

V-Legal không chỉ là một công cụ tra cứu, mà là một sự thay đổi mang tính hệ thống trong cách tiếp cận tri thức pháp luật:

1.  **Chuyển đổi tư duy:** Từ "Tìm kiếm từ khóa mờ" (Traditional RAG) sang "Truy vết quan hệ logic" (Agentic GraphRAG).
2.  **Tính bền vững:** Khả năng tự cập nhật thông tin thông qua quan hệ `REPLACED_BY` giúp hệ thống luôn đúng mà không cần huấn luyện lại mô hình (re-training).
3.  **Tác động xã hội:** Bình dân hóa việc tiếp cận luật pháp chính xác, giúp người dân và doanh nghiệp tuân thủ pháp luật dễ dàng và rẻ hơn.

---
*Tài liệu tổng hợp phục vụ chiến lược phát triển V-Legal cho Hackathon 2025.*
