"""
Bước 3: Xây dựng Graph Database (Neo4j).

Module này nạp dữ liệu đã phân rã vào Neo4j, tạo:
- Nodes: Phan, Chuong, Muc, Dieu, Khoan, Diem
- Relationships: THUOC (phân cấp), THAM_CHIEU_TOI (tham chiếu chéo)
"""
import json
from datetime import datetime

from neo4j import GraphDatabase

from src.config import (
    GRAPH_BUILD_LOG_PATH,
    NEO4J_PASSWORD,
    NEO4J_URI,
    NEO4J_USER,
    PARSED_STRUCTURE_PATH,
)


class GraphLogger:
    """Logger ghi chi tiết quá trình build graph ra file."""

    def __init__(self, log_path: str):
        self.log_path = log_path
        self.node_count = 0
        self.rel_count = 0
        self.crossref_count = 0
        self._file = open(log_path, "w", encoding="utf-8")
        self._write_header()

    def _write_header(self):
        self._file.write("=" * 80 + "\n")
        self._file.write("  GRAPH DATABASE BUILD LOG\n")
        self._file.write(
            f"  Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        )
        self._file.write("=" * 80 + "\n\n")

    def log_node(
        self,
        node_type: str,
        node_id: str,
        number: str,
        title: str,
        content_preview: str,
        full_path: str,
    ):
        self.node_count += 1
        self._file.write(f"[NODE #{self.node_count:04d}] CREATE :{node_type}\n")
        self._file.write(f"  ID:       {node_id}\n")
        self._file.write(f"  Number:   {number}\n")
        self._file.write(f"  Path:     {full_path}\n")
        if title:
            self._file.write(f"  Title:    {title}\n")
        if content_preview:
            preview = content_preview[:150].replace("\n", " ")
            suffix = "..." if len(content_preview) > 150 else ""
            self._file.write(f"  Content:  {preview}{suffix}\n")
        self._file.write("\n")

    def log_relationship(self, from_id: str, to_id: str, rel_type: str):
        self.rel_count += 1
        arrow = "─THUỘC──▶" if rel_type == "THUOC" else "─THAM_CHIẾU──▶"
        self._file.write(
            f"[REL  #{self.rel_count:04d}] ({from_id}) {arrow} ({to_id})\n"
        )

    def log_crossref(self, source_id: str, target_id: str, raw_text: str):
        self.crossref_count += 1
        self._file.write(
            f"[XREF #{self.crossref_count:04d}] ({source_id}) "
            f"─THAM_CHIẾU──▶ ({target_id})\n"
        )
        if raw_text:
            self._file.write(f'  Trích:    "{raw_text[:100]}"\n')

    def log_crossref_skip(self, source_id: str, target_id: str, reason: str):
        self._file.write(
            f"[XREF SKIP] ({source_id}) ──X──▶ ({target_id}) | Lý do: {reason}\n"
        )

    def log_section(self, title: str):
        self._file.write("\n" + "─" * 80 + "\n")
        self._file.write(f"  {title}\n")
        self._file.write("─" * 80 + "\n\n")

    def log_summary(self, stats: dict):
        self._file.write("\n" + "=" * 80 + "\n")
        self._file.write("  TÓM TẮT\n")
        self._file.write("=" * 80 + "\n\n")
        self._file.write(f"  Tổng nodes tạo:          {self.node_count}\n")
        self._file.write(f"  Tổng quan hệ THUOC:      {self.rel_count}\n")
        self._file.write(f"  Tổng tham chiếu chéo:    {self.crossref_count}\n")
        self._file.write("\n  Nodes theo loại:\n")
        for label, count in stats.get("nodes", {}).items():
            self._file.write(f"    {label}: {count}\n")
        self._file.write("\n  Relationships theo loại:\n")
        for rel_type, count in stats.get("relationships", {}).items():
            self._file.write(f"    {rel_type}: {count}\n")
        self._file.write(
            f"\n  Hoàn thành: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        )

    def close(self):
        self._file.close()


class GraphBuilder:
    """Xây dựng và quản lý Neo4j Graph Database cho văn bản luật."""

    def __init__(
        self,
        uri: str,
        user: str,
        password: str,
        logger: GraphLogger | None = None,
    ):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.logger = logger
        print(f"[Neo4j] Kết nối tới {uri}")

    def close(self):
        self.driver.close()
        print("[Neo4j] Đã đóng kết nối")

    def verify_connection(self):
        with self.driver.session() as session:
            result = session.run("RETURN 1 AS test")
            record = result.single()
            if record and record["test"] == 1:
                print("[Neo4j] ✓ Kết nối thành công!")
                return True
        return False

    def clear_database(self):
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("[Neo4j] ✓ Đã xóa dữ liệu cũ")

    def create_constraints_and_indexes(self):
        constraints = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Phan) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Chuong) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (m:Muc) REQUIRE m.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Dieu) REQUIRE d.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (k:Khoan) REQUIRE k.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (di:Diem) REQUIRE di.id IS UNIQUE",
        ]

        with self.driver.session() as session:
            for query in constraints:
                try:
                    session.run(query)
                except Exception as exc:
                    print(f"[Neo4j] Warning khi tạo constraint: {exc}")

        print("[Neo4j] ✓ Đã tạo constraints và indexes")

    def create_node(self, node_type: str, properties: dict):
        if "cross_references" in properties:
            properties["cross_references"] = json.dumps(
                properties["cross_references"], ensure_ascii=False
            )
        if "parent_chain" in properties:
            properties["parent_chain_str"] = " > ".join(properties["parent_chain"])
            del properties["parent_chain"]

        properties.pop("children", None)
        query = f"CREATE (n:{node_type} $props) RETURN n.id AS id"

        with self.driver.session() as session:
            session.run(query, props=properties)

        if self.logger:
            self.logger.log_node(
                node_type=node_type,
                node_id=properties.get("id", ""),
                number=properties.get("number", ""),
                title=properties.get("title", ""),
                content_preview=properties.get("content", ""),
                full_path=properties.get(
                    "full_path", properties.get("parent_chain_str", "")
                ),
            )

    def create_relationship(
        self,
        from_id: str,
        to_id: str,
        rel_type: str,
        from_label: str | None = None,
        to_label: str | None = None,
    ):
        from_match = f"(a:{from_label})" if from_label else "(a)"
        to_match = f"(b:{to_label})" if to_label else "(b)"

        query = f"""
        MATCH {from_match} WHERE a.id = $from_id
        MATCH {to_match} WHERE b.id = $to_id
        CREATE (a)-[r:{rel_type}]->(b)
        RETURN type(r)
        """

        with self.driver.session() as session:
            session.run(query, from_id=from_id, to_id=to_id)

        if self.logger and rel_type == "THUOC":
            self.logger.log_relationship(from_id, to_id, rel_type)

    def load_tree_recursive(
        self,
        node_data: dict,
        parent_id: str | None = None,
        parent_type: str | None = None,
    ):
        node_type = node_data["type"]
        properties = {
            "id": node_data["id"],
            "number": node_data["number"],
            "title": node_data.get("title", ""),
            "content": node_data.get("content", ""),
            "full_path": node_data.get("full_path", ""),
            "parent_chain_str": " > ".join(node_data.get("parent_chain", [])),
        }

        if node_data.get("cross_references"):
            properties["cross_references"] = json.dumps(
                node_data["cross_references"], ensure_ascii=False
            )

        self.create_node(node_type, properties)

        if parent_id and parent_type:
            self.create_relationship(
                from_id=node_data["id"],
                to_id=parent_id,
                rel_type="THUOC",
                from_label=node_type,
                to_label=parent_type,
            )

        for child_data in node_data.get("children", []):
            self.load_tree_recursive(
                child_data,
                parent_id=node_data["id"],
                parent_type=node_type,
            )

    def load_cross_references(self, parsed_data: dict):
        ref_count = 0

        for chunk in parsed_data.get("chunks", []):
            for ref in chunk.get("cross_references", []):
                source_id = ref.get("source_id")
                target_id = ref.get("target_node_id")
                raw_text = ref.get("raw_text", "")

                if source_id and target_id and source_id != target_id:
                    try:
                        self.create_relationship(
                            from_id=source_id,
                            to_id=target_id,
                            rel_type="THAM_CHIEU_TOI",
                        )
                        ref_count += 1
                        if self.logger:
                            self.logger.log_crossref(source_id, target_id, raw_text)
                    except Exception as exc:
                        if self.logger:
                            self.logger.log_crossref_skip(
                                source_id, target_id, str(exc)
                            )

        return ref_count

    def get_statistics(self) -> dict:
        stats = {}

        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (n)
                RETURN labels(n) AS label, count(n) AS count
                ORDER BY count DESC
                """
            )
            stats["nodes"] = {str(record["label"]): record["count"] for record in result}

            result = session.run(
                """
                MATCH ()-[r]->()
                RETURN type(r) AS type, count(r) AS count
                ORDER BY count DESC
                """
            )
            stats["relationships"] = {
                record["type"]: record["count"] for record in result
            }

            stats["total_nodes"] = session.run(
                "MATCH (n) RETURN count(n) AS total"
            ).single()["total"]
            stats["total_relationships"] = session.run(
                "MATCH ()-[r]->() RETURN count(r) AS total"
            ).single()["total"]

        return stats


def run_build_graph() -> dict:
    """
    Chạy toàn bộ bước xây dựng Graph Database.
    """
    print("=" * 60)
    print("BƯỚC 3: XÂY DỰNG GRAPH DATABASE (NEO4J)")
    print("=" * 60)

    print(f"[3.1] Đọc dữ liệu từ: {PARSED_STRUCTURE_PATH}")
    with open(PARSED_STRUCTURE_PATH, "r", encoding="utf-8") as file_obj:
        parsed_data = json.load(file_obj)

    metadata = parsed_data["metadata"]
    print(f"  -> {metadata['total_nodes']} nodes, {metadata['total_chunks']} chunks")

    logger = GraphLogger(GRAPH_BUILD_LOG_PATH)
    logger.log_section("DỮ LIỆU ĐẦU VÀO")
    logger._file.write(f"  Source:  {PARSED_STRUCTURE_PATH}\n")
    logger._file.write(f"  Nodes:   {metadata['total_nodes']}\n")
    logger._file.write(f"  Chunks:  {metadata['total_chunks']}\n")
    logger._file.write(
        f"  Stats:   {json.dumps(metadata.get('statistics', {}), indent=2)}\n"
    )

    print(f"[3.2] Kết nối Neo4j: {NEO4J_URI}")
    builder = GraphBuilder(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, logger=logger)

    try:
        builder.verify_connection()

        print("[3.3] Xóa dữ liệu cũ...")
        builder.clear_database()

        print("[3.4] Tạo constraints và indexes...")
        builder.create_constraints_and_indexes()

        logger.log_section("TẠO NODES VÀ QUAN HỆ THUỘC")
        print("[3.5] Nạp cây phân cấp vào Neo4j...")
        tree = parsed_data["tree"]
        for index, root_node in enumerate(tree):
            builder.load_tree_recursive(root_node)
            print(f"  -> Đã nạp root node {index + 1}/{len(tree)}: {root_node['id']}")

        logger.log_section("TẠO THAM CHIẾU CHÉO (THAM_CHIEU_TOI)")
        print("[3.6] Nạp tham chiếu chéo...")
        ref_count = builder.load_cross_references(parsed_data)
        print(f"  -> Đã tạo {ref_count} quan hệ THAM_CHIEU_TOI")

        print("[3.7] Thống kê Graph Database:")
        stats = builder.get_statistics()
        print(f"  -> Tổng nodes: {stats['total_nodes']}")
        print(f"  -> Tổng relationships: {stats['total_relationships']}")
        print("  -> Nodes theo loại:")
        for label, count in stats["nodes"].items():
            print(f"      {label}: {count}")
        print("  -> Relationships theo loại:")
        for rel_type, count in stats["relationships"].items():
            print(f"      {rel_type}: {count}")

        logger.log_summary(stats)
        logger.close()

        print(f"\n[LOG] ✓ Log chi tiết đã ghi ra: {GRAPH_BUILD_LOG_PATH}")
        print("[Neo4j] ✓ Hoàn thành xây dựng Graph Database!")
        return stats
    finally:
        builder.close()


if __name__ == "__main__":
    run_build_graph()
