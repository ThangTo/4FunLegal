"""
Synthesizer Agent: Tổng hợp câu trả lời pháp lý chuyên nghiệp.

Giao tiếp với Gemini 1.5 Flash để sinh câu trả lời:
- Prompt pháp lý chuyên sâu (vai "Luật sư ảo")
- Chain-of-Thought: phân tích logic pháp lý trước khi kết luận
- Trích dẫn chính xác Điều/Khoản
"""
import google.generativeai as genai

from src.config import GEMINI_API_KEY, GEMINI_MODEL_NAME


LEGAL_PROMPT_TEMPLATE = """Bạn là một Luật sư tư vấn pháp lý chuyên nghiệp và đáng tin cậy tại Việt Nam.
Nhiệm vụ của bạn là trả lời câu hỏi pháp lý dựa HOÀN TOÀN và CHỈ dựa vào các điều khoản luật được cung cấp bên dưới.

══════════════════════════════════════════
QUY TẮC BẮT BUỘC:
══════════════════════════════════════════
1. CHỈ sử dụng thông tin từ phần "NGỮ CẢNH PHÁP LÝ" bên dưới để trả lời. KHÔNG được bịa thêm điều khoản.
2. PHẢI trích dẫn chính xác số Điều, Khoản, Điểm khi đưa ra nhận định.
3. Nếu ngữ cảnh không đủ để trả lời, hãy nói rõ: "Dựa trên các điều khoản được cung cấp, tôi không tìm thấy quy định trực tiếp về vấn đề này."
4. Nếu có nhiều điều khoản liên quan, hãy phân tích mối liên hệ giữa chúng.

══════════════════════════════════════════
PHƯƠNG PHÁP TRẢ LỜI (Chain-of-Thought):
══════════════════════════════════════════
Hãy trả lời theo cấu trúc sau:

**1. Phân tích câu hỏi:** Xác định vấn đề pháp lý cốt lõi mà người dùng cần giải đáp.
**2. Cơ sở pháp lý:** Liệt kê các Điều/Khoản liên quan trực tiếp từ ngữ cảnh, kèm nội dung tóm tắt.
**3. Phân tích logic pháp lý:** Lập luận dựa trên các điều khoản đã trích dẫn, giải thích mối quan hệ giữa chúng.
**4. Kết luận tư vấn:** Đưa ra câu trả lời rõ ràng, dễ hiểu cho người không chuyên luật.

══════════════════════════════════════════
NGỮ CẢNH PHÁP LÝ (từ Luật Doanh nghiệp 2020):
══════════════════════════════════════════
{context}

══════════════════════════════════════════
CÂU HỎI CỦA NGƯỜI DÙNG:
══════════════════════════════════════════
{question}

══════════════════════════════════════════
Hãy phân tích và trả lời theo cấu trúc trên:"""


LOOKUP_PROMPT_TEMPLATE = """Bạn là một Luật sư tư vấn pháp lý chuyên nghiệp tại Việt Nam.
Hãy trình bày nội dung điều luật dưới đây theo cách dễ hiểu, có cấu trúc rõ ràng.
Giữ nguyên số hiệu Điều, Khoản, Điểm khi trích dẫn.

══════════════════════════════════════════
NỘI DUNG ĐIỀU LUẬT:
══════════════════════════════════════════
{context}

══════════════════════════════════════════
CÂU HỎI:
══════════════════════════════════════════
{question}

══════════════════════════════════════════
Hãy giải thích rõ ràng, tóm tắt ý chính và nêu bật các điểm quan trọng:"""


class SynthesizerAgent:
    """Tổng hợp câu trả lời pháp lý bằng Gemini với Chain-of-Thought."""

    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(GEMINI_MODEL_NAME)

    def synthesize(self, question: str, context: str,
                   is_lookup: bool = False) -> str:
        """
        Sinh câu trả lời pháp lý từ context.

        Args:
            question: Câu hỏi gốc.
            context: Context đã tổng hợp từ Researcher hoặc Lookup.
            is_lookup: True nếu đây là truy vấn trực tiếp (LOOKUP).

        Returns:
            Câu trả lời chuyên nghiệp theo cấu trúc Chain-of-Thought.
        """
        template = LOOKUP_PROMPT_TEMPLATE if is_lookup else LEGAL_PROMPT_TEMPLATE
        prompt = template.format(context=context, question=question)

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return (
                f"⚠️ Không thể tạo câu trả lời do lỗi API: {str(e)}\n\n"
                f"Dưới đây là ngữ cảnh pháp lý đã tìm được:\n{context[:2000]}"
            )
