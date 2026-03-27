"""
Validator Agent: Deterministic Grounding + Deep Content Check.

Kiểm chứng câu trả lời bằng 3 bước:
1. Regex trích xuất "Điều X", "Khoản Y Điều Z" từ answer
2. Cypher MATCH kiểm tra tồn tại trong Graph
3. Deep Check: đối soát nội dung trích dẫn với text thực tế trong Graph
"""
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from src.database.neo4j_client import Neo4jClient


@dataclass
class ValidationResult:
    """Kết quả kiểm chứng."""
    is_valid: bool
    confidence_score: float  # 0.0 - 1.0
    verified_citations: list[str] = field(default_factory=list)
    hallucinated_citations: list[str] = field(default_factory=list)
    content_mismatches: list[str] = field(default_factory=list)
    notes: str = ""


# Regex trích xuất trích dẫn từ answer
RE_CITATION_DIEU = re.compile(r'[Đđ]iều\s+(\d+[a-zA-Z]?)')
RE_CITATION_KHOAN_DIEU = re.compile(
    r'[Kk]hoản\s+(\d+[a-zA-Z]?)\s+[Đđ]iều\s+(\d+[a-zA-Z]?)'
)

# Ngưỡng tương đồng nội dung (Deep Check)
CONTENT_SIMILARITY_THRESHOLD = 0.3


class ValidatorAgent:
    """Fact-check câu trả lời bằng Deterministic Grounding + Deep Check."""

    def __init__(self):
        self.neo4j = Neo4jClient()

    def validate(self, answer: str, context: str) -> ValidationResult:
        """
        Kiểm tra tính chính xác của câu trả lời.

        Bước 1: Kiểm tra tồn tại (EXISTS check)
        Bước 2: Đối soát nội dung (Deep Content Check)
        """
        verified = []
        hallucinated = []
        content_mismatches = []

        # ══ Bước 1: Trích xuất "Khoản X Điều Y" ══
        checked_articles = set()

        for match in RE_CITATION_KHOAN_DIEU.finditer(answer):
            clause_num = match.group(1)
            article_num = match.group(2)
            citation = f"Khoản {clause_num} Điều {article_num}"
            checked_articles.add(article_num)

            exists = self.neo4j.verify_exists(article_num, clause_num)
            if exists:
                verified.append(citation)
            else:
                hallucinated.append(citation)

        # ══ Bước 2: Trích xuất "Điều X" (bỏ qua đã check) ══
        for match in RE_CITATION_DIEU.finditer(answer):
            article_num = match.group(1)
            if article_num in checked_articles:
                continue
            checked_articles.add(article_num)

            citation = f"Điều {article_num}"
            exists = self.neo4j.verify_exists(article_num)
            if exists:
                verified.append(citation)
            else:
                hallucinated.append(citation)

        # ══ Bước 3: Deep Content Check ══
        # Đối soát: nội dung AI trích dẫn có khớp với text thực tế không?
        for article_num in checked_articles:
            if f"Điều {article_num}" in hallucinated or \
               any(article_num in h for h in hallucinated):
                continue  # Bỏ qua điều đã biết là ảo

            mismatch = self._deep_content_check(
                article_num, answer, context
            )
            if mismatch:
                content_mismatches.append(mismatch)

        # ══ Tính confidence score ══
        total_citations = len(verified) + len(hallucinated)
        mismatch_penalty = len(content_mismatches) * 0.1

        if total_citations == 0:
            confidence = 0.5
            notes = "Không phát hiện trích dẫn Điều/Khoản cụ thể."
        elif len(hallucinated) == 0:
            confidence = max(0.0, 1.0 - mismatch_penalty)
            notes = f"✓ {total_citations} trích dẫn xác minh tồn tại."
            if content_mismatches:
                notes += f" ⚠ {len(content_mismatches)} nội dung có sai lệch."
        else:
            confidence = max(0.0, len(verified) / total_citations - mismatch_penalty)
            notes = (
                f"✗ {len(hallucinated)}/{total_citations} trích dẫn không tồn tại: "
                f"{', '.join(hallucinated)}"
            )

        is_valid = (len(hallucinated) == 0
                    and confidence >= 0.5
                    and len(content_mismatches) == 0)

        return ValidationResult(
            is_valid=is_valid,
            confidence_score=round(confidence, 2),
            verified_citations=verified,
            hallucinated_citations=hallucinated,
            content_mismatches=content_mismatches,
            notes=notes,
        )

    def _deep_content_check(self, article_number: str,
                            answer: str, context: str) -> str | None:
        """
        Kiểm tra nội dung: so sánh text mà AI trích dẫn từ Điều X
        với text thực tế của Điều X trong Graph.

        Returns:
            Chuỗi mô tả sai lệch, hoặc None nếu khớp.
        """
        real_content = self.neo4j.get_article_content(article_number)
        if not real_content:
            return None  # Đã xử lý ở bước EXISTS

        # Tìm đoạn text trong answer liên quan đến Điều này
        pattern = re.compile(
            rf'[Đđ]iều\s+{re.escape(article_number)}[^.]*?\.'
            rf'([^.]*(?:\.[^.]*?){{0,2}})',
            re.DOTALL,
        )
        match = pattern.search(answer)
        if not match:
            return None  # AI không trích dẫn nội dung cụ thể

        # So sánh độ tương đồng
        cited_text = match.group(0).strip()
        similarity = SequenceMatcher(
            None,
            cited_text.lower(),
            real_content[:len(cited_text) * 2].lower(),
        ).ratio()

        if similarity < CONTENT_SIMILARITY_THRESHOLD:
            return (
                f"Điều {article_number}: Nội dung AI trích dẫn có độ khớp thấp "
                f"({similarity:.0%}) so với văn bản gốc."
            )
        return None
