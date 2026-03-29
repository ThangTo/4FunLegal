from typing import Any

from services.semantic_review import (
    CORE_DOCUMENT_TYPES,
    analyze_document_semantics,
    build_document_check,
    extract_text_from_base64,
    get_unique_legal_references,
)


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _has_text(value: str | None) -> bool:
    return bool(value and value.strip())


def _looks_like_distinct_business_name(value: str) -> bool:
    return len(value.strip()) >= 18 and len(value.strip().split()) >= 4


def _mentions_online_channel(value: str) -> bool:
    normalized = _normalize_text(value)
    keywords = ["online", "truc tuyen", "truc-tuyen", "giao hang", "giao-hang"]
    return any(keyword in normalized for keyword in keywords)


def _build_document_checklist(draft: dict[str, Any], document_types: list[str]) -> list[dict[str, Any]]:
    owner = draft["owner"]
    business = draft["business"]
    industry = draft["industry"]
    uploaded_types = {"practice-license" if item == "license" else item for item in document_types}

    catalog = [
        {"id": "citizen-id", "label": "CCCD/Hộ chiếu"},
        {"id": "application", "label": "Đơn đăng ký"},
        {"id": "lease-contract", "label": "Hợp đồng thuê địa điểm"},
        {"id": "authorization", "label": "Văn bản ủy quyền"},
        {"id": "practice-license", "label": "Chứng chỉ hành nghề"},
        {"id": "household-member-consent", "label": "Biên bản họp thành viên hộ gia đình"},
    ]

    business_model = _normalize_text(business.get("businessModel", ""))
    household_members = business.get("householdMembers", "")
    household_consent_required = "thanh vien ho gia dinh" in business_model and _has_text(
        household_members
    )

    result: list[dict[str, Any]] = []

    for item in catalog:
        required = item["id"] in {"citizen-id", "application", "lease-contract"}

        if item["id"] == "authorization":
            required = bool(owner.get("submittedByProxy"))

        if item["id"] == "practice-license":
            required = bool(industry.get("requiresPracticeLicense"))

        if item["id"] == "household-member-consent":
            required = household_consent_required

        result.append(
            {
                "id": item["id"],
                "label": item["label"],
                "required": required,
                "status": "uploaded"
                if item["id"] in uploaded_types
                else ("missing_required" if required else "missing_optional"),
            }
        )

    return result


def _build_missing_documents(checklist: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "label": item["label"],
            "description": f"Vui lòng bổ sung {item['label'].lower()} trước khi nộp chính thức.",
            "target": {"route": "/documents"},
        }
        for item in checklist
        if item["status"] == "missing_required"
    ]


def _build_business_heuristic_findings(draft: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    business_name = draft["business"].get("businessName", "")

    if not _looks_like_distinct_business_name(business_name):
        findings.append(
            {
                "id": "business-name-clarity",
                "severity": "warning",
                "title": "Tên hộ kinh doanh cần rõ yếu tố phân biệt hơn",
                "affectedField": "Tên hộ kinh doanh",
                "extractedValue": business_name,
                "submittedValue": business_name,
                "rejectionReason": "Tên dự kiến còn ngắn hoặc quá chung chung.",
                "suggestion": "Bổ sung nhóm sản phẩm, khu vực hoặc dấu hiệu nhận diện riêng.",
                "target": {"route": "/register", "step": 2},
                "sourceDocuments": [],
                "comparisons": [],
                "legalBasis": ["Nghị định 01/2021/NĐ-CP", "Luật Doanh nghiệp 2020"],
            }
        )

    sales_channel = draft["industry"].get("salesChannel", "")
    business_description = draft["business"].get("businessDescription", "")
    if "online" in _normalize_text(sales_channel) and not _mentions_online_channel(
        business_description
    ):
        findings.append(
            {
                "id": "business-scope-clarity",
                "severity": "warning",
                "title": "Mô tả hoạt động kinh doanh chưa thể hiện rõ kênh online",
                "affectedField": "Mô tả hoạt động kinh doanh",
                "extractedValue": business_description,
                "submittedValue": business_description,
                "rejectionReason": "Kênh bán hàng có online nhưng phần mô tả chưa nêu rõ.",
                "suggestion": "Hãy nhắc tới bán hàng online, giao hàng hoặc nhận đơn từ xa trong mô tả.",
                "target": {"route": "/register", "step": 3},
                "sourceDocuments": [],
                "comparisons": [],
                "legalBasis": ["Nghị định 01/2021/NĐ-CP"],
            }
        )

    return findings


def _build_document_results(documents: list[dict[str, Any]], draft: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    document_results: list[dict[str, Any]] = []
    document_checks: list[dict[str, Any]] = []
    field_comparisons: list[dict[str, Any]] = []
    all_semantic_issues: list[dict[str, Any]] = []

    for document in documents:
        ocr_text = document.get("existingOcrText") or extract_text_from_base64(
            document.get("contentBase64", ""),
            document.get("originalName", "document"),
            document.get("mimeType", "application/octet-stream"),
        )
        semantic_result = analyze_document_semantics(
            {
                **document,
                "ocrText": ocr_text,
            },
            draft,
        )

        validation_status = "verified" if semantic_result["semanticStatus"] == "matched" else "uploaded"
        document_results.append(
            {
                "id": document["id"],
                "ocrStatus": "completed",
                "validationStatus": validation_status,
                "ocrText": ocr_text,
                "ocrSummary": ocr_text[:220],
                "extractedFields": semantic_result["extractedFields"],
                "extractionConfidence": semantic_result["extractionConfidence"],
                "semanticStatus": semantic_result["semanticStatus"],
                "semanticIssues": semantic_result["semanticIssues"],
            }
        )
        document_checks.append(build_document_check(document, semantic_result))
        field_comparisons.extend(semantic_result["fieldComparisons"])
        all_semantic_issues.extend(semantic_result["semanticIssues"])

    return document_results, document_checks, field_comparisons, all_semantic_issues


def _calculate_review_score(findings: list[dict[str, Any]], missing_documents: list[dict[str, Any]], document_checks: list[dict[str, Any]]) -> int:
    score = 100

    score -= len(missing_documents) * 20

    for document_check in document_checks:
        status = document_check["status"]
        if document_check["documentType"] not in CORE_DOCUMENT_TYPES:
            continue

        if status == "insufficient_evidence":
            score -= 18
        elif status == "possible_type_mismatch":
            score -= 12
        elif status == "mismatch":
            score -= 14

    for finding in findings:
        if finding["severity"] == "critical":
            score -= 15
        elif finding["severity"] == "warning":
            score -= 8

    return max(0, min(100, score))


def _build_status_banner(has_blocking_issues: bool, score: int) -> dict[str, Any]:
    return {
        "tone": "warning" if has_blocking_issues else "success",
        "title": "Cần sửa trước khi nộp" if has_blocking_issues else "Đủ điều kiện sơ bộ",
        "description": (
            "Hồ sơ cần được cập nhật thêm trước khi nộp chính thức."
            if has_blocking_issues
            else "Hồ sơ đã vượt qua bước kiểm tra sơ bộ và sẵn sàng cho bước nộp chính thức."
        ),
        "score": score,
        "scoreLabel": (
            "Cần chỉnh sửa trước khi nộp"
            if has_blocking_issues
            else "Sẵn sàng cho bước nộp chính thức"
        ),
    }


def _build_summary_items(documents: list[dict[str, Any]], findings: list[dict[str, Any]], missing_documents: list[dict[str, Any]], document_checks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    matched_documents = sum(1 for item in document_checks if item["status"] == "matched")
    insufficient_documents = sum(1 for item in document_checks if item["status"] == "insufficient_evidence")

    return [
        {
            "id": "documents-read",
            "tone": "success",
            "icon": "check_circle",
            "text": f"Đã xử lý {len(documents)} tệp và đối chiếu evidence với dữ liệu kê khai.",
        },
        {
            "id": "evidence-quality",
            "tone": "warning" if insufficient_documents > 0 else "success",
            "icon": "fact_check",
            "text": (
                f"Có {matched_documents} tài liệu khớp, {insufficient_documents} tài liệu không đủ bằng chứng và {len(findings)} vấn đề cần xử lý."
                if findings or insufficient_documents
                else f"Có {matched_documents} tài liệu đã khớp và chưa phát hiện điểm bất nhất lớn."
            ),
        },
        {
            "id": "missing-required",
            "tone": "warning" if missing_documents else "success",
            "icon": "description",
            "text": (
                f"Còn {len(missing_documents)} nhóm tài liệu bắt buộc cần bổ sung."
                if missing_documents
                else "Tất cả tài liệu bắt buộc đã có mặt trong lần phân tích này."
            ),
        },
    ]


def _build_next_actions(has_blocking_issues: bool) -> list[dict[str, Any]]:
    if has_blocking_issues:
        return [
            {
                "id": "fix-form",
                "step": 1,
                "title": "Cập nhật thông tin kê khai",
                "description": "Sửa các trường đang lệch với tài liệu hoặc cần làm rõ thêm.",
            },
            {
                "id": "fix-documents",
                "step": 2,
                "title": "Rà soát lại từng file tài liệu",
                "description": "Đổi đúng loại tài liệu, tải lại file rõ hơn hoặc bổ sung file còn thiếu.",
            },
            {
                "id": "rerun-review",
                "step": 3,
                "title": "Chạy lại phân tích AI",
                "description": "Khởi động một lần phân tích mới để cập nhật evidence và kết quả.",
            },
        ]

    return [
        {
            "id": "review-final",
            "step": 1,
            "title": "Rà soát hồ sơ lần cuối",
            "description": "Kiểm tra lại thông tin và tài liệu trước khi nộp chính thức.",
        },
        {
            "id": "official-submit",
            "step": 2,
            "title": "Nộp chính thức",
            "description": "Chuyển sang màn hình nộp chính thức để tạo biên nhận nội bộ.",
        },
        {
            "id": "track-history",
            "step": 3,
            "title": "Theo dõi trong lịch sử",
            "description": "Lưu và đối chiếu các kết quả sau này trong lịch sử hồ sơ.",
        },
    ]


def analyze_submission(payload: dict[str, Any]) -> dict[str, Any]:
    draft = payload["draft"]
    documents = payload["documents"]

    document_results, document_checks, field_comparisons, semantic_findings = _build_document_results(
        documents,
        draft,
    )
    checklist = _build_document_checklist(
        draft,
        [document.get("documentType", "other") for document in documents],
    )
    missing_documents = _build_missing_documents(checklist)
    heuristic_findings = _build_business_heuristic_findings(draft)
    findings = semantic_findings + heuristic_findings

    has_blocking_issues = bool(
        missing_documents
        or any(finding["severity"] == "critical" for finding in findings)
        or any(
            check["documentType"] in CORE_DOCUMENT_TYPES
            and check["status"] in {"mismatch", "insufficient_evidence", "possible_type_mismatch"}
            for check in document_checks
        )
    )
    score = _calculate_review_score(findings, missing_documents, document_checks)
    references = get_unique_legal_references(findings, ["Nghị định 01/2021/NĐ-CP", "Luật Doanh nghiệp 2020"])

    return {
        "provider": "grounded-fastapi",
        "documents": document_results,
        "review": {
            "statusBanner": _build_status_banner(has_blocking_issues, score),
            "summaryItems": _build_summary_items(
                documents,
                findings,
                missing_documents,
                document_checks,
            ),
            "findings": findings,
            "missingDocuments": missing_documents,
            "nextActions": _build_next_actions(has_blocking_issues),
            "references": references,
            "documentChecks": document_checks,
            "fieldComparisons": field_comparisons,
            "legalBasis": references,
        },
    }
