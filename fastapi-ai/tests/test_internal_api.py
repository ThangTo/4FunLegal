import base64
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


def to_base64(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("utf-8")


def build_submission_payload(documents: list[dict]) -> dict:
    return {
        "submissionId": "sub-1",
        "submissionCode": "HKD-2026-00001",
        "type": "household",
        "draft": {
            "owner": {
                "ownerName": "Nguyen Van A",
                "nationalId": "012345678901",
                "birthDate": "1990-01-01",
                "phone": "0901234567",
                "email": "demo@example.com",
                "address": "123 Test",
                "submittedByProxy": False,
                "proxyName": "",
                "proxyRelationship": "",
            },
            "business": {
                "businessName": "Ho kinh doanh Minh An Quan 1",
                "businessModel": "Ho kinh doanh ca the",
                "businessAddress": "123 Test",
                "startDate": "2026-05-01",
                "businessDescription": "Ban le thuc pham tai cua hang va giao hang online",
                "householdMembers": "",
            },
            "industry": {
                "mainIndustry": "Ban le thuc pham",
                "subIndustry": "",
                "expectedCapital": "10000000",
                "laborScale": "1 - 2 lao dong",
                "salesChannel": "Tai cua hang va online",
                "note": "",
                "requiresPracticeLicense": False,
            },
        },
        "documents": documents,
    }


class InternalApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["INTERNAL_API_KEY"] = "test-fastapi-key"
        os.environ["AI_PROVIDER"] = "deterministic"
        self.client = TestClient(app)
        self.headers = {"x-internal-api-key": "test-fastapi-key"}

    def test_health(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "OK")
        self.assertEqual(response.json()["serviceMode"], "deterministic")
        self.assertTrue(response.json()["legalQaReady"])

    def test_legal_ask_uses_history_and_document_context_in_response(self) -> None:
        response = self.client.post(
            "/internal/v1/legal/ask",
            headers=self.headers,
            json={
                "question": "Dieu kien dang ky ho kinh doanh la gi?",
                "history": [
                    {
                        "role": "user",
                        "content": "Toi dang tim hieu ho so dang ky.",
                    }
                ],
                "context": {
                    "documentTitle": "Huong dan dang ky ho kinh doanh",
                    "documentSummary": "Tong hop cac buoc va giay to can chuan bi.",
                    "documentSlug": "huong-dan-dang-ky-ho-kinh-doanh",
                    "sourceName": "Cong dich vu cong",
                    "highlights": ["Bo tai lieu can co", "Dieu kien dat ten"],
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["provider"], "deterministic-fastapi")
        self.assertEqual(payload["routeType"], "ADVISORY")
        self.assertIn("Huong dan dang ky ho kinh doanh", payload["answer"])
        self.assertIn("Luật Doanh nghiệp 2020", payload["citations"])
        self.assertIn("Huong dan dang ky ho kinh doanh", payload["citations"])
        self.assertTrue(payload["stats"]["groundedToDocumentContext"])

    def test_analyze_review_returns_semantic_matches_for_core_documents(self) -> None:
        response = self.client.post(
            "/internal/v1/reviews/analyze",
            headers=self.headers,
            json=build_submission_payload(
                [
                    {
                        "id": "doc-1",
                        "documentType": "citizen-id",
                        "label": "CCCD",
                        "originalName": "cccd.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": to_base64(
                            "CCCD\nHo ten: Nguyen Van A\nSo: 012345678901\nDia chi: 123 Test"
                        ),
                    },
                    {
                        "id": "doc-2",
                        "documentType": "application",
                        "label": "Don dang ky",
                        "originalName": "don.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": to_base64(
                            "Don dang ky ho kinh doanh\nHo ten: Nguyen Van A\nSo CCCD: 012345678901\nTen ho kinh doanh: Ho kinh doanh Minh An Quan 1\nDia diem kinh doanh: 123 Test"
                        ),
                    },
                    {
                        "id": "doc-3",
                        "documentType": "lease-contract",
                        "label": "Hop dong thue",
                        "originalName": "lease.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": to_base64(
                            "Hop dong thue dia diem\nBen thue: Nguyen Van A\nDia diem kinh doanh: 123 Test\nBen cho thue: Le Thi B"
                        ),
                    },
                ]
            ),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["provider"], "grounded-fastapi")
        self.assertEqual(len(payload["documents"]), 3)
        self.assertEqual(payload["review"]["statusBanner"]["tone"], "success")
        self.assertEqual(len(payload["review"]["documentChecks"]), 3)
        self.assertTrue(
            all(document["semanticStatus"] == "matched" for document in payload["documents"])
        )

    def test_analyze_review_flags_mismatch_and_insufficient_evidence(self) -> None:
        response = self.client.post(
            "/internal/v1/reviews/analyze",
            headers=self.headers,
            json=build_submission_payload(
                [
                    {
                        "id": "doc-1",
                        "documentType": "citizen-id",
                        "label": "CCCD",
                        "originalName": "cccd.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": to_base64("CCCD Nguyen Van A 999999999999"),
                    },
                    {
                        "id": "doc-2",
                        "documentType": "application",
                        "label": "Don dang ky",
                        "originalName": "don.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": to_base64("file mo"),
                    },
                    {
                        "id": "doc-3",
                        "documentType": "lease-contract",
                        "label": "Hop dong thue",
                        "originalName": "lease.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": to_base64(
                            "Hop dong thue dia diem\nBen thue: Nguyen Van A\nDia diem kinh doanh: 999 Sai Dia Chi"
                        ),
                    },
                ]
            ),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["review"]["statusBanner"]["tone"], "warning")
        self.assertGreater(len(payload["review"]["findings"]), 0)
        self.assertTrue(
            any(document["semanticStatus"] == "insufficient_evidence" for document in payload["documents"])
        )
        self.assertTrue(
            any(document["semanticStatus"] == "mismatch" for document in payload["documents"])
        )

    def test_assistant_reply_explains_specific_document_issue(self) -> None:
        response = self.client.post(
            "/internal/v1/assistant/reply",
            headers=self.headers,
            json={
                "submission": {
                    "owner": {
                        "ownerName": "Nguyen Van A",
                        "nationalId": "012345678901",
                        "birthDate": "1990-01-01",
                        "phone": "0901234567",
                        "email": "demo@example.com",
                        "address": "123 Test",
                        "submittedByProxy": False,
                        "proxyName": "",
                        "proxyRelationship": "",
                    },
                    "business": {
                        "businessName": "Ho kinh doanh Minh An Quan 1",
                        "businessModel": "Ho kinh doanh ca the",
                        "businessAddress": "123 Test",
                        "startDate": "2026-05-01",
                        "businessDescription": "Ban le thuc pham tai cua hang va giao hang online",
                        "householdMembers": "",
                    },
                    "industry": {
                        "mainIndustry": "Ban le thuc pham",
                        "subIndustry": "",
                        "expectedCapital": "10000000",
                        "laborScale": "1 - 2 lao dong",
                        "salesChannel": "Tai cua hang va online",
                        "note": "",
                        "requiresPracticeLicense": False,
                    },
                    "submissionCode": "HKD-2026-00001",
                    "status": "needs_fix",
                },
                "documents": [
                    {
                        "id": "doc-1",
                        "label": "Don dang ky",
                        "originalName": "don.txt",
                        "documentType": "application",
                        "ocrSummary": "Ten ho kinh doanh trong don la Ho kinh doanh Minh An Quan 9",
                        "ocrText": "Ten ho kinh doanh: Ho kinh doanh Minh An Quan 9",
                        "extractedFields": {
                            "businessName": "Ho kinh doanh Minh An Quan 9",
                        },
                        "extractionConfidence": "high",
                        "semanticStatus": "mismatch",
                        "semanticIssues": [
                            {
                                "id": "doc-1:businessName",
                                "severity": "critical",
                                "title": "Ten ho kinh doanh chua khop",
                                "affectedField": "Ten ho kinh doanh",
                                "submittedValue": "Ho kinh doanh Minh An Quan 1",
                                "extractedValue": "Ho kinh doanh Minh An Quan 9",
                                "rejectionReason": "Thong tin tren don chua khop voi phan ke khai.",
                                "target": {"route": "/register", "step": 2},
                                "sourceDocuments": [
                                    {
                                        "documentId": "doc-1",
                                        "documentLabel": "Don dang ky",
                                        "documentType": "application",
                                        "originalName": "don.txt",
                                    }
                                ],
                                "comparisons": [
                                    {
                                        "id": "doc-1:businessName",
                                        "fieldKey": "businessName",
                                        "fieldLabel": "Ten ho kinh doanh",
                                        "status": "mismatch",
                                        "submittedValue": "Ho kinh doanh Minh An Quan 1",
                                        "extractedValue": "Ho kinh doanh Minh An Quan 9",
                                        "reason": "Thong tin tren don chua khop voi phan ke khai.",
                                        "sourceDocuments": [],
                                        "legalBasis": ["Nghi dinh 01/2021/ND-CP"],
                                    }
                                ],
                                "legalBasis": ["Nghi dinh 01/2021/ND-CP"],
                            }
                        ],
                    }
                ],
                "reviewResult": {
                    "findings": [
                        {
                            "id": "doc-1:businessName",
                            "severity": "critical",
                            "title": "Ten ho kinh doanh chua khop",
                            "affectedField": "Ten ho kinh doanh",
                            "submittedValue": "Ho kinh doanh Minh An Quan 1",
                            "extractedValue": "Ho kinh doanh Minh An Quan 9",
                            "rejectionReason": "Thong tin tren don chua khop voi phan ke khai.",
                            "target": {"route": "/register", "step": 2},
                            "sourceDocuments": [
                                {
                                    "documentId": "doc-1",
                                    "documentLabel": "Don dang ky",
                                    "documentType": "application",
                                    "originalName": "don.txt",
                                }
                            ],
                            "comparisons": [
                                {
                                    "id": "doc-1:businessName",
                                    "fieldKey": "businessName",
                                    "fieldLabel": "Ten ho kinh doanh",
                                    "status": "mismatch",
                                    "submittedValue": "Ho kinh doanh Minh An Quan 1",
                                    "extractedValue": "Ho kinh doanh Minh An Quan 9",
                                    "reason": "Thong tin tren don chua khop voi phan ke khai.",
                                    "sourceDocuments": [],
                                    "legalBasis": ["Nghi dinh 01/2021/ND-CP"],
                                }
                            ],
                            "legalBasis": ["Nghi dinh 01/2021/ND-CP"],
                        }
                    ],
                    "missingDocuments": [],
                    "documentChecks": [],
                    "fieldComparisons": [],
                    "references": ["Nghi dinh 01/2021/ND-CP"],
                    "legalBasis": ["Nghi dinh 01/2021/ND-CP"],
                },
                "threadMessages": [],
                "question": "File nao sai va can cu gi?",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["provider"], "grounded-fastapi")
        self.assertGreater(len(payload["paragraphs"]), 0)
        self.assertIn("Don dang ky", payload["paragraphs"][1])
        self.assertIn("Nghi dinh 01/2021/ND-CP", payload["references"])

    @patch("services.assistant_service.ask_legal_question", new_callable=AsyncMock)
    def test_assistant_reply_can_fallback_to_legal_lookup(self, mock_ask_legal_question: AsyncMock) -> None:
        mock_ask_legal_question.return_value = {
            "answer": "Căn cứ pháp lý bổ sung.",
            "citations": ["Luật Doanh nghiệp 2020"],
        }

        response = self.client.post(
            "/internal/v1/assistant/reply",
            headers=self.headers,
            json={
                "submission": {
                    "owner": {
                        "ownerName": "Nguyen Van A",
                        "nationalId": "012345678901",
                        "birthDate": "1990-01-01",
                        "phone": "0901234567",
                        "email": "demo@example.com",
                        "address": "123 Test",
                        "submittedByProxy": False,
                        "proxyName": "",
                        "proxyRelationship": "",
                    },
                    "business": {
                        "businessName": "Ho kinh doanh Minh An Quan 1",
                        "businessModel": "Ho kinh doanh ca the",
                        "businessAddress": "123 Test",
                        "startDate": "2026-05-01",
                        "businessDescription": "Ban le thuc pham tai cua hang va giao hang online",
                        "householdMembers": "",
                    },
                    "industry": {
                        "mainIndustry": "Ban le thuc pham",
                        "subIndustry": "",
                        "expectedCapital": "10000000",
                        "laborScale": "1 - 2 lao dong",
                        "salesChannel": "Tai cua hang va online",
                        "note": "",
                        "requiresPracticeLicense": False,
                    },
                    "submissionCode": "HKD-2026-00001",
                    "status": "needs_fix",
                },
                "documents": [],
                "reviewResult": {
                    "findings": [
                        {
                            "id": "finding-1",
                            "severity": "critical",
                            "title": "Dia chi chua khop",
                            "affectedField": "Dia chi kinh doanh",
                            "submittedValue": "123 Test",
                            "extractedValue": "999 Sai Dia Chi",
                            "rejectionReason": "Dia chi trong hop dong chua khop voi ke khai.",
                            "target": {"route": "/documents"},
                            "sourceDocuments": [],
                            "comparisons": [],
                            "legalBasis": [],
                        }
                    ],
                    "missingDocuments": [],
                    "documentChecks": [],
                    "fieldComparisons": [],
                    "references": ["Nghi dinh 01/2021/ND-CP"],
                    "legalBasis": [],
                },
                "threadMessages": [],
                "question": "Can cu gi cho loi nay?",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("Căn cứ pháp lý bổ sung.", payload["paragraphs"][-1])
        self.assertIn("Luật Doanh nghiệp 2020", payload["references"])


if __name__ == "__main__":
    unittest.main()
