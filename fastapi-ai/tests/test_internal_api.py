import base64
import os
import unittest

from fastapi.testclient import TestClient

from main import app


class InternalApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["INTERNAL_API_KEY"] = "test-fastapi-key"
        self.client = TestClient(app)
        self.headers = {"x-internal-api-key": "test-fastapi-key"}

    def test_health(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "OK")

    def test_analyze_review(self) -> None:
        encoded_document = base64.b64encode(
            b"Don dang ky ho kinh doanh Minh An Quan 1"
        ).decode("utf-8")
        response = self.client.post(
            "/internal/v1/reviews/analyze",
            headers=self.headers,
            json={
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
                "documents": [
                    {
                        "id": "doc-1",
                        "documentType": "application",
                        "label": "Don dang ky",
                        "originalName": "don.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": encoded_document,
                    },
                    {
                        "id": "doc-2",
                        "documentType": "citizen-id",
                        "label": "CCCD",
                        "originalName": "cccd.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": encoded_document,
                    },
                    {
                        "id": "doc-3",
                        "documentType": "lease-contract",
                        "label": "Hop dong thue",
                        "originalName": "lease.txt",
                        "mimeType": "text/plain",
                        "fileKind": "doc",
                        "contentBase64": encoded_document,
                    },
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["provider"], "deterministic-fastapi")
        self.assertEqual(len(payload["documents"]), 3)
        self.assertEqual(payload["review"]["statusBanner"]["tone"], "success")

    def test_assistant_reply(self) -> None:
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
                    "status": "eligible",
                },
                "documents": [],
                "reviewResult": {
                    "findings": [],
                    "missingDocuments": [],
                    "references": ["Nghi dinh 01/2021/ND-CP"],
                },
                "threadMessages": [],
                "question": "Toi co the nop chinh thuc chua?",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["provider"], "deterministic-fastapi")
        self.assertGreater(len(payload["paragraphs"]), 0)


if __name__ == "__main__":
    unittest.main()
