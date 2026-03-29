from typing import Any

from services.legal_qa_service import ask_legal_question


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _contains_any(value: str, keywords: list[str]) -> bool:
    normalized = _normalize_text(value)
    return any(keyword in normalized for keyword in keywords)


def _flatten_document_issues(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for document in documents:
        for issue in document.get("semanticIssues", []) or []:
            issues.append(issue)
    return issues


def _find_relevant_issues(
    question: str,
    findings: list[dict[str, Any]],
    document_issues: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    normalized_question = _normalize_text(question)
    issue_pool = document_issues + findings

    def score_issue(issue: dict[str, Any]) -> int:
        score = 0
        haystacks = [
          _normalize_text(str(issue.get("title", ""))),
          _normalize_text(str(issue.get("affectedField", ""))),
          _normalize_text(str(issue.get("rejectionReason", ""))),
          _normalize_text(str(issue.get("extractedValue", ""))),
        ]
        for source_document in issue.get("sourceDocuments", []) or []:
            haystacks.append(_normalize_text(str(source_document.get("documentLabel", ""))))
            haystacks.append(_normalize_text(str(source_document.get("originalName", ""))))

        for token in normalized_question.split():
            if len(token) < 3:
                continue
            if any(token in haystack for haystack in haystacks):
                score += 1

        if issue.get("severity") == "critical":
            score += 2

        return score

    ranked = sorted(issue_pool, key=score_issue, reverse=True)
    return [item for item in ranked if score_issue(item) > 0][:3] or ranked[:3]


def _build_issue_line(issue: dict[str, Any]) -> str:
    source_documents = issue.get("sourceDocuments", []) or []
    source_label = source_documents[0].get("documentLabel") if source_documents else "tài liệu"
    comparisons = issue.get("comparisons", []) or []
    if comparisons:
        comparison = comparisons[0]
        submitted = comparison.get("submittedValue", "")
        extracted = comparison.get("extractedValue", "")
        return (
            f'{source_label}: trường "{issue.get("affectedField", "")}" đang lệch. '
            f'Kê khai: "{submitted}". Tài liệu đọc được: "{extracted}".'
        )

    return f'{source_label}: {issue.get("rejectionReason", "Cần kiểm tra lại tài liệu này.")}'


def _suggest_action_from_issue(issue: dict[str, Any]) -> dict[str, Any]:
    target = issue.get("target", {"route": "/results"})
    if target.get("route") == "/register" and target.get("step"):
        return {
            "label": "Sửa phần kê khai",
            "icon": "edit_note",
            "tone": "primary",
            "route": "/register",
            "step": target["step"],
        }

    return {
        "label": "Mở tài liệu",
        "icon": "upload_file",
        "tone": "primary",
        "route": "/documents",
    }


async def _maybe_build_legal_note(
    question: str,
    issues: list[dict[str, Any]],
) -> tuple[list[str], list[str]]:
    if not _contains_any(
        question,
        ["căn cứ", "can cu", "điều nào", "dieu nao", "co so phap ly", "điều luật", "dieu luat"],
    ):
        return [], []

    legal_basis: list[str] = []
    for issue in issues:
        for item in issue.get("legalBasis", []) or []:
            if item not in legal_basis:
                legal_basis.append(item)

    if legal_basis:
        return [
            "Căn cứ pháp lý liên quan đến vấn đề này gồm: " + ", ".join(legal_basis) + "."
        ], legal_basis

    if not issues:
        return [], []

    source_issue = issues[0]
    fallback_question = (
        f'Cho tôi căn cứ pháp lý để giải thích vì sao "{source_issue.get("title", "vấn đề hồ sơ")}" '
        "cần được chỉnh sửa trong hồ sơ đăng ký hộ kinh doanh."
    )

    try:
        legal_response = await ask_legal_question(
            {"question": fallback_question, "history": [], "context": None}
        )
    except Exception:
        return [], []

    answer = str(legal_response.get("answer", "")).strip()
    citations = [str(item) for item in legal_response.get("citations", []) if str(item).strip()]
    paragraphs = [answer] if answer else []
    return paragraphs, citations


async def create_assistant_reply(payload: dict[str, Any]) -> dict[str, Any]:
    submission = payload["submission"]
    documents = payload.get("documents", [])
    review_result = payload["reviewResult"]
    question = payload["question"].strip()
    normalized_question = _normalize_text(question)

    findings = review_result.get("findings", []) or []
    missing_documents = review_result.get("missingDocuments", []) or []
    references = review_result.get("references", []) or []
    document_checks = review_result.get("documentChecks", []) or []
    document_issues = _flatten_document_issues(documents)

    ready_to_submit = not missing_documents and not any(
        finding.get("severity") == "critical" for finding in findings
    ) and not any(
        check.get("documentType") in {"citizen-id", "application", "lease-contract"}
        and check.get("status") in {"mismatch", "insufficient_evidence", "possible_type_mismatch"}
        for check in document_checks
    )

    if _contains_any(normalized_question, ["nộp", "nop", "submit", "đủ điều kiện", "du dieu kien", "sẵn sàng", "san sang"]):
        if ready_to_submit:
            return {
                "provider": "grounded-fastapi",
                "paragraphs": [
                    f'Hồ sơ "{submission["business"]["businessName"]}" hiện đã đủ điều kiện nộp chính thức.',
                    "Ba tài liệu cốt lõi hiện không còn mismatch nghiêm trọng và không còn nhóm tài liệu bắt buộc bị thiếu.",
                ],
                "references": references,
                "actions": [
                    {
                        "label": "Nộp chính thức",
                        "icon": "send",
                        "tone": "primary",
                        "route": "/submit",
                    }
                ],
                "suggestedPrompts": [
                    "File nào đã được đối chiếu thành công?",
                    "Căn cứ pháp lý cho việc chấp nhận hồ sơ là gì?",
                    "Tôi có cần kiểm tra gì thêm trước khi nộp?",
                ],
            }

        top_issues = _find_relevant_issues(question, findings, document_issues)
        legal_note, legal_references = await _maybe_build_legal_note(question, top_issues)
        paragraphs = [
            f'Hồ sơ "{submission["business"]["businessName"]}" chưa sẵn sàng để nộp chính thức.',
        ]
        if missing_documents:
            paragraphs.append(
                "Vẫn còn thiếu tài liệu bắt buộc: " + ", ".join(item["label"] for item in missing_documents[:3]) + "."
            )
        if top_issues:
            paragraphs.append(_build_issue_line(top_issues[0]))
        paragraphs.extend(legal_note)
        return {
            "provider": "grounded-fastapi",
            "paragraphs": paragraphs,
            "references": list(dict.fromkeys(references + legal_references)),
            "actions": [_suggest_action_from_issue(top_issues[0])] if top_issues else [
                {
                    "label": "Xem kết quả",
                    "icon": "assignment",
                    "tone": "primary",
                    "route": "/results",
                }
            ],
            "suggestedPrompts": [
                "File nào đang gây cản trở lớn nhất?",
                "Tôi nên sửa mục nào trước?",
                "Căn cứ pháp lý cho lỗi này là gì?",
            ],
        }

    if _contains_any(normalized_question, ["tài liệu", "tai lieu", "tệp", "tep", "file", "thiếu", "thieu", "ocr", "đọc được", "doc duoc"]):
        low_confidence_docs = [
            item
            for item in document_checks
            if item.get("status") in {"insufficient_evidence", "possible_type_mismatch"}
        ]
        paragraphs = [
            f'Tôi đang theo dõi bộ tài liệu của hồ sơ "{submission["business"]["businessName"]}".',
        ]
        if missing_documents:
            paragraphs.append(
                "Các nhóm tài liệu bắt buộc còn thiếu: " + ", ".join(item["label"] for item in missing_documents[:3]) + "."
            )
        if low_confidence_docs:
            first_doc = low_confidence_docs[0]
            paragraphs.append(
                f'Tài liệu "{first_doc.get("documentLabel", "tài liệu")}" hiện ở trạng thái "{first_doc.get("status")}" - {first_doc.get("summary", "")}'
            )
        elif document_issues:
            paragraphs.append(_build_issue_line(document_issues[0]))
        else:
            paragraphs.append("Không còn tài liệu cốt lõi nào đang bị thiếu hoặc OCR yếu.")
        return {
            "provider": "grounded-fastapi",
            "paragraphs": paragraphs,
            "references": references,
            "actions": [
                {
                    "label": "Mở tài liệu",
                    "icon": "upload_file",
                    "tone": "primary",
                    "route": "/documents",
                }
            ],
            "suggestedPrompts": [
                "File nào đang sai thông tin?",
                "Tôi nên upload lại tài liệu nào trước?",
                "Căn cứ pháp lý cho tài liệu này là gì?",
            ],
        }

    relevant_issues = _find_relevant_issues(question, findings, document_issues)
    legal_note, legal_references = await _maybe_build_legal_note(question, relevant_issues)
    paragraphs = [f'Tôi đang theo dõi hồ sơ "{submission["business"]["businessName"]}".']

    if relevant_issues:
        paragraphs.append(_build_issue_line(relevant_issues[0]))
        if len(relevant_issues) > 1:
            paragraphs.append(
                "Ngoài ra, còn một số mục cần xử lý tiếp theo: "
                + "; ".join(issue.get("title", "vấn đề hồ sơ") for issue in relevant_issues[1:])
                + "."
            )
    elif findings:
        paragraphs.append(f"Lần phân tích mới nhất ghi nhận {len(findings)} vấn đề cần xử lý.")
    else:
        paragraphs.append(
            "Lần phân tích mới nhất chưa ghi nhận vấn đề lớn, nhưng bạn có thể hỏi sâu hơn về từng tài liệu hoặc căn cứ pháp lý."
        )

    paragraphs.extend(legal_note)

    return {
        "provider": "grounded-fastapi",
        "paragraphs": paragraphs,
        "references": list(dict.fromkeys(references + legal_references)),
        "actions": [_suggest_action_from_issue(relevant_issues[0])] if relevant_issues else [
            {
                "label": "Mở kết quả",
                "icon": "assignment",
                "tone": "primary",
                "route": "/results",
            }
        ],
        "suggestedPrompts": [
            "File nào sai và vì sao?",
            "Tôi nên sửa mục nào trước?",
            "Hồ sơ này đã đủ nộp chính thức chưa?",
        ],
    }
