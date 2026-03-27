# Phân Tích Dự Án Và So Sánh `src` Với `Duc/src`

> Ghi chú cập nhật: tài liệu này mô tả trạng thái trước khi `fastapi-ai/src`
> được tách độc lập hoàn toàn khỏi `fastapi-ai/Duc`. Sau đợt refactor, các phụ
> thuộc runtime và build pipeline đã được chuyển sang `fastapi-ai/data`,
> `fastapi-ai/output`, `fastapi-ai/src/pipeline`, `fastapi-ai/src/database`
> và `fastapi-ai/run_pipeline.py`.

## 1. Mục tiêu tài liệu

Tài liệu này tổng hợp phần đọc hiểu mã nguồn hiện tại của dự án `4FunLegal`, tập trung vào service `fastapi-ai`, đặc biệt là:

- Vai trò thực tế của `fastapi-ai` trong toàn hệ thống.
- Kiến trúc và luồng xử lý trong `fastapi-ai/src`.
- So sánh giữa `fastapi-ai/src` và `fastapi-ai/Duc/src`.
- Những điểm lệch giữa tài liệu thiết kế và code đang chạy.

---

## 2. Hiểu tổng thể dự án

Theo cấu trúc hiện tại, dự án gồm 3 phần chính:

- `frontend`: giao diện người dùng.
- `node-gateway`: tầng gateway/API trung gian, có MongoDB.
- `fastapi-ai`: service AI phụ trách GraphRAG và hỏi đáp pháp lý.

Về mặt ý tưởng, dự án hướng tới một hệ thống kiểm tra hoặc tư vấn pháp lý liên quan đến Luật Doanh nghiệp 2020 bằng GraphRAG và Multi-Agent.

Tuy nhiên, ở trạng thái code hiện tại, phần hoàn thiện nhất của `fastapi-ai` là luồng hỏi đáp pháp lý qua endpoint:

- `POST /api/v1/ask`

Trong khi đó, endpoint:

- `POST /api/v1/verify-registration`

hiện vẫn đang gọi logic placeholder trong `services/rag_agent.py`, chưa phải một workflow pháp lý hoàn chỉnh.

---

## 3. Vai trò thực tế của `fastapi-ai`

### 3.1. Entry point

File `fastapi-ai/main.py` là entry point của service FastAPI. Nó khai báo:

- `POST /api/v1/ask`: hỏi đáp pháp lý theo mô hình Agentic GraphRAG.
- `POST /api/v1/verify-registration`: kiểm tra đăng ký doanh nghiệp, nhưng hiện vẫn là placeholder.
- `GET /health`: health check.

### 3.2. Luồng chính đang chạy

Luồng chính hiện nay là:

1. Người dùng gửi câu hỏi pháp lý vào `/api/v1/ask`.
2. `main.py` khởi tạo `Orchestrator` theo kiểu lazy init.
3. `Orchestrator` điều phối các agent trong `src/agents`.
4. Các agent sử dụng Neo4j và ChromaDB để lấy context pháp lý.
5. Gemini được dùng để phân loại câu hỏi và tổng hợp câu trả lời.
6. Validator kiểm tra grounding của trích dẫn để giảm hallucination.

---

## 4. Kiến trúc của `fastapi-ai/src`

Thư mục `fastapi-ai/src` là tầng runtime mới, được thiết kế theo kiểu agentic và phục vụ trực tiếp cho API.

### 4.1. `src/config.py`

Đây là nơi cấu hình tập trung cho runtime:

- Nạp biến môi trường bằng `load_dotenv()`.
- Cấu hình kết nối Neo4j.
- Cấu hình Gemini.
- Cấu hình đường dẫn tới dữ liệu đã index sẵn trong `Duc/output`.

Điểm rất quan trọng là `src/config.py` không tự build dữ liệu, mà chỉ tái sử dụng output đã được tạo trước đó ở:

- `fastapi-ai/Duc/output/chroma_db`

Nói cách khác, `src` đang phụ thuộc vào dữ liệu do nhánh `Duc` build ra.

### 4.2. `src/agents/orchestrator.py`

Đây là trung tâm điều phối runtime.

Nó chia câu hỏi thành 3 loại:

- `LOOKUP`
- `ADVISORY`
- `INVALID`

Luồng xử lý:

- `INVALID`: từ chối lịch sự.
- `LOOKUP`: tra cứu trực tiếp theo số điều trong Neo4j, bỏ qua vector search.
- `ADVISORY`: gọi `Researcher` để lấy context, sau đó `Synthesizer` tạo câu trả lời, rồi `Validator` kiểm tra tính đúng đắn.

Đây là điểm khác biệt lớn nhất so với `Duc/src`: logic runtime đã được tách thành state machine và các agent riêng.

### 4.3. `src/agents/router_agent.py`

`RouterAgent` là agent phân loại câu hỏi.

Chiến lược hiện tại là 2 tầng:

- Regex fast-path cho các câu hỏi tra cứu rõ ràng như "Điều 15 nói gì?"
- Gemini fallback cho câu hỏi phức tạp hơn

Kết quả trả về gồm:

- loại route
- số điều
- số khoản
- câu hỏi gốc

Thực tế code hiện tại dùng Gemini cho router, dù trong docs có mô tả Router là SLM chạy local.

### 4.4. `src/agents/researcher_agent.py`

`ResearcherAgent` phụ trách hybrid retrieval:

- tìm vector từ ChromaDB
- lấy top kết quả theo distance
- truy vết ngược sang Neo4j bằng `graph_node_id`
- mở rộng ngữ cảnh theo kiểu small-to-big và cross-reference

Nó dùng:

- `ChromaClient`
- `Neo4jClient`

và chạy phần truy vấn blocking trong `ThreadPoolExecutor`.

### 4.5. `src/agents/synthesizer_agent.py`

`SynthesizerAgent` dùng Gemini để tổng hợp câu trả lời.

Có 2 prompt riêng:

- prompt cho `LOOKUP`
- prompt cho `ADVISORY`

Mục tiêu là trả lời theo văn phong tư vấn pháp lý, có cấu trúc và có trích dẫn điều khoản.

### 4.6. `src/agents/validator_agent.py`

`ValidatorAgent` là phần chống hallucination theo hướng deterministic:

- dùng regex để trích xuất các trích dẫn như `Điều X`, `Khoản Y Điều Z`
- kiểm tra sự tồn tại thật trong Neo4j
- đối chiếu nội dung trích dẫn với dữ liệu gốc bằng `SequenceMatcher`

Nếu validator phát hiện lỗi, `Orchestrator` có thể yêu cầu synthesize lại một lần nữa theo feedback.

### 4.7. `src/database/neo4j_client.py`

`Neo4jClient` là lớp truy cập Neo4j ở runtime, gồm các hàm chính:

- `lookup_article()`
- `expand_context()`
- `verify_exists()`
- `get_article_content()`

Nó phục vụ cả ba nhu cầu:

- tra cứu điều luật trực tiếp
- mở rộng context cho hỏi đáp tư vấn
- xác minh trích dẫn cho validator

### 4.8. `src/database/chroma_client.py`

`ChromaClient` là lớp truy cập ChromaDB:

- mở persistent collection
- load embedding model
- tìm kiếm semantic search

Embedding model đang dùng là:

- `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

---

## 5. Vai trò của `fastapi-ai/Duc/src`

Thư mục `fastapi-ai/Duc/src` là phần pipeline build dữ liệu và phiên bản retrieval cũ hơn, đóng vai trò nền tảng dữ liệu cho `src`.

Nó gồm 2 nhóm chính:

- pipeline xây dựng tri thức
- retrieval pipeline nguyên khối

### 5.1. Pipeline xây dựng tri thức

Các file:

- `extract_text.py`
- `parse_structure.py`
- `build_graph.py`
- `build_vector.py`
- `run_pipeline.py`

đảm nhiệm toàn bộ quy trình:

1. Đọc file Word luật doanh nghiệp.
2. Làm sạch văn bản.
3. Parse cấu trúc pháp lý thành cây: Phần, Chương, Mục, Điều, Khoản, Điểm.
4. Trích xuất tham chiếu chéo.
5. Đẩy dữ liệu vào Neo4j.
6. Tạo embedding và lưu vào ChromaDB.

Đây là phần mà `fastapi-ai/src` hiện chưa có bản thay thế trực tiếp.

### 5.2. Retrieval pipeline nguyên khối

File `Duc/src/retrieval_pipeline.py` là pipeline hỏi đáp theo kiểu monolithic.

Nó tự làm tất cả trong một class:

- load embedding model
- query ChromaDB
- rerank bằng Gemini
- truy vấn Neo4j
- build context
- gọi Gemini để trả lời

Nói ngắn gọn:

- `Duc/src/retrieval_pipeline.py` là bản runtime cũ, một khối.
- `src/agents/*` + `src/database/*` là bản runtime mới, đã tách lớp và agent rõ ràng hơn.

---

## 6. So sánh trực tiếp giữa `src` và `Duc/src`

## 6.1. Khác nhau về vai trò

`fastapi-ai/src`:

- là runtime layer mới cho API
- thiên về multi-agent orchestration
- dùng lại dữ liệu đã được build từ trước

`fastapi-ai/Duc/src`:

- là build pipeline cho dữ liệu pháp lý
- đồng thời chứa retrieval pipeline đời đầu
- là nền tảng sinh ra `output/parsed_structure.json`, Neo4j graph và ChromaDB

## 6.2. Khác nhau về mức độ tách lớp

`src`:

- chia nhỏ theo agent và database client
- có `Orchestrator`
- có `RouterAgent`
- có `ValidatorAgent`

`Duc/src`:

- phần retrieval tập trung trong một class `RetrievalPipeline`
- chưa có state machine rõ ràng
- chưa có tách router, researcher, synthesizer, validator thành module độc lập

## 6.3. Khác nhau về flow truy vấn

Trong `src`:

- câu hỏi đi qua bước phân loại trước
- nếu là `LOOKUP` thì đi tắt vào graph
- nếu là `ADVISORY` mới dùng retrieval đầy đủ
- có validation loop

Trong `Duc/src`:

- hầu như luôn đi theo flow vector search -> rerank -> graph traversal -> Gemini answer
- chưa có lookup fast-path rõ ràng
- chưa có validator grounding riêng như bản mới

## 6.4. Khác nhau về rerank

`Duc/src/retrieval_pipeline.py`:

- có hàm `rerank()` dùng Gemini để xếp hạng lại candidate

`src/agents/researcher_agent.py`:

- không còn LLM rerank
- chỉ sort theo `distance` rồi lấy top-k

Điều này cho thấy bản `src` đã đơn giản hóa retrieval để giảm độ phức tạp hoặc chi phí runtime.

## 6.5. Khác nhau về khả năng kiểm chứng

`src`:

- có `ValidatorAgent`
- kiểm tra tồn tại thật của trích dẫn trong graph
- có đối chiếu nội dung trích dẫn
- có khả năng retry khi câu trả lời chưa đủ grounding

`Duc/src`:

- chưa có một lớp validator riêng như vậy
- kiểm soát hallucination chủ yếu dựa vào prompt và context

## 6.6. Khác nhau về phụ thuộc dữ liệu

`src` không tự build dữ liệu.

Nó phụ thuộc vào output sinh ra từ `Duc`:

- graph trong Neo4j
- vector store trong `Duc/output/chroma_db`

Tức là về bản chất:

- `Duc/src` tạo data layer
- `src` tiêu thụ data layer đó để phục vụ runtime

---

## 7. Những điểm tái sử dụng rõ ràng giữa hai nhánh

Mặc dù được tổ chức khác nhau, `src` đang tái sử dụng nhiều logic hoặc ý tưởng từ `Duc/src`.

### 7.1. Tái sử dụng vector store

`src/config.py` trỏ trực tiếp đến ChromaDB trong:

- `Duc/output/chroma_db`

### 7.2. Tái sử dụng mapping `graph_node_id`

Trong `Duc/src/build_vector.py`, metadata của vector lưu:

- `graph_node_id`

Trong `src/agents/researcher_agent.py`, giá trị này được dùng để truy vết ngược sang Neo4j.

Đây chính là cơ chế "double-indexing" mà docs mô tả.

### 7.3. Tái sử dụng logic build context

Logic gom context theo 3 nhóm:

- direct match
- parent dieu
- cross reference

ở `src/agents/researcher_agent.py` rất gần với logic đã có trong `Duc/src/retrieval_pipeline.py`, chỉ khác ở cách tổ chức module.

---

## 8. Điểm lệch giữa docs và code thực tế

Các file docs trong `fastapi-ai/src/docs` mô tả một kiến trúc refactor tương đối tham vọng, nhưng code hiện tại mới triển khai một phần.

### 8.1. Docs mô tả cấu trúc refactor đầy đủ, code mới chỉ hoàn thành runtime

Docs mô tả các nhóm module như:

- `pipeline/`
- `utils/`
- `graph_builder.py`
- `vector_builder.py`
- `structural_parser.py`

Nhưng trên thực tế:

- các module build vẫn đang nằm ở `Duc/src`
- `src` mới tập trung vào runtime agentic

### 8.2. Docs nói Router là SLM local, code lại dùng Gemini

Tài liệu nói Router dùng SLM như Llama/Phi chạy local để tiết kiệm chi phí.

Code thật trong `src/agents/router_agent.py` đang dùng:

- `google.generativeai`
- `GenerativeModel(GEMINI_MODEL_NAME)`

### 8.3. Docs mô tả Validator dùng Gemini, code thật lại dùng deterministic check

Trong docs, Validator được mô tả như một agent dùng Gemini để fact-check.

Trong code hiện tại, validator thật là:

- regex extraction
- Neo4j existence check
- content similarity check

Đây là khác biệt quan trọng vì code đang đi theo hướng xác minh có tính xác định hơn.

### 8.4. Docs nhắc tới các quan hệ mở rộng như `AMENDED_BY`, `REPLACED_BY`

Hiện tại graph thực tế chủ yếu mới thấy:

- `THUOC`
- `THAM_CHIEU_TOI`

Tức là schema trong code đơn giản hơn mô hình lý tưởng trong docs.

---

## 9. Những điểm cần chú ý trong cấu hình và setup

### 9.1. `src` tốt hơn `Duc/src` ở cách quản lý secrets

`src/config.py` đọc từ `.env`.

Ngược lại, `Duc/src/config.py` vẫn hardcode:

- Neo4j password
- Gemini API key

Đây là điểm cần chỉnh nếu muốn đưa code về trạng thái production hoặc public repository.

### 9.2. `.env.example` chưa khớp với runtime hiện tại

File `fastapi-ai/.env.example` hiện vẫn để:

- `OPENAI_API_KEY`

trong khi runtime của `src` lại thực tế dùng:

- `GEMINI_API_KEY`
- `GEMINI_MODEL_NAME`

Điều này có thể gây lỗi setup cho người mới clone dự án.

### 9.3. `verify-registration` chưa phản ánh đúng năng lực GraphRAG hiện có

Tên dự án và README gợi ý mạnh về bài toán fact-check hồ sơ đăng ký doanh nghiệp.

Nhưng trong code hiện tại:

- luồng này chưa được build thật
- endpoint tương ứng mới chỉ trả về response giả lập

Trong khi phần mạnh nhất đã hoàn thiện hơn lại là:

- hỏi đáp pháp lý theo Luật Doanh nghiệp 2020

---

## 10. Kết luận

Có thể hiểu hệ thống hiện tại theo mô hình 2 lớp:

### 10.1. Lớp 1: xây dựng tri thức

`fastapi-ai/Duc/src` chịu trách nhiệm:

- đọc dữ liệu luật
- parse cấu trúc
- build graph
- build vector database

Đây là nền móng dữ liệu của toàn hệ thống GraphRAG.

### 10.2. Lớp 2: runtime agentic

`fastapi-ai/src` chịu trách nhiệm:

- cung cấp API FastAPI
- điều phối agent
- phân loại câu hỏi
- truy xuất hybrid từ graph và vector
- sinh câu trả lời
- kiểm chứng grounding

Đây là lớp tương tác trực tiếp với người dùng.

### 10.3. Nhận định cuối cùng

So với `Duc/src`, thư mục `src` không phải là một nhánh thay thế hoàn toàn, mà là một lớp runtime mới được xây trên dữ liệu và ý tưởng từ `Duc`.

Nói gọn:

- `Duc/src` là nơi build tri thức và chứa retrieval pipeline đời đầu.
- `src` là nơi triển khai API Agentic GraphRAG đời mới.
- Hiện tại hai phần này vẫn phụ thuộc lẫn nhau, chưa được hợp nhất hoàn toàn thành một kiến trúc đồng nhất.

---

## 11. Tóm tắt một câu

`fastapi-ai/Duc/src` tạo ra kho tri thức pháp lý, còn `fastapi-ai/src` là tầng runtime agentic dùng kho tri thức đó để phục vụ hỏi đáp pháp lý qua FastAPI.
