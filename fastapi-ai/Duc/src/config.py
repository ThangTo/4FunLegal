"""
Cấu hình chung cho pipeline xây dựng database từ văn bản luật.
"""
import os

# ==============================================================================
# ĐƯỜNG DẪN
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
CHROMA_DB_DIR = os.path.join(OUTPUT_DIR, "chroma_db")

# File đầu vào
INPUT_DOC_PATH = os.path.join(DATA_DIR, "Luat-doanh-nghiep-2020-test.doc")

# File đầu ra
PARSED_STRUCTURE_PATH = os.path.join(OUTPUT_DIR, "parsed_structure.json")
RAW_TEXT_PATH = os.path.join(OUTPUT_DIR, "raw_text.txt")

# ==============================================================================
# NEO4J
# ==============================================================================
# NEO4J_URI = "bolt://localhost:7687"
NEO4J_URL = 'neo4j://127.0.0.1:7687'
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "zintom69"  # Thay đổi password khi cài Neo4j

# ==============================================================================
# EMBEDDING MODEL
# ==============================================================================
EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
CHROMA_COLLECTION_NAME = "luat_doanh_nghiep_2020"

# ==============================================================================
# GEMINI API
# ==============================================================================
GEMINI_API_KEY = 'AIzaSyAKRzWNYt77ohVHcplTxsXb1VDb30VyG2M'  # Thay bằng API key thật
GEMINI_MODEL_NAME = "gemini-2.5-flash"  # Model Gemini để sinh câu trả lời

# ==============================================================================
# RETRIEVAL SETTINGS
# ==============================================================================
VECTOR_TOP_K = 20        # Số kết quả lấy từ ChromaDB
RERAN_TOP_K = 5          # Số kết quả sau rerank

# ==============================================================================
# TẠO THƯ MỤC OUTPUT NẾU CHƯA CÓ
# ==============================================================================
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)
