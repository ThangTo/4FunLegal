import time
from typing import Any

from src.config import MAX_VALIDATOR_RETRIES
from src.agents.researcher_agent import ResearcherAgent
from src.agents.router_agent import RouteResult, RouterAgent
from src.agents.synthesizer_agent import SynthesizerAgent
from src.agents.validator_agent import ValidatorAgent
from src.database.neo4j_client import Neo4jClient


class Orchestrator:
    """State machine điều phối 4 agent cho legal QA."""

    def __init__(self):
        self.router = RouterAgent()
        self.researcher = ResearcherAgent()
        self.validator = ValidatorAgent()
        self.synthesizer = SynthesizerAgent()
        self.neo4j = Neo4jClient()

    async def process(
        self,
        question: str,
        recent_history: list[dict[str, Any]] | None = None,
        document_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        start_time = time.time()
        route = self.router.classify(question)
        retrieval_query = self._build_retrieval_query(question, recent_history, document_context)

        if route.route_type == "INVALID":
            return self._build_response(
                question=question,
                route_type="INVALID",
                answer=(
                    "Xin lỗi, câu hỏi của bạn không liên quan đến pháp luật doanh nghiệp. "
                    "Vui lòng đặt câu hỏi về Luật Doanh nghiệp 2020 hoặc thủ tục đăng ký hộ kinh doanh."
                ),
                stats={"groundedToDocumentContext": bool(document_context)},
                processing_time=time.time() - start_time,
            )

        if route.route_type == "LOOKUP":
            return await self._handle_lookup(
                route,
                start_time,
                recent_history=recent_history,
                document_context=document_context,
            )

        return await self._handle_advisory(
            route,
            start_time,
            retrieval_query=retrieval_query,
            recent_history=recent_history,
            document_context=document_context,
        )

    async def _handle_lookup(
        self,
        route: RouteResult,
        start_time: float,
        recent_history: list[dict[str, Any]] | None,
        document_context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        article_data = self.neo4j.lookup_article(route.article_number)

        if not article_data:
            return self._build_response(
                question=route.original_question,
                route_type="LOOKUP",
                answer=(
                    f"Không tìm thấy Điều {route.article_number} trong kho tri thức pháp lý hiện tại."
                ),
                stats={"groundedToDocumentContext": bool(document_context)},
                processing_time=time.time() - start_time,
            )

        legal_context = self._format_lookup_context(article_data)
        answer = self.synthesizer.synthesize(
            question=route.original_question,
            legal_context=legal_context,
            recent_history=recent_history or [],
            document_context=document_context,
            is_lookup=True,
        )

        return self._build_response(
            question=route.original_question,
            route_type="LOOKUP",
            answer=answer,
            context=legal_context,
            stats={
                "lookupArticle": route.article_number,
                "groundedToDocumentContext": bool(document_context),
            },
            processing_time=time.time() - start_time,
        )

    async def _handle_advisory(
        self,
        route: RouteResult,
        start_time: float,
        retrieval_query: str,
        recent_history: list[dict[str, Any]] | None,
        document_context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        research = await self.researcher.research(
            retrieval_query,
            document_context=document_context,
        )

        if not research["context"]:
            return self._build_response(
                question=route.original_question,
                route_type="ADVISORY",
                answer=(
                    "Không tìm thấy điều khoản nào liên quan đến câu hỏi này trong kho tri thức pháp lý hiện tại."
                ),
                stats={
                    **research["stats"],
                    "groundedToDocumentContext": bool(document_context),
                },
                processing_time=time.time() - start_time,
            )

        answer = ""
        validation = None

        for attempt in range(MAX_VALIDATOR_RETRIES + 1):
            answer = self.synthesizer.synthesize(
                question=route.original_question,
                legal_context=research["context"],
                recent_history=recent_history or [],
                document_context=document_context,
                is_lookup=False,
            )

            validation = self.validator.validate(
                answer=answer,
                context=research["context"],
            )

            if validation.is_valid:
                break

            if attempt < MAX_VALIDATOR_RETRIES:
                research["context"] += (
                    "\n\n=== VALIDATOR FEEDBACK ===\n"
                    + validation.notes
                    + "\nOnly cite articles that exist in the supplied legal context."
                )

        return self._build_response(
            question=route.original_question,
            route_type="ADVISORY",
            answer=answer,
            context=research["context"],
            citations=validation.verified_citations if validation else [],
            confidence_score=validation.confidence_score if validation else 0,
            validation_notes=validation.notes if validation else "",
            stats={
                **research["stats"],
                "groundedToDocumentContext": bool(document_context),
            },
            processing_time=time.time() - start_time,
        )

    def _build_retrieval_query(
        self,
        question: str,
        recent_history: list[dict[str, Any]] | None,
        document_context: dict[str, Any] | None,
    ) -> str:
        history_parts = []
        for item in (recent_history or [])[-4:]:
            role = str(item.get("role", "user"))
            content = str(item.get("content", "")).strip()
            if content:
                history_parts.append(f"{role}: {content}")

        document_parts = []
        if document_context:
            title = str(document_context.get("documentTitle", "")).strip()
            summary = str(document_context.get("documentSummary", "")).strip()
            highlights = document_context.get("highlights", []) or []
            if title:
                document_parts.append(f"Tài liệu ưu tiên: {title}")
            if summary:
                document_parts.append(f"Tóm tắt tài liệu: {summary}")
            if highlights:
                document_parts.append(
                    "Điểm cần ưu tiên: " + "; ".join(str(item) for item in highlights[:3])
                )

        query_parts = []
        if history_parts:
            query_parts.append("Đối thoại gần đây:\n" + "\n".join(history_parts))
        if document_parts:
            query_parts.append("\n".join(document_parts))
        query_parts.append("Câu hỏi hiện tại: " + question.strip())
        return "\n\n".join(query_parts)

    def _format_lookup_context(self, article_data: dict[str, Any]) -> str:
        parts = []
        parts.append(
            f"Điều {article_data['dieu_number']}. {article_data['dieu_title']}"
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

    def _build_response(
        self,
        question: str,
        route_type: str,
        answer: str,
        context: str = "",
        citations: list[str] | None = None,
        confidence_score: float = 1.0,
        validation_notes: str = "",
        stats: dict[str, Any] | None = None,
        processing_time: float = 0,
    ) -> dict[str, Any]:
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
