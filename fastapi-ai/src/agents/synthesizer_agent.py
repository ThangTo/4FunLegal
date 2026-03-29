import google.generativeai as genai

from src.config import GEMINI_API_KEY, GEMINI_MODEL_NAME


LEGAL_PROMPT_TEMPLATE = """Bạn là một trợ lý pháp lý đáng tin cậy tại Việt Nam.
Nhiệm vụ của bạn là trả lời câu hỏi dựa HOÀN TOÀN vào khối NGỮ CẢNH PHÁP LÝ được cung cấp.

QUY TẮC BẮT BUỘC:
1. Chỉ dựa trên ngữ cảnh pháp lý đã truy xuất; không tự ý bịa thêm điều khoản.
2. Nếu có tài liệu đang xem, ưu tiên trả lời gắn với tài liệu đó và nêu rõ ràng ràng buộc này.
3. Phải giữ được mạch hỏi đáp hiện tại dựa trên đối thoại gần đây.
4. Nếu ngữ cảnh không đủ, nói rõ ràng không tìm thấy căn cứ trực tiếp.
5. Khi kết luận, nếu có trích dẫn thì phải giữ nguyên số Điều/Khoản/điểm xuất hiện trong ngữ cảnh.

ĐỐI THOẠI GẦN ĐÂY:
{recent_history}

TÀI LIỆU ĐANG XEM:
{document_context}

NGỮ CẢNH PHÁP LÝ ĐÃ TRUY XUẤT:
{legal_context}

CÂU HỎI HIỆN TẠI:
{question}

Hãy trả lời gọn rõ, grounded, và nếu đang ưu tiên tài liệu đang xem thì nêu điều đó trong câu trả lời."""


LOOKUP_PROMPT_TEMPLATE = """Bạn là một trợ lý pháp lý Việt Nam.
Hãy giải thích nội dung điều luật dưới đây theo cách dễ hiểu.
Nếu có tài liệu đang xem thì nêu rằng bạn đang đối chiếu với tài liệu đó, nhưng vẫn chỉ kết luận dựa trên ngữ cảnh pháp lý.

ĐỐI THOẠI GẦN ĐÂY:
{recent_history}

TÀI LIỆU ĐANG XEM:
{document_context}

NỘI DUNG ĐIỀU LUẬT:
{legal_context}

CÂU HỎI:
{question}

Trả lời ngắn gọn, rõ ràng, dễ hiểu, có trích dẫn nếu xuất hiện trong ngữ cảnh."""


class SynthesizerAgent:
    """Tổng hợp câu trả lời pháp lý bằng Gemini."""

    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(GEMINI_MODEL_NAME)

    def synthesize(
        self,
        question: str,
        legal_context: str,
        recent_history: list[dict] | None = None,
        document_context: dict | None = None,
        is_lookup: bool = False,
    ) -> str:
        template = LOOKUP_PROMPT_TEMPLATE if is_lookup else LEGAL_PROMPT_TEMPLATE
        prompt = template.format(
            question=question,
            legal_context=legal_context,
            recent_history=self._format_recent_history(recent_history or []),
            document_context=self._format_document_context(document_context),
        )

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as exc:
            return (
                "Không thể tạo câu trả lời do lỗi API. "
                f"Lỗi: {exc}\n\nNgữ cảnh truy xuất:\n{legal_context[:2000]}"
            )

    def _format_recent_history(self, recent_history: list[dict]) -> str:
        if not recent_history:
            return "Không có."

        lines = []
        for item in recent_history[-4:]:
            role = str(item.get("role", "user")).upper()
            content = str(item.get("content", "")).strip()
            if content:
                lines.append(f"{role}: {content}")
        return "\n".join(lines) if lines else "Không có."

    def _format_document_context(self, document_context: dict | None) -> str:
        if not document_context:
            return "Không có tài liệu đang xem."

        title = str(document_context.get("documentTitle", "")).strip()
        summary = str(document_context.get("documentSummary", "")).strip()
        source_name = str(document_context.get("sourceName", "")).strip()
        highlights = document_context.get("highlights", []) or []

        lines = []
        if title:
            lines.append(f"Tiêu đề: {title}")
        if source_name:
            lines.append(f"Nguồn: {source_name}")
        if summary:
            lines.append(f"Tóm tắt: {summary}")
        if highlights:
            lines.append("Điểm nổi bật:")
            lines.extend(f"- {item}" for item in highlights[:4])

        return "\n".join(lines) if lines else "Không có tài liệu đang xem."
