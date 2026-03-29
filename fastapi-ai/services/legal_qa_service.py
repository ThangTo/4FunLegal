import os
import re
from typing import Any

from fastapi import HTTPException, status


LOOKUP_ARTICLE_PATTERN = re.compile(r"[Dd][iee]u\s+(\d+[a-zA-Z]?)", re.IGNORECASE)

_orchestrator = None


def _get_service_mode() -> str:
    return os.getenv("AI_PROVIDER", "deterministic").strip().lower() or "deterministic"


def _is_gemini_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def _is_neo4j_ready() -> bool:
    if _get_service_mode() == "deterministic":
        return False

    try:
        from src.database.neo4j_client import Neo4jClient

        return Neo4jClient().verify_connection()
    except Exception:
        return False


def _is_chroma_ready() -> bool:
    if _get_service_mode() == "deterministic":
        return False

    try:
        from src.database.chroma_client import ChromaClient

        return ChromaClient().get_collection_count() > 0
    except Exception:
        return False


def get_legal_qa_readiness() -> dict[str, Any]:
    service_mode = _get_service_mode()
    neo4j_ready = _is_neo4j_ready()
    chroma_ready = _is_chroma_ready()
    gemini_configured = _is_gemini_configured()
    legal_qa_ready = service_mode == "deterministic" or (
        neo4j_ready and chroma_ready and gemini_configured
    )

    return {
        "serviceMode": service_mode,
        "neo4jReady": neo4j_ready,
        "chromaReady": chroma_ready,
        "geminiConfigured": gemini_configured,
        "legalQaReady": legal_qa_ready,
    }


def _build_suggested_prompts(
    question: str,
    route_type: str,
    context: dict[str, Any] | None,
) -> list[str]:
    if context and context.get("documentTitle"):
        return [
            "Tài liệu này đang nói về bước nào trong thủ tục?",
            "Căn cứ pháp lý nào trong tài liệu này là quan trọng nhất?",
            "Tài liệu này có ảnh hưởng gì đến việc nộp hồ sơ?",
        ]

    if route_type == "LOOKUP":
        return [
            "Điều này áp dụng trong trường hợp nào?",
            "Có khoản nào liên quan cần đọc thêm không?",
            "Hãy giải thích điều luật này theo cách dễ hiểu hơn.",
        ]

    normalized_question = question.lower()
    if "ho kinh doanh" in normalized_question:
        return [
            "Điều kiện đăng ký hộ kinh doanh gồm những gì?",
            "Tên hộ kinh doanh cần lưu ý điểm nào?",
            "Các giấy tờ nào thường phải chuẩn bị trước?",
        ]

    return [
        "Quy định này áp dụng với ai?",
        "Cần lưu ý rủi ro pháp lý nào?",
        "Có điều luật liên quan nào nên đọc thêm không?",
    ]


def _build_context_note(context: dict[str, Any] | None) -> str:
    if not context:
        return ""

    title = str(context.get("documentTitle", "")).strip()
    summary = str(context.get("documentSummary", "")).strip()
    source_name = str(context.get("sourceName", "")).strip()
    highlights = context.get("highlights", []) or []

    parts = []
    if title:
        parts.append(f'Tài liệu đang tham chiếu: "{title}".')
    if source_name:
        parts.append(f"Nguồn chính: {source_name}.")
    if summary:
        parts.append(f"Tóm tắt liên quan: {summary}")
    if highlights:
        parts.append("Điểm nổi bật: " + "; ".join(str(item) for item in highlights[:3]))

    return " ".join(part for part in parts if part).strip()


def _format_recent_history(history: list[dict[str, Any]] | None) -> str:
    if not history:
        return ""

    items = []
    for item in history[-4:]:
        role = str(item.get("role", "user"))
        content = str(item.get("content", "")).strip()
        if content:
            items.append(f"{role}: {content}")
    return "\n".join(items)


def _build_deterministic_answer(
    question: str,
    context: dict[str, Any] | None,
    history: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    route_type = "LOOKUP" if LOOKUP_ARTICLE_PATTERN.search(question) else "ADVISORY"
    context_note = _build_context_note(context)
    history_note = _format_recent_history(history)

    if route_type == "LOOKUP":
        answer = (
            "Hệ thống đang chạy ở chế độ dự phòng nên chưa thể truy xuất đầy đủ đồ thị tri thức pháp lý.\n\n"
            f"Tôi đã ghi nhận yêu cầu tra cứu: {question.strip()}. "
            f"{context_note} "
            f"{'Đối thoại gần đây: ' + history_note if history_note else ''}"
        )
    else:
        answer = (
            "Hệ thống đang chạy ở chế độ dự phòng nên đây là phản hồi định hướng thay vì kết luận pháp lý đầy đủ.\n\n"
            f"Câu hỏi của bạn là: {question.strip()}. "
            f"{context_note} "
            f"{'Đối thoại gần đây: ' + history_note if history_note else ''}"
        )

    citations = ["Luật Doanh nghiệp 2020"]
    if context and context.get("documentTitle"):
        citations.append(str(context["documentTitle"]))

    return {
        "provider": "deterministic-fastapi",
        "routeType": route_type,
        "answer": answer.strip(),
        "citations": citations,
        "confidenceScore": 0.42,
        "validationNotes": "Deterministic fallback mode",
        "suggestedPrompts": _build_suggested_prompts(question, route_type, context),
        "stats": {
            "mode": "deterministic",
            "groundedToDocumentContext": bool(context and context.get("documentTitle")),
        },
    }


def _get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        from src.agents.orchestrator import Orchestrator

        _orchestrator = Orchestrator()
    return _orchestrator


async def ask_legal_question(payload: dict[str, Any]) -> dict[str, Any]:
    question = str(payload.get("question", "")).strip()
    history = payload.get("history", [])
    context = payload.get("context")

    if not question:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question is required",
        )

    normalized_history = [
        {
            "role": str(item.get("role", "user")),
            "content": str(item.get("content", "")).strip(),
        }
        for item in history
        if isinstance(item, dict) and str(item.get("content", "")).strip()
    ]
    normalized_context = context if isinstance(context, dict) else None

    if _get_service_mode() == "deterministic":
        return _build_deterministic_answer(question, normalized_context, normalized_history)

    readiness = get_legal_qa_readiness()
    if not readiness["legalQaReady"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Legal assistant knowledge base is not ready",
        )

    try:
        orchestrator = _get_orchestrator()
        result = await orchestrator.process(
            question,
            recent_history=normalized_history,
            document_context=normalized_context,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    route_type = str(result.get("route_type", "ADVISORY"))
    citations = [str(item) for item in result.get("citations", []) if str(item).strip()]
    if normalized_context and normalized_context.get("documentTitle"):
        context_title = str(normalized_context["documentTitle"]).strip()
        if context_title and context_title not in citations:
            citations.append(context_title)

    return {
        "provider": "graph-rag-fastapi",
        "routeType": route_type,
        "answer": result.get("answer", ""),
        "citations": citations,
        "confidenceScore": result.get("confidence_score", 0),
        "validationNotes": result.get("validation_notes", ""),
        "suggestedPrompts": _build_suggested_prompts(question, route_type, normalized_context),
        "stats": {
            **result.get("stats", {}),
            "groundedToDocumentContext": bool(
                normalized_context and normalized_context.get("documentTitle")
            ),
            "historyTurnsUsed": len(normalized_history[-4:]),
        },
    }
