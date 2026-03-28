import base64
import re
from typing import Any


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


def _has_text(value: str | None) -> bool:
    return bool(value and value.strip())


def _looks_like_distinct_business_name(value: str) -> bool:
    return len(value.strip()) >= 18 and len(value.strip().split()) >= 4


def _mentions_online_channel(value: str) -> bool:
    normalized = _normalize_text(value)
    keywords = ["online", "truc tuyen", "truc-tuyen", "giao hang", "giao-hang"]
    return any(keyword in normalized for keyword in keywords)


def _extract_text_from_base64(content_base64: str, original_name: str, mime_type: str) -> str:
    if not content_base64:
        return f"{original_name} ({mime_type})"

    try:
        raw_bytes = base64.b64decode(content_base64)
    except Exception:
        return f"{original_name} ({mime_type})"

    if not raw_bytes:
        return f"{original_name} ({mime_type})"

    decoded = raw_bytes.decode("utf-8", errors="ignore")
    cleaned = re.sub(r"\s+", " ", decoded).strip()

    if len(cleaned) >= 20:
        return cleaned[:4000]

    return f"{original_name} ({mime_type})"


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


def analyze_submission(payload: dict[str, Any]) -> dict[str, Any]:
    draft = payload["draft"]
    documents = payload["documents"]

    document_results = []
    document_types: list[str] = []

    for document in documents:
        ocr_text = document.get("existingOcrText") or _extract_text_from_base64(
            document.get("contentBase64", ""),
            document.get("originalName", "document"),
            document.get("mimeType", "application/octet-stream"),
        )
        ocr_summary = ocr_text[:220]
        document_type = document.get("documentType", "other")
        document_types.append(document_type)
        document_results.append(
            {
                "id": document["id"],
                "ocrStatus": "completed",
                "validationStatus": "verified" if _has_text(ocr_text) else "uploaded",
                "ocrText": ocr_text,
                "ocrSummary": ocr_summary,
            }
        )

    checklist = _build_document_checklist(draft, document_types)
    missing_documents = [
        {
            "id": item["id"],
            "label": item["label"],
            "description": f"Vui lòng bổ sung {item['label'].lower()} trước khi nộp chính thức.",
            "target": {"route": "/documents"},
        }
        for item in checklist
        if item["status"] == "missing_required"
    ]

    findings: list[dict[str, Any]] = []

    business_name = draft["business"].get("businessName", "")
    if not _looks_like_distinct_business_name(business_name):
        findings.append(
            {
                "id": "business-name-clarity",
                "severity": "critical",
                "title": "Tên hộ kinh doanh cần rõ yếu tố phân biệt hơn",
                "affectedField": "businessName",
                "extractedValue": business_name,
                "rejectionReason": "Tên dự kiến còn ngắn hoặc quá chung chung.",
                "suggestion": "Hãy bổ sung nhóm sản phẩm, khu vực hoặc dấu hiệu nhận diện riêng.",
                "target": {"route": "/register", "step": 2},
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
                "affectedField": "businessDescription",
                "extractedValue": business_description,
                "rejectionReason": "Kênh bán hàng có online nhưng phần mô tả chưa nêu rõ.",
                "suggestion": "Hãy nhắc tới bán hàng online, giao hàng hoặc nhận đơn từ xa trong mô tả.",
                "target": {"route": "/register", "step": 3},
            }
        )

    issue_penalty = len(findings) * 8 + len(missing_documents) * 6
    score = max(62, 94 - issue_penalty)
    has_blocking_issues = bool(findings or missing_documents)

    return {
        "provider": "deterministic-fastapi",
        "documents": document_results,
        "review": {
            "statusBanner": {
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
            },
            "summaryItems": [
                {
                    "id": "documents-read",
                    "tone": "success",
                    "icon": "check_circle",
                    "text": f"Đã xử lý {len(documents)} tệp và đối chiếu với dữ liệu kê khai.",
                },
                {
                    "id": "blocking-status",
                    "tone": "warning" if has_blocking_issues else "success",
                    "icon": "info" if has_blocking_issues else "verified",
                    "text": (
                        f"Phát hiện {len(findings)} vấn đề và {len(missing_documents)} nhóm tài liệu bắt buộc còn thiếu."
                        if has_blocking_issues
                        else "Không phát hiện điểm bất nhất lớn trong lần phân tích này."
                    ),
                },
            ],
            "findings": findings,
            "missingDocuments": missing_documents,
            "nextActions": (
                [
                    {
                        "id": "fix-form",
                        "step": 1,
                        "title": "Cập nhật thông tin kê khai",
                        "description": "Sửa các trường bị gắn cờ để hồ sơ khớp hơn với tài liệu đã tải lên.",
                    },
                    {
                        "id": "fix-documents",
                        "step": 2,
                        "title": "Bổ sung tài liệu bắt buộc",
                        "description": "Tải lên hoặc phân loại lại các tài liệu còn thiếu trước khi chạy lại phân tích.",
                    },
                    {
                        "id": "rerun-review",
                        "step": 3,
                        "title": "Chạy lại phân tích AI",
                        "description": "Khởi chạy một lần phân tích mới sau khi hồ sơ đã được cập nhật.",
                    },
                ]
                if has_blocking_issues
                else [
                    {
                        "id": "review-final",
                        "step": 1,
                        "title": "Rà soát hồ sơ lần cuối",
                        "description": "Kiểm tra lại thông tin cuối cùng trước khi nộp hồ sơ.",
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
                        "description": "Theo dõi hồ sơ đã nộp ở trang lịch sử hồ sơ.",
                    },
                ]
            ),
            "references": [
                "Nghị định 01/2021/NĐ-CP",
                "Luật Doanh nghiệp 2020",
            ],
        },
    }
