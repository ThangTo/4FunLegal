import base64
import json
import os
import re
import unicodedata
from typing import Any

import google.generativeai as genai

from src.config import GEMINI_API_KEY, GEMINI_MODEL_NAME


CORE_DOCUMENT_TYPES = {"citizen-id", "application", "lease-contract"}

FIELD_LABELS = {
    "ownerName": "Chủ hộ",
    "nationalId": "Số CCCD/CMND",
    "address": "Địa chỉ cư trú",
    "businessName": "Tên hộ kinh doanh",
    "businessAddress": "Địa điểm kinh doanh",
    "tenantName": "Bên thuê/Người thuê",
    "lessorName": "Bên cho thuê",
    "industryDescription": "Nội dung ngành nghề",
}

LEGAL_BASIS_BY_FIELD = {
    "ownerName": ["Nghị định 01/2021/NĐ-CP", "Luật Doanh nghiệp 2020"],
    "nationalId": ["Nghị định 01/2021/NĐ-CP"],
    "address": ["Nghị định 01/2021/NĐ-CP"],
    "businessName": ["Nghị định 01/2021/NĐ-CP", "Luật Doanh nghiệp 2020"],
    "businessAddress": ["Nghị định 01/2021/NĐ-CP"],
    "tenantName": ["Nghị định 01/2021/NĐ-CP"],
    "lessorName": ["Nghị định 01/2021/NĐ-CP"],
    "industryDescription": ["Nghị định 01/2021/NĐ-CP"],
}

DOCUMENT_TYPE_KEYWORDS = {
    "citizen-id": ["cccd", "cmnd", "can cuoc", "passport", "so dinh danh"],
    "application": ["don dang ky", "giay de nghi", "ho kinh doanh", "dang ky ho kinh doanh"],
    "lease-contract": ["hop dong thue", "ben cho thue", "ben thue", "dia diem kinh doanh", "thue dia diem"],
}

_structured_extraction_model = None


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    without_marks = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return without_marks.replace("đ", "d").replace("Đ", "D")


def normalize_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = _strip_accents(value)
    normalized = re.sub(r"[^0-9a-zA-Z\s:/-]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip().lower()


def normalize_identifier(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\D", "", value)


def normalize_address(value: str | None) -> str:
    normalized = normalize_text(value)
    replacements = {
        "tp ": "thanh pho ",
        "tphcm": "thanh pho ho chi minh",
        "tp.hcm": "thanh pho ho chi minh",
        "q.": "quan ",
        "p.": "phuong ",
        "h.": "huyen ",
        "tx.": "thi xa ",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return re.sub(r"\s+", " ", normalized).strip()


def _has_substantial_text(value: str | None) -> bool:
    return bool(value and len(value.strip()) >= 12)


def extract_text_from_base64(content_base64: str, original_name: str, mime_type: str) -> str:
    if not content_base64:
        return f"{original_name} ({mime_type})"

    try:
        raw_bytes = base64.b64decode(content_base64)
    except Exception:
        return f"{original_name} ({mime_type})"

    if not raw_bytes:
        return f"{original_name} ({mime_type})"

    decoded = raw_bytes.decode("utf-8", errors="ignore")
    normalized_newlines = decoded.replace("\r\n", "\n").replace("\r", "\n")
    cleaned_lines = [
        re.sub(r"[ \t]+", " ", line).strip()
        for line in normalized_newlines.split("\n")
        if line.strip()
    ]
    cleaned = "\n".join(cleaned_lines).strip()

    if cleaned:
        return cleaned[:5000]

    return f"{original_name} ({mime_type})"


def _extract_name(text: str) -> str | None:
    patterns = [
        r"(?:ho ten|ho va ten|ten chu ho|chu ho|owner|tenant|ben thue|bên thuê)\s*[:\-]\s*([A-ZÀ-ỸA-Za-zà-ỹ][^,;\n]{3,80})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,:;-")

    title_case_names = re.findall(
        r"\b[A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,5}\b",
        text,
    )
    if title_case_names:
        return title_case_names[0].strip()

    return None


def _extract_national_id(text: str) -> str | None:
    match = re.search(r"\b\d{9,12}\b", text)
    return match.group(0) if match else None


def _extract_business_name(text: str) -> str | None:
    patterns = [
        r"(?:ten ho kinh doanh|tên hộ kinh doanh)\s*[:\-]?\s*([A-ZÀ-ỸA-Za-zà-ỹ0-9][^,;\n]{4,120})",
        r"(?:ho kinh doanh)\s*[:\-]\s*([A-ZÀ-ỸA-Za-zà-ỹ0-9][^,;\n]{4,120})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,:;-")

    return None


def _extract_address(text: str) -> str | None:
    patterns = [
        r"(?:dia chi cu tru|địa chỉ cư trú|dia chi|địa chỉ|dia diem kinh doanh|địa điểm kinh doanh|address|tai)\s*[:\-]\s*([^;\n]{8,180})",
        r"(?:tai|tại)\s+([^;\n]{8,180})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,:;-")

    return None


def _extract_industry_description(text: str) -> str | None:
    patterns = [
        r"(?:nganh nghe|ngành nghề|noi dung kinh doanh|nội dung kinh doanh)\s*[:\-]\s*([^;\n]{8,180})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,:;-")
    return None


def _extract_lessor_name(text: str) -> str | None:
    patterns = [
        r"(?:ben cho thue|bên cho thuê|lessor)\s*[:\-]\s*([A-ZÀ-ỸA-Za-zà-ỹ0-9][^,;\n]{3,80})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,:;-")
    return None


def _can_use_llm_extraction() -> bool:
    provider = os.getenv("AI_PROVIDER", "deterministic").strip().lower() or "deterministic"
    return provider != "deterministic" and bool(GEMINI_API_KEY.strip())


def _get_structured_extraction_model():
    global _structured_extraction_model
    if _structured_extraction_model is None:
        genai.configure(api_key=GEMINI_API_KEY)
        _structured_extraction_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
    return _structured_extraction_model


def _extract_json_block(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"^```", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not match:
        return {}

    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _llm_extract_fields(document_type: str, text: str) -> dict[str, Any]:
    if not _can_use_llm_extraction():
        return {}

    prompt = f"""
 Bạn đang làm nhiệm vụ trích xuất thông tin từ tài liệu hành chính.
 Chỉ trả về JSON hợp lệ, không giải thích thêm.

 Loại tài liệu khai báo: {document_type}

 Cần trích xuất các field nếu có:
- ownerName
- nationalId
- address
- businessName
- businessAddress
- tenantName
- lessorName
- industryDescription
- confidence: high | medium | low

 Văn bản OCR:
\"\"\"
{text[:3000]}
\"\"\"
"""

    try:
        response = _get_structured_extraction_model().generate_content(prompt)
    except Exception:
        return {}

    return _extract_json_block(getattr(response, "text", ""))


def _merge_fields(base_fields: dict[str, Any], llm_fields: dict[str, Any]) -> tuple[dict[str, Any], str]:
    merged = dict(base_fields)
    confidence = "low"

    for key, value in llm_fields.items():
        if key == "confidence":
            if isinstance(value, str) and value.strip():
                confidence = value.strip().lower()
            continue
        if value and not merged.get(key):
            merged[key] = str(value).strip()

    filled_count = sum(1 for value in merged.values() if _has_substantial_text(str(value)))
    if confidence == "low":
        confidence = "high" if filled_count >= 3 else ("medium" if filled_count >= 2 else "low")

    return merged, confidence


def infer_document_type_from_text(text: str) -> str | None:
    normalized = normalize_text(text)
    best_type = None
    best_score = 0

    for document_type, keywords in DOCUMENT_TYPE_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in normalized)
        if score > best_score:
            best_type = document_type
            best_score = score

    return best_type if best_score >= 1 else None


def _extract_fields_for_document(document_type: str, text: str) -> tuple[dict[str, Any], str]:
    parsed_fields: dict[str, Any] = {}

    if document_type == "citizen-id":
        parsed_fields = {
            "ownerName": _extract_name(text) or "",
            "nationalId": _extract_national_id(text) or "",
            "address": _extract_address(text) or "",
        }
    elif document_type == "application":
        parsed_fields = {
            "ownerName": _extract_name(text) or "",
            "nationalId": _extract_national_id(text) or "",
            "businessName": _extract_business_name(text) or "",
            "businessAddress": _extract_address(text) or "",
            "industryDescription": _extract_industry_description(text) or "",
        }
    elif document_type == "lease-contract":
        parsed_fields = {
            "tenantName": _extract_name(text) or "",
            "businessAddress": _extract_address(text) or "",
            "lessorName": _extract_lessor_name(text) or "",
        }

    llm_fields = _llm_extract_fields(document_type, text)
    merged_fields, confidence = _merge_fields(parsed_fields, llm_fields)
    return merged_fields, confidence


def _build_comparison(
    *,
    field_key: str,
    submitted_value: str,
    extracted_value: str,
    comparator: str,
    document_id: str,
    document_label: str,
    document_type: str,
    original_name: str,
) -> dict[str, Any]:
    normalized_submitted = (
        normalize_identifier(submitted_value)
        if comparator == "identifier"
        else normalize_address(submitted_value)
        if comparator == "address"
        else normalize_text(submitted_value)
    )
    normalized_extracted = (
        normalize_identifier(extracted_value)
        if comparator == "identifier"
        else normalize_address(extracted_value)
        if comparator == "address"
        else normalize_text(extracted_value)
    )

    if not extracted_value:
        status = "missing_in_document"
        reason = "Không tìm thấy trường thông tin này trong tài liệu OCR."
    elif comparator == "address":
        status = (
            "match"
            if normalized_submitted and normalized_extracted and (
                normalized_submitted in normalized_extracted
                or normalized_extracted in normalized_submitted
            )
            else "mismatch"
        )
        reason = (
            "Địa chỉ trong tài liệu chưa khớp với địa chỉ kê khai."
            if status == "mismatch"
            else "Địa chỉ trong tài liệu khớp với phần kê khai."
        )
    else:
        status = "match" if normalized_submitted and normalized_submitted == normalized_extracted else "mismatch"
        reason = (
            f"{FIELD_LABELS[field_key]} trong tài liệu chưa khớp với phần kê khai."
            if status == "mismatch"
            else f"{FIELD_LABELS[field_key]} đã khớp với phần kê khai."
        )

    return {
        "id": f"{document_id}:{field_key}",
        "fieldKey": field_key,
        "fieldLabel": FIELD_LABELS[field_key],
        "status": status,
        "submittedValue": submitted_value,
        "extractedValue": extracted_value or "Không đọc được",
        "reason": reason,
        "sourceDocuments": [
            {
                "documentId": document_id,
                "documentLabel": document_label,
                "documentType": document_type,
                "originalName": original_name,
            }
        ],
        "legalBasis": LEGAL_BASIS_BY_FIELD.get(field_key, []),
    }


def _comparison_to_issue(
    comparison: dict[str, Any],
    *,
    severity: str,
    target_step: int | None = None,
) -> dict[str, Any]:
    status = comparison["status"]
    extracted_value = comparison["extractedValue"]
    source_document = comparison["sourceDocuments"][0]

    if status == "missing_in_document":
        title = f'Không đọc được trường "{comparison["fieldLabel"]}" trong tài liệu'
        rejection_reason = comparison["reason"]
        suggestion = "Tải lại bản rõ hơn hoặc đổi đúng loại giấy tờ trước khi phân tích lại."
    else:
        title = f'{comparison["fieldLabel"]} chua khop voi thong tin ke khai'
        rejection_reason = comparison["reason"]
        suggestion = "Kiem tra lai thong tin ke khai va noi dung trong file, sau do cap nhat muc sai lech."

    target = {"route": "/documents"}
    if target_step is not None:
        target = {"route": "/register", "step": target_step}

    return {
        "id": comparison["id"],
        "severity": severity,
        "title": title,
        "affectedField": comparison["fieldLabel"],
        "extractedValue": extracted_value,
        "submittedValue": comparison["submittedValue"],
        "rejectionReason": rejection_reason,
        "suggestion": suggestion,
        "target": target,
        "sourceDocuments": comparison["sourceDocuments"],
        "comparisons": [comparison],
        "legalBasis": comparison["legalBasis"],
    }


def _type_mismatch_issue(document: dict[str, Any], inferred_type: str | None) -> dict[str, Any] | None:
    if not inferred_type or inferred_type == document["documentType"]:
        return None

    return {
        "id": f'{document["id"]}:type-mismatch',
        "severity": "warning",
        "title": "Loại tài liệu có thể đang bị gán sai",
        "affectedField": "Loại tài liệu",
        "extractedValue": inferred_type,
        "submittedValue": document["documentType"],
        "rejectionReason": "Nội dung OCR trong tệp này giống với một nhóm giấy tờ khác so với loại đang gán hiện tại.",
        "suggestion": "Kiểm tra lại dropdown loại tài liệu hoặc tải đúng tệp tương ứng.",
        "target": {"route": "/documents"},
        "sourceDocuments": [
            {
                "documentId": document["id"],
                "documentLabel": document["label"],
                "documentType": document["documentType"],
                "originalName": document["originalName"],
            }
        ],
        "comparisons": [],
        "legalBasis": ["Nghị định 01/2021/NĐ-CP"],
    }
def _insufficient_evidence_issue(
    document: dict[str, Any],
    label: str,
    document_type: str,
    original_name: str,
) -> dict[str, Any]:
    return {
        "id": f'{document["id"]}:insufficient-evidence',
        "severity": "critical",
        "title": "Không đủ bằng chứng để đọc nội dung tài liệu",
        "affectedField": "Nội dung OCR",
        "extractedValue": "Không đọc được",
        "submittedValue": "",
        "rejectionReason": "Hệ thống không đọc được nội dung có ý nghĩa từ tệp này, có thể do ảnh mờ, bản scan quá nhỏ hoặc tệp không đúng.",
        "suggestion": "Tải lại ảnh/PDF rõ hơn, sắc nét và có đủ trang thông tin chính.",
        "target": {"route": "/documents"},
        "sourceDocuments": [
            {
                "documentId": document["id"],
                "documentLabel": label,
                "documentType": document_type,
                "originalName": original_name,
            }
        ],
        "comparisons": [],
        "legalBasis": ["Nghị định 01/2021/NĐ-CP"],
    }


def analyze_document_semantics(document: dict[str, Any], draft: dict[str, Any]) -> dict[str, Any]:
    document_type = str(document.get("documentType", "other"))
    ocr_text = str(document.get("ocrText", "") or "")
    original_name = str(document.get("originalName", "document"))
    label = str(document.get("label", original_name))

    base_result = {
        "documentType": document_type,
        "semanticStatus": "checklist_only",
        "extractionConfidence": "low",
        "extractedFields": {},
        "semanticIssues": [],
        "fieldComparisons": [],
        "legalBasis": [],
    }

    if document_type not in CORE_DOCUMENT_TYPES:
        return base_result

    if not _has_substantial_text(ocr_text):
        issue = _insufficient_evidence_issue(document, label, document_type, original_name)
        base_result["semanticStatus"] = "insufficient_evidence"
        base_result["semanticIssues"] = [issue]
        base_result["legalBasis"] = issue["legalBasis"]
        return base_result

    if not _has_substantial_text(ocr_text):
        issue = {
            "id": f'{document["id"]}:insufficient-evidence',
            "severity": "critical",
            "title": "Không đủ bằng chứng để đọc nội dung tài liệu",
            "affectedField": "Noi dung OCR",
            "extractedValue": "Không đọc được",
            "submittedValue": "",
            "rejectionReason": "He thong khong doc duoc noi dung co y nghia tu tep nay, co the do anh mo, scan qua nho hoac tep khong dung.",
            "suggestion": "Tai lai anh/PDF ro hon, chac net va co du trang thong tin chinh.",
            "target": {"route": "/documents"},
            "sourceDocuments": [
                {
                    "documentId": document["id"],
                    "documentLabel": label,
                    "documentType": document_type,
                    "originalName": original_name,
                }
            ],
            "comparisons": [],
            "legalBasis": ["Nghị định 01/2021/NĐ-CP"],
        }
        base_result["semanticStatus"] = "insufficient_evidence"
        base_result["semanticIssues"] = [issue]
        base_result["legalBasis"] = issue["legalBasis"]
        return base_result

    extracted_fields, confidence = _extract_fields_for_document(document_type, ocr_text)
    inferred_type = infer_document_type_from_text(ocr_text)
    comparisons: list[dict[str, Any]] = []

    owner = draft["owner"]
    business = draft["business"]

    if document_type == "citizen-id":
        comparisons.append(
            _build_comparison(
                field_key="ownerName",
                submitted_value=owner.get("ownerName", ""),
                extracted_value=str(extracted_fields.get("ownerName", "") or ""),
                comparator="text",
                document_id=document["id"],
                document_label=label,
                document_type=document_type,
                original_name=original_name,
            )
        )
        comparisons.append(
            _build_comparison(
                field_key="nationalId",
                submitted_value=owner.get("nationalId", ""),
                extracted_value=str(extracted_fields.get("nationalId", "") or ""),
                comparator="identifier",
                document_id=document["id"],
                document_label=label,
                document_type=document_type,
                original_name=original_name,
            )
        )
        if owner.get("address"):
            comparisons.append(
                _build_comparison(
                    field_key="address",
                    submitted_value=owner.get("address", ""),
                    extracted_value=str(extracted_fields.get("address", "") or ""),
                    comparator="address",
                    document_id=document["id"],
                    document_label=label,
                    document_type=document_type,
                    original_name=original_name,
                )
            )
    elif document_type == "application":
        comparisons.extend(
            [
                _build_comparison(
                    field_key="ownerName",
                    submitted_value=owner.get("ownerName", ""),
                    extracted_value=str(extracted_fields.get("ownerName", "") or ""),
                    comparator="text",
                    document_id=document["id"],
                    document_label=label,
                    document_type=document_type,
                    original_name=original_name,
                ),
                _build_comparison(
                    field_key="nationalId",
                    submitted_value=owner.get("nationalId", ""),
                    extracted_value=str(extracted_fields.get("nationalId", "") or ""),
                    comparator="identifier",
                    document_id=document["id"],
                    document_label=label,
                    document_type=document_type,
                    original_name=original_name,
                ),
                _build_comparison(
                    field_key="businessName",
                    submitted_value=business.get("businessName", ""),
                    extracted_value=str(extracted_fields.get("businessName", "") or ""),
                    comparator="text",
                    document_id=document["id"],
                    document_label=label,
                    document_type=document_type,
                    original_name=original_name,
                ),
                _build_comparison(
                    field_key="businessAddress",
                    submitted_value=business.get("businessAddress", ""),
                    extracted_value=str(extracted_fields.get("businessAddress", "") or ""),
                    comparator="address",
                    document_id=document["id"],
                    document_label=label,
                    document_type=document_type,
                    original_name=original_name,
                ),
            ]
        )
    elif document_type == "lease-contract":
        comparisons.extend(
            [
                _build_comparison(
                    field_key="tenantName",
                    submitted_value=owner.get("ownerName", ""),
                    extracted_value=str(extracted_fields.get("tenantName", "") or ""),
                    comparator="text",
                    document_id=document["id"],
                    document_label=label,
                    document_type=document_type,
                    original_name=original_name,
                ),
                _build_comparison(
                    field_key="businessAddress",
                    submitted_value=business.get("businessAddress", ""),
                    extracted_value=str(extracted_fields.get("businessAddress", "") or ""),
                    comparator="address",
                    document_id=document["id"],
                    document_label=label,
                    document_type=document_type,
                    original_name=original_name,
                ),
            ]
        )

    issues: list[dict[str, Any]] = []
    for comparison in comparisons:
        if comparison["status"] == "match":
            continue

        target_step = 1 if comparison["fieldKey"] in {"ownerName", "nationalId", "address"} else 2
        severity = "critical" if comparison["fieldKey"] in {"ownerName", "nationalId", "businessName", "businessAddress", "tenantName"} else "warning"
        issues.append(_comparison_to_issue(comparison, severity=severity, target_step=target_step))

    type_issue = _type_mismatch_issue(document, inferred_type)
    if type_issue:
        issues.append(type_issue)

    matched_count = sum(1 for item in comparisons if item["status"] == "match")
    if issues:
        semantic_status = "insufficient_evidence" if any(
            issue["id"].endswith("insufficient-evidence") for issue in issues
        ) else "possible_type_mismatch" if type_issue and len(issues) == 1 and matched_count == 0 else "mismatch"
    else:
        semantic_status = "matched" if matched_count > 0 else "insufficient_evidence"

    legal_basis = []
    for issue in issues:
        for item in issue.get("legalBasis", []):
            if item not in legal_basis:
                legal_basis.append(item)

    return {
        "documentType": document_type,
        "semanticStatus": semantic_status,
        "extractionConfidence": confidence,
        "extractedFields": extracted_fields,
        "semanticIssues": issues,
        "fieldComparisons": comparisons,
        "legalBasis": legal_basis,
    }


def build_document_check(document: dict[str, Any], semantic_result: dict[str, Any]) -> dict[str, Any]:
    status = semantic_result["semanticStatus"]
    summary_map = {
        "matched": "Tài liệu đã được đối chiếu và khớp với thông tin kê khai.",
        "mismatch": "Tài liệu có thông tin chưa khớp với phần kê khai.",
        "insufficient_evidence": "Tài liệu chưa đủ rõ để trích xuất bằng chứng đáng tin cậy.",
        "possible_type_mismatch": "Nội dung tệp này có thể đang được gán sai loại tài liệu.",
        "checklist_only": "Tài liệu này hiện chỉ được kiểm tra ở mức checklist.",
    }
    return {
        "documentId": document["id"],
        "documentLabel": document["label"],
        "documentType": document["documentType"],
        "originalName": document["originalName"],
        "status": status,
        "summary": summary_map.get(status, summary_map["checklist_only"]),
        "extractionConfidence": semantic_result["extractionConfidence"],
        "extractedFields": semantic_result["extractedFields"],
        "issues": semantic_result["semanticIssues"],
        "legalBasis": semantic_result["legalBasis"],
    }


def get_unique_legal_references(*collections: list[dict[str, Any]] | list[str]) -> list[str]:
    flattened: list[str] = []
    for collection in collections:
        for item in collection:
            if isinstance(item, str):
                if item not in flattened:
                    flattened.append(item)
                continue

            if isinstance(item, dict):
                for legal_item in item.get("legalBasis", []):
                    if legal_item not in flattened:
                        flattened.append(legal_item)
    return flattened
