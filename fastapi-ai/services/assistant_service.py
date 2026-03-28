from typing import Any


def create_assistant_reply(payload: dict[str, Any]) -> dict[str, Any]:
    submission = payload["submission"]
    review_result = payload["reviewResult"]
    question = payload["question"].strip()
    normalized_question = question.lower()

    findings = review_result.get("findings", [])
    missing_documents = review_result.get("missingDocuments", [])
    references = review_result.get("references", [])

    if "tai lieu" in normalized_question or "thieu" in normalized_question:
        return {
            "provider": "deterministic-fastapi",
            "paragraphs": [
                f"Hiện tại hồ sơ {submission['business']['businessName']} còn {len(missing_documents)} nhóm tài liệu cần kiểm tra thêm.",
                "Bạn nên ưu tiên mở màn hình tài liệu, đổi lại loại giấy tờ nếu cần và bổ sung các mục bắt buộc trước khi chạy lại phân tích.",
            ],
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
                "Tôi cần sửa gì trong phần kê khai?",
                "Hồ sơ này đã đủ để nộp chính thức chưa?",
                "Tài liệu nào nên ưu tiên bổ sung trước?",
            ],
        }

    if "nop" in normalized_question or "submit" in normalized_question:
        ready_to_submit = len(findings) == 0 and len(missing_documents) == 0
        return {
            "provider": "deterministic-fastapi",
            "paragraphs": [
                (
                    "Hồ sơ hiện đã sẵn sàng cho bước nộp chính thức."
                    if ready_to_submit
                    else "Hồ sơ chưa sẵn sàng để nộp chính thức."
                ),
                (
                    "Bạn có thể chuyển sang màn hình nộp chính thức để tạo biên nhận nội bộ."
                    if ready_to_submit
                    else "Hãy xử lý hết các vấn đề và tài liệu còn thiếu trước khi nộp."
                ),
            ],
            "references": references,
            "actions": [
                {
                    "label": "Nộp chính thức",
                    "icon": "send",
                    "tone": "primary",
                    "route": "/submit",
                }
                if ready_to_submit
                else {
                    "label": "Xem kết quả",
                    "icon": "assignment",
                    "tone": "primary",
                    "route": "/results",
                }
            ],
            "suggestedPrompts": [
                "Tài liệu nào còn thiếu?",
                "Tôi cần sửa gì trong tên hộ kinh doanh?",
                "Tôi có thể nộp ngay bây giờ không?",
            ],
        }

    return {
        "provider": "deterministic-fastapi",
        "paragraphs": [
            f"Tôi đang theo dõi hồ sơ {submission['business']['businessName']}.",
            f"Hiện có {len(findings)} vấn đề và {len(missing_documents)} nhóm tài liệu cần lưu ý. Hãy hỏi cụ thể về từng mục để tôi hướng dẫn nhanh hơn.",
        ],
        "references": references,
        "actions": [
            {
                "label": "Mở kết quả",
                "icon": "assignment",
                "tone": "primary",
                "route": "/results",
            }
        ],
        "suggestedPrompts": [
            "Hồ sơ này còn thiếu gì?",
            "Tôi nên sửa mục nào trước?",
            "Khi nào có thể nộp chính thức?",
        ],
    }
