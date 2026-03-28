"""
Router Agent: Phân loại câu hỏi pháp lý bằng LLM + Regex fallback.

Chiến lược 2 tầng:
1. Regex nhanh: Bắt các pattern rõ ràng (Điều X, Khoản Y Điều Z) → LOOKUP tức thì
2. LLM classify: Dùng Gemini Flash cho các câu hỏi mơ hồ/phức hợp → ADVISORY | INVALID
"""
import re
import json
import unicodedata
from dataclasses import dataclass

import google.generativeai as genai
from src.config import GEMINI_API_KEY, GEMINI_MODEL_NAME


@dataclass
class RouteResult:
    """Kết quả phân loại câu hỏi."""
    route_type: str      # LOOKUP | ADVISORY | INVALID
    article_number: str | None = None
    clause_number: str | None = None
    original_question: str = ""


def _normalize(text: str) -> str:
    """Chuẩn hóa Unicode NFC để dấu tiếng Việt không làm lệch Regex."""
    return unicodedata.normalize("NFC", text)


# Regex bắt số hiệu Điều/Khoản (hỗ trợ Điều 15a, 16b...)
RE_ARTICLE_LOOKUP = re.compile(
    r'[Đđ]iều\s+(\d+[a-zA-Z]?)', re.IGNORECASE
)
RE_CLAUSE_LOOKUP = re.compile(
    r'[Kk]hoản\s+(\d+[a-zA-Z]?)\s+[Đđ]iều\s+(\d+[a-zA-Z]?)',
    re.IGNORECASE,
)

# Pattern LOOKUP thuần túy (chỉ hỏi nội dung Điều, không phân tích)
RE_PURE_LOOKUP = re.compile(
    r'^(?:cho\s+(?:tôi|mình)\s+(?:biết|xem)|nội\s+dung|'
    r'(?:nêu|đọc|cho\s+xem|trích)\s+)'
    r'.*[Đđ]iều\s+\d+[a-zA-Z]?',
    re.IGNORECASE,
)
RE_SIMPLE_LOOKUP = re.compile(
    r'^[Đđ]iều\s+\d+[a-zA-Z]?\s*'
    r'(?:nói\s+gì|là\s+gì|quy\s+định\s+(?:gì|những\s+gì)|'
    r'có\s+nội\s+dung\s+gì)?\s*[?.!]?\s*$',
    re.IGNORECASE,
)

CLASSIFY_PROMPT = """Bạn là hệ thống phân loại câu hỏi pháp lý Việt Nam.
Hãy phân loại câu hỏi sau thành ĐÚNG 1 trong 3 loại:

- **LOOKUP**: Người dùng muốn tra cứu/đọc nội dung của một Điều, Khoản cụ thể.
  Ví dụ: "Điều 15 nói gì?", "Cho tôi xem Khoản 2 Điều 10"

- **ADVISORY**: Người dùng muốn được tư vấn, giải thích, so sánh, hoặc hỏi về điều kiện/thủ tục/quyền/nghĩa vụ liên quan đến Luật Doanh nghiệp.
  Ví dụ: "Điều kiện thành lập công ty?", "Tôi muốn mở quán cà phê", "So sánh TNHH và Cổ phần"

- **INVALID**: Câu hỏi KHÔNG liên quan đến pháp luật doanh nghiệp Việt Nam.
  Ví dụ: "Thời tiết hôm nay", "Cách nấu phở"

CÂU HỎI: "{question}"

Trả về CHÍNH XÁC một JSON object, KHÔNG giải thích:
{{"type": "LOOKUP" hoặc "ADVISORY" hoặc "INVALID", "article_number": null hoặc số Điều nếu có, "clause_number": null hoặc số Khoản nếu có}}"""


class RouterAgent:
    """Phân loại câu hỏi pháp lý: Regex fast-path + LLM fallback."""

    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(GEMINI_MODEL_NAME)

    def classify(self, question: str) -> RouteResult:
        """
        Phân loại câu hỏi theo chiến lược 2 tầng:
        1. Regex: Bắt LOOKUP thuần túy (tức thì, 0 token)
        2. LLM: Phân loại các câu phức hợp/mơ hồ
        """
        # Chuẩn hóa Unicode NFC trước khi xử lý
        question = _normalize(question.strip())

        # ── Tầng 1: Regex fast-path cho LOOKUP rõ ràng ──
        if RE_SIMPLE_LOOKUP.match(question) or RE_PURE_LOOKUP.match(question):
            match_clause = RE_CLAUSE_LOOKUP.search(question)
            if match_clause:
                return RouteResult(
                    route_type="LOOKUP",
                    clause_number=match_clause.group(1),
                    article_number=match_clause.group(2),
                    original_question=question,
                )
            match_article = RE_ARTICLE_LOOKUP.search(question)
            if match_article:
                return RouteResult(
                    route_type="LOOKUP",
                    article_number=match_article.group(1),
                    original_question=question,
                )

        # ── Tầng 2: LLM classify cho câu hỏi phức hợp ──
        return self._llm_classify(question)

    def _llm_classify(self, question: str) -> RouteResult:
        """Dùng Gemini Flash để phân loại câu hỏi phức hợp."""
        prompt = CLASSIFY_PROMPT.format(question=question)

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()

            # Parse JSON từ response (xử lý markdown code block)
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            result = json.loads(text)

            route_type = result.get("type", "ADVISORY").upper()
            if route_type not in ("LOOKUP", "ADVISORY", "INVALID"):
                route_type = "ADVISORY"

            article_number = result.get("article_number")
            clause_number = result.get("clause_number")

            if article_number is not None:
                article_number = str(article_number)
            if clause_number is not None:
                clause_number = str(clause_number)

            return RouteResult(
                route_type=route_type,
                article_number=article_number,
                clause_number=clause_number,
                original_question=question,
            )

        except Exception:
            # Fallback: mặc định ADVISORY (an toàn hơn INVALID)
            return RouteResult(
                route_type="ADVISORY",
                original_question=question,
            )
