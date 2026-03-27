"""
Neo4j Client: Quản lý kết nối và truy vấn Cypher cho V-Legal.

Cung cấp:
- Connection pool
- lookup_article(): Tra cứu Điều theo số hiệu
- expand_context(): Lấy Điều cha + Khoản con + Cross-refs
- verify_exists(): Kiểm tra tồn tại cho Validator (Deterministic Grounding)
"""
from neo4j import GraphDatabase
from src.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD


class Neo4jClient:
    """Singleton Neo4j client với connection pool."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.driver = GraphDatabase.driver(
                NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
            )
        return cls._instance

    def close(self):
        self.driver.close()

    def verify_connection(self) -> bool:
        with self.driver.session() as session:
            result = session.run("RETURN 1 AS ok")
            return result.single()["ok"] == 1

    # ==========================================================================
    # LOOKUP: Tra cứu trực tiếp theo số hiệu Điều
    # ==========================================================================

    def lookup_article(self, article_number: str) -> dict | None:
        """
        Tra cứu Điều theo số hiệu. Trả về Điều + tất cả Khoản/Điểm con.
        Dùng cho Router LOOKUP path (bỏ qua Vector Search).
        """
        query = """
        MATCH (d:Dieu {number: $num})
        OPTIONAL MATCH (d)<-[:THUOC]-(k:Khoan)
        OPTIONAL MATCH (k)<-[:THUOC]-(di:Diem)
        OPTIONAL MATCH (d)-[:THUOC]->(parent)
        RETURN d.id AS dieu_id,
               d.number AS dieu_number,
               d.title AS dieu_title,
               d.content AS dieu_content,
               d.full_path AS dieu_path,
               labels(parent)[0] AS parent_type,
               parent.title AS parent_title,
               parent.number AS parent_number,
               collect(DISTINCT {
                   id: k.id, number: k.number,
                   content: k.content, type: 'Khoan'
               }) AS khoan_list,
               collect(DISTINCT {
                   id: di.id, number: di.number,
                   content: di.content, type: 'Diem',
                   parent_khoan: k.number
               }) AS diem_list
        """
        with self.driver.session() as session:
            result = session.run(query, num=article_number)
            record = result.single()
            if not record or not record["dieu_id"]:
                return None

            return {
                "dieu_id": record["dieu_id"],
                "dieu_number": record["dieu_number"],
                "dieu_title": record["dieu_title"] or "",
                "dieu_content": record["dieu_content"] or "",
                "dieu_path": record["dieu_path"] or "",
                "parent_type": record["parent_type"] or "",
                "parent_title": record["parent_title"] or "",
                "parent_number": record["parent_number"] or "",
                "khoan_list": [
                    k for k in record["khoan_list"]
                    if k["id"] is not None
                ],
                "diem_list": [
                    d for d in record["diem_list"]
                    if d["id"] is not None
                ],
            }

    # ==========================================================================
    # EXPAND: Mở rộng ngữ cảnh từ graph_node_id (Small-to-Big)
    # ==========================================================================

    def expand_context(self, node_ids: list[str]) -> list[dict]:
        """
        Từ danh sách graph_node_id (kết quả Vector Search),
        mở rộng ngữ cảnh bằng cách lấy:
        1. Node gốc
        2. Điều cha + tất cả Khoản con
        3. Cross-references (giới hạn depth 1..2)
        """
        context_entries = []
        seen_ids = set()

        with self.driver.session() as session:
            for node_id in node_ids:
                if node_id in seen_ids:
                    continue

                # Query 1: Node gốc + Điều cha
                parent_query = """
                MATCH (n) WHERE n.id = $nid
                OPTIONAL MATCH (n)-[:THUOC]->(dieu:Dieu)
                OPTIONAL MATCH (dieu)-[:THUOC]->(chuong:Chuong)
                RETURN n.id AS nid, labels(n) AS labels,
                       n.content AS content, n.title AS title,
                       n.number AS number, n.full_path AS path,
                       dieu.id AS dieu_id, dieu.content AS dieu_content,
                       dieu.title AS dieu_title, dieu.number AS dieu_num,
                       dieu.full_path AS dieu_path,
                       chuong.title AS chuong_title,
                       chuong.number AS chuong_num
                """
                record = session.run(parent_query, nid=node_id).single()
                if not record:
                    continue

                # Node gốc
                context_entries.append({
                    "source": "direct_match",
                    "node_id": record["nid"],
                    "type": record["labels"][0] if record["labels"] else "",
                    "path": record["path"] or "",
                    "title": record["title"] or "",
                    "content": record["content"] or "",
                })
                seen_ids.add(node_id)

                # Điều cha (nếu node là Khoản/Điểm)
                if record["dieu_id"] and record["dieu_id"] not in seen_ids:
                    # Lấy tất cả Khoản con của Điều cha
                    children_q = """
                    MATCH (k)-[:THUOC]->(d:Dieu {id: $did})
                    RETURN k.content AS c, k.number AS n, labels(k) AS l
                    ORDER BY k.number
                    """
                    children = session.run(children_q, did=record["dieu_id"])
                    children_texts = []
                    for child in children:
                        if child["c"]:
                            label = child["l"][0] if child["l"] else ""
                            children_texts.append(
                                f"{label} {child['n']}: {child['c']}"
                            )

                    dieu_content = record["dieu_content"] or ""
                    if children_texts:
                        dieu_content += "\n" + "\n".join(children_texts)

                    context_entries.append({
                        "source": "parent_dieu",
                        "node_id": record["dieu_id"],
                        "type": "Dieu",
                        "path": record["dieu_path"] or "",
                        "title": f"Điều {record['dieu_num']}. {record['dieu_title'] or ''}",
                        "content": dieu_content,
                    })
                    seen_ids.add(record["dieu_id"])

                # Query 2: Cross-references (giới hạn depth 1..2)
                crossref_q = """
                MATCH (n {id: $nid})-[:THAM_CHIEU_TOI*1..2]->(ref)
                RETURN DISTINCT ref.id AS rid, labels(ref) AS rl,
                       ref.content AS rc, ref.title AS rt,
                       ref.number AS rn, ref.full_path AS rp
                LIMIT 5
                """
                for ref in session.run(crossref_q, nid=node_id):
                    rid = ref["rid"]
                    if rid in seen_ids:
                        continue
                    context_entries.append({
                        "source": "cross_reference",
                        "node_id": rid,
                        "type": ref["rl"][0] if ref["rl"] else "",
                        "path": ref["rp"] or "",
                        "title": ref["rt"] or "",
                        "content": ref["rc"] or "",
                    })
                    seen_ids.add(rid)

        return context_entries

    # ==========================================================================
    # VERIFY: Deterministic Grounding cho Validator Agent
    # ==========================================================================

    def verify_exists(self, article_number: str,
                      clause_number: str | None = None) -> bool:
        """
        Kiểm tra xem Điều/Khoản có tồn tại trong Graph không.
        Dùng cho Validator Agent (Deterministic Grounding).
        """
        if clause_number:
            query = """
            MATCH (k:Khoan {number: $knum})-[:THUOC]->(d:Dieu {number: $dnum})
            RETURN count(k) > 0 AS exists
            """
            with self.driver.session() as session:
                result = session.run(
                    query, dnum=article_number, knum=clause_number
                )
                return result.single()["exists"]
        else:
            query = """
            MATCH (d:Dieu {number: $dnum})
            RETURN count(d) > 0 AS exists
            """
            with self.driver.session() as session:
                result = session.run(query, dnum=article_number)
                return result.single()["exists"]

    def get_article_content(self, article_number: str) -> str | None:
        """Lấy nội dung chính xác của Điều từ Graph để đối soát."""
        query = """
        MATCH (d:Dieu {number: $dnum})
        OPTIONAL MATCH (k)-[:THUOC]->(d)
        RETURN d.content AS dc, d.title AS dt,
               collect({n: k.number, c: k.content, l: labels(k)}) AS kids
        """
        with self.driver.session() as session:
            record = session.run(query, dnum=article_number).single()
            if not record:
                return None

            parts = [f"Điều {article_number}. {record['dt'] or ''}"]
            if record["dc"]:
                parts.append(record["dc"])
            for kid in record["kids"]:
                if kid["c"]:
                    label = kid["l"][0] if kid["l"] else ""
                    parts.append(f"{label} {kid['n']}: {kid['c']}")
            return "\n".join(parts)
