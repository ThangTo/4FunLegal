"""
V-Legal Agentic GraphRAG - Cấu hình tập trung.
Đọc từ biến môi trường (.env) với fallback mặc định.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _resolve_legal_input_doc_path(base_dir: str, data_dir: str) -> str:
    """
    Resolve file đầu vào theo thứ tự ưu tiên:
    1. LEGAL_INPUT_DOC_PATH nếu có
    2. Một số file mẫu trong thư mục data/

    Hỗ trợ:
    - absolute path
    - relative path từ thư mục fastapi-ai
    - chỉ ghi tên file, ví dụ: Luat-doanh-nghiep-2020-test.docx
    """
    env_value = os.getenv("LEGAL_INPUT_DOC_PATH", "").strip()
    candidate_inputs = []

    if env_value:
        candidate_inputs.extend(
            [
                env_value,
                os.path.join(base_dir, env_value),
                os.path.join(data_dir, env_value),
            ]
        )

    candidate_inputs.extend(
        [
            os.path.join(data_dir, "Luat-doanh-nghiep-2020-test.docx"),
            os.path.join(data_dir, "Luat-doanh-nghiep-2020-test.doc"),
            os.path.join(data_dir, "Luat-doanh-nghiep-2020-ban-word.doc"),
        ]
    )

    seen = set()
    for candidate in candidate_inputs:
        normalized = os.path.abspath(candidate)
        if normalized in seen:
            continue
        seen.add(normalized)
        if os.path.exists(normalized):
            return normalized

    if env_value:
        return os.path.abspath(os.path.join(base_dir, env_value))
    return os.path.join(data_dir, "Luat-doanh-nghiep-2020-test.docx")

# ==============================================================================
# PATHS - Tự quản lý dữ liệu và output riêng của fastapi-ai
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
CHROMA_DB_DIR = os.path.join(OUTPUT_DIR, "chroma_db")
RAW_TEXT_PATH = os.path.join(OUTPUT_DIR, "raw_text.txt")
PARSED_STRUCTURE_PATH = os.path.join(OUTPUT_DIR, "parsed_structure.json")
GRAPH_BUILD_LOG_PATH = os.path.join(OUTPUT_DIR, "graph_build_log.txt")
INPUT_DOC_PATH = _resolve_legal_input_doc_path(BASE_DIR, DATA_DIR)

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)

# ==============================================================================
# NEO4J
# ==============================================================================
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://127.0.0.1:7687")
NEO4J_USER = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "zintom69")

# ==============================================================================
# EMBEDDING MODEL - Phải trùng khớp với model đã index
# ==============================================================================
EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
CHROMA_COLLECTION_NAME = "luat_doanh_nghiep_2020"

# ==============================================================================
# GEMINI API
# ==============================================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

# ==============================================================================
# RETRIEVAL SETTINGS
# ==============================================================================
VECTOR_TOP_K = 20        # Candidates từ ChromaDB
RERANK_TOP_K = 5         # Kết quả sau rerank/filter
MAX_VALIDATOR_RETRIES = 1  # Số lần retry nếu Validator reject
