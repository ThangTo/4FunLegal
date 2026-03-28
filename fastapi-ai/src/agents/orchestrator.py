"""
Orchestrator: Điều phối hệ thống Đa Agent theo State Machine pattern.

Luồng xử lý:
- LOOKUP  → fast_graph_lookup() → Synthesizer → Done
- ADVISORY → Researcher → Synthesizer → Validator → (retry or Done)
- INVALID → Từ chối lịch sự
"""
import asyncio
import time

from src.config import MAX_VALIDATOR_RETRIES
from src.agents.router_agent import RouterAgent, RouteResult
from src.agents.researcher_agent import ResearcherAgent
from src.agents.validator_agent import ValidatorAgent
from src.agents.synthesizer_agent import SynthesizerAgent
from src.database.neo4j_client import Neo4jClient


class Orchestrator:
    """State Machine điều phối 4 Agent."""

    def __init__(self):
        self.router = RouterAgent()
        self.researcher = ResearcherAgent()
        self.validator = ValidatorAgent()
        self.synthesizer = SynthesizerAgent()
        self.neo4j = Neo4jClient()

    async def process(self, question: str) -> dict:
        """
        Xử lý câu hỏi pháp lý end-to-end.

        Returns:
            {
                "question": str,
                "route_type": str,
                "answer": str,
                "citations": list[str],
                "confidence_score": float,
                "validation_notes": str,
                "stats": dict,
                "processing_time": float
            }
        """
        start_time = time.time()

        # ══════════════════════════════════════
        # BƯỚC 1: PHÂN LOẠI CÂU HỎI (Router)
        # ══════════════════════════════════════
        route = self.router.classify(question)

        if route.route_type == "INVALID":
            return self._build_response(
                question=question,
                route_type="INVALID",
                answer="Xin lỗi, câu hỏi của bạn không liên quan đến pháp luật doanh nghiệp. "
                       "Vui lòng đặt câu hỏi về Luật Doanh nghiệp 2020.",
                processing_time=time.time() - start_time,
            )

        if route.route_type == "LOOKUP":
            return await self._handle_lookup(route, start_time)

        # route_type == "ADVISORY"
        return await self._handle_advisory(route, start_time)

    # ==========================================================================
    # LOOKUP PATH: fast_graph_lookup → Synthesizer → Done
    # ==========================================================================

    async def _handle_lookup(self, route: RouteResult,
                             start_time: float) -> dict:
        """Tra cứu trực tiếp: bỏ qua Vector Search."""
        article_data = self.neo4j.lookup_article(route.article_number)

        if not article_data:
            return self._build_response(
                question=route.original_question,
                route_type="LOOKUP",
                answer=f"Không tìm thấy Điều {route.article_number} "
                       f"trong Luật Doanh nghiệp 2020.",
                processing_time=time.time() - start_time,
            )

        # Xây dựng context từ dữ liệu Graph
        context = self._format_lookup_context(article_data)

        # Synthesizer tạo câu trả lời
        answer = self.synthesizer.synthesize(
            question=route.original_question,
            context=context,
            is_lookup=True,
        )

        return self._build_response(
            question=route.original_question,
            route_type="LOOKUP",
            answer=answer,
            context=context,
            stats={"lookup_article": route.article_number},
            processing_time=time.time() - start_time,
        )

    # ==========================================================================
    # ADVISORY PATH: Researcher → Synthesizer → Validator → (retry or Done)
    # ==========================================================================

    async def _handle_advisory(self, route: RouteResult,
                               start_time: float) -> dict:
        """Tư vấn tổng hợp: full pipeline với validation loop."""

        # Bước 2: Researcher (Vector + Graph)
        research = await self.researcher.research(route.original_question)

        if not research["context"]:
            return self._build_response(
                question=route.original_question,
                route_type="ADVISORY",
                answer="Không tìm thấy điều khoản nào liên quan đến câu hỏi của bạn "
                       "trong Luật Doanh nghiệp 2020.",
                stats=research["stats"],
                processing_time=time.time() - start_time,
            )

        # Validation loop (max retries)
        answer = ""
        validation = None

        for attempt in range(MAX_VALIDATOR_RETRIES + 1):
            # Bước 3: Synthesizer
            answer = self.synthesizer.synthesize(
                question=route.original_question,
                context=research["context"],
                is_lookup=False,
            )

            # Bước 4: Validator (Deterministic Grounding)
            validation = self.validator.validate(
                answer=answer,
                context=research["context"],
            )

            if validation.is_valid:
                break

            # Nếu invalid và còn retry → gửi feedback cụ thể
            if attempt < MAX_VALIDATOR_RETRIES:
                error_details = []

                if validation.hallucinated_citations:
                    error_details.append(
                        "CÁC TRÍCH DẪN KHÔNG TỒN TẠI (phải xóa bỏ):\n"
                        + "\n".join(
                            f"  ✗ {c}" for c in validation.hallucinated_citations
                        )
                    )

                if validation.content_mismatches:
                    error_details.append(
                        "NỘI DUNG TRÍCH DẪN SAI LỆCH (phải sửa lại):\n"
                        + "\n".join(
                            f"  ⚠ {m}" for m in validation.content_mismatches
                        )
                    )

                feedback = "\n".join(error_details)
                research["context"] += (
                    f"\n\n{'═' * 50}\n"
                    f"⚠️ PHẢN HỒI TỰ KIỂM TRA (LẦN {attempt + 1}):\n"
                    f"{feedback}\n"
                    f"YÊU CẦU: Hãy sửa chính xác các lỗi trên. "
                    f"CHỈ trích dẫn Điều/Khoản CÓ TRONG ngữ cảnh.\n"
                    f"{'═' * 50}"
                )

        return self._build_response(
            question=route.original_question,
            route_type="ADVISORY",
            answer=answer,
            context=research["context"],
            citations=validation.verified_citations if validation else [],
            confidence_score=validation.confidence_score if validation else 0,
            validation_notes=validation.notes if validation else "",
            stats=research["stats"],
            processing_time=time.time() - start_time,
        )

    # ==========================================================================
    # HELPERS
    # ==========================================================================

    def _format_lookup_context(self, article_data: dict) -> str:
        """Format dữ liệu Graph thành context string cho LOOKUP."""
        parts = []
        parts.append(
            f"Điều {article_data['dieu_number']}. "
            f"{article_data['dieu_title']}"
        )
        if article_data["parent_title"]:
            parts.append(
                f"({article_data['parent_type']} {article_data['parent_number']}: "
                f"{article_data['parent_title']})"
            )
        if article_data["dieu_content"]:
            parts.append(f"\n{article_data['dieu_content']}")

        for khoan in article_data["khoan_list"]:
            if khoan["content"]:
                parts.append(f"\n{khoan['number']}. {khoan['content']}")

        for diem in article_data["diem_list"]:
            if diem["content"]:
                parts.append(f"  {diem['number']}) {diem['content']}")

        return "\n".join(parts)

    def _build_response(self, question: str, route_type: str,
                        answer: str, context: str = "",
                        citations: list[str] = None,
                        confidence_score: float = 1.0,
                        validation_notes: str = "",
                        stats: dict = None,
                        processing_time: float = 0) -> dict:
        return {
            "question": question,
            "route_type": route_type,
            "answer": answer,
            "citations": citations or [],
            "confidence_score": confidence_score,
            "validation_notes": validation_notes,
            "stats": stats or {},
            "processing_time_seconds": round(processing_time, 2),
        }
