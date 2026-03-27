"""
Bước 2: Phân rã văn bản luật theo cấu trúc pháp lý.

Module này phân tách text thô thành các node theo cấu trúc phân cấp:
    Phần -> Chương -> Mục -> Điều -> Khoản -> Điểm

Mỗi node được gắn metadata về vị trí trong cây phân cấp và các tham chiếu
chéo được trích xuất tự động.
"""
import json
import re
from typing import Optional

from src.config import PARSED_STRUCTURE_PATH, RAW_TEXT_PATH


RE_PHAN = re.compile(
    r"^PHẦN\s+(THỨ\s+)?(NHẤT|HAI|BA|BỐN|NĂM|SÁU|BẢY|TÁM|CHÍN|MƯỜI|"
    r"I{1,4}|IV|V|VI{0,3}|IX|X{0,3}|[0-9]+)"
    r"[\s\.\:]*\n?(.*)$",
    re.IGNORECASE | re.MULTILINE,
)

RE_CHUONG = re.compile(
    r"^Chương\s+(I{1,4}|IV|V|VI{0,3}|IX|X{0,3}|XI{0,3}|XIV|XV|XVI{0,3}|"
    r"XIX|XX{0,3}|[0-9]+)"
    r"[\s\.\:]*\n?(.*)$",
    re.IGNORECASE | re.MULTILINE,
)

RE_MUC = re.compile(
    r"^Mục\s+([0-9]+)"
    r"[\s\.\:]*\n?(.*)$",
    re.IGNORECASE | re.MULTILINE,
)

RE_DIEU = re.compile(r"^Điều\s+([0-9]+)\.\s*(.*)$", re.MULTILINE)
RE_KHOAN = re.compile(r"^(\d+)\.\s+(.+)", re.MULTILINE)
RE_DIEM = re.compile(r"^([a-zđ])\)\s+(.+)", re.MULTILINE)

RE_CROSS_REF = re.compile(
    r"(?:theo|quy định tại|nêu tại|được quy định tại|căn cứ|áp dụng|"
    r"phù hợp với|tuân thủ|tham chiếu)\s+"
    r"(?:(?:điểm\s+([a-zđ])(?:\s*,\s*([a-zđ]))*\s+)?"
    r"(?:khoản\s+(\d+)(?:\s*,\s*(\d+))*\s+)?"
    r"(?:Điều\s+(\d+)(?:\s*,\s*(\d+))*)?"
    r"(?:\s+(?:Luật|của Luật|Bộ luật|Nghị định)\s+(.+?))?)"
    r"(?=[\.\,\;\s]|$)",
    re.IGNORECASE,
)

RE_SELF_REF = re.compile(
    r"(?:(?:điểm\s+([a-zđ])(?:\s*và\s+([a-zđ]))?)\s+)?"
    r"(?:(?:khoản\s+(\d+)(?:\s*và\s+(\d+))?)\s+)?"
    r"(?:Điều\s+(\d+)\s+)?"
    r"(?:Luật\s+)?này",
    re.IGNORECASE,
)


class LegalNode:
    """Đại diện cho một đơn vị trong cấu trúc pháp lý."""

    def __init__(
        self,
        node_type: str,
        number: str,
        title: str = "",
        content: str = "",
        parent: Optional["LegalNode"] = None,
    ):
        self.node_type = node_type
        self.number = number
        self.title = title.strip()
        self.content = content.strip()
        self.parent = parent
        self.children: list["LegalNode"] = []
        self.cross_references: list[dict] = []

        self.id = self._generate_id()
        self.full_path = self._generate_full_path()
        self.parent_chain = self._generate_parent_chain()

    def _generate_id(self) -> str:
        parts = []
        node = self
        while node is not None:
            type_map = {
                "Phan": "phan",
                "Chuong": "chuong",
                "Muc": "muc",
                "Dieu": "dieu",
                "Khoan": "khoan",
                "Diem": "diem",
            }
            prefix = type_map.get(node.node_type, node.node_type.lower())
            parts.insert(0, f"{prefix}_{node.number}")
            node = node.parent
        return "_".join(parts)

    def _generate_full_path(self) -> str:
        parts = []
        node = self
        while node is not None:
            type_display = {
                "Phan": "Phần",
                "Chuong": "Chương",
                "Muc": "Mục",
                "Dieu": "Điều",
                "Khoan": "Khoản",
                "Diem": "Điểm",
            }
            display = type_display.get(node.node_type, node.node_type)
            parts.insert(0, f"{display} {node.number}")
            node = node.parent
        return " > ".join(parts)

    def _generate_parent_chain(self) -> list[str]:
        parts = []
        node = self.parent
        while node is not None:
            type_display = {
                "Phan": "Phần",
                "Chuong": "Chương",
                "Muc": "Mục",
                "Dieu": "Điều",
                "Khoan": "Khoản",
                "Diem": "Điểm",
            }
            display = type_display.get(node.node_type, node.node_type)
            parts.insert(0, f"{display} {node.number}")
            node = node.parent
        return parts

    def add_child(self, child: "LegalNode"):
        child.parent = self
        child.id = child._generate_id()
        child.full_path = child._generate_full_path()
        child.parent_chain = child._generate_parent_chain()
        self.children.append(child)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.node_type,
            "number": self.number,
            "title": self.title,
            "content": self.content,
            "parent_chain": self.parent_chain,
            "full_path": self.full_path,
            "cross_references": self.cross_references,
            "children": [child.to_dict() for child in self.children],
        }

    def get_all_nodes_flat(self) -> list["LegalNode"]:
        nodes = [self]
        for child in self.children:
            nodes.extend(child.get_all_nodes_flat())
        return nodes


def parse_legal_structure(text: str) -> list[LegalNode]:
    """
    Phân rã toàn bộ văn bản luật thành cây cấu trúc phân cấp.
    """
    root_nodes: list[LegalNode] = []
    current_context: dict[str, Optional[LegalNode]] = {
        "Phan": None,
        "Chuong": None,
        "Muc": None,
        "Dieu": None,
        "Khoan": None,
    }

    lines = text.split("\n")
    index = 0
    content_buffer = []
    current_node: Optional[LegalNode] = None

    def flush_content():
        nonlocal current_node, content_buffer
        if current_node and content_buffer:
            extra_content = "\n".join(content_buffer).strip()
            if extra_content:
                if current_node.content:
                    current_node.content += "\n" + extra_content
                else:
                    current_node.content = extra_content
            content_buffer = []

    while index < len(lines):
        line = lines[index].strip()

        if not line:
            if content_buffer:
                content_buffer.append("")
            index += 1
            continue

        match_phan = RE_PHAN.match(line)
        if match_phan:
            flush_content()
            number = match_phan.group(2).strip()
            title = match_phan.group(3).strip() if match_phan.group(3) else ""

            if not title and index + 1 < len(lines) and lines[index + 1].strip():
                next_line = lines[index + 1].strip()
                if not _is_heading(next_line):
                    title = next_line
                    index += 1

            node = LegalNode("Phan", number, title)
            root_nodes.append(node)
            current_context["Phan"] = node
            for key in ["Chuong", "Muc", "Dieu", "Khoan"]:
                current_context[key] = None
            current_node = node
            index += 1
            continue

        match_chuong = RE_CHUONG.match(line)
        if match_chuong:
            flush_content()
            number = match_chuong.group(1).strip()
            title = match_chuong.group(2).strip() if match_chuong.group(2) else ""

            if not title and index + 1 < len(lines) and lines[index + 1].strip():
                next_line = lines[index + 1].strip()
                if not _is_heading(next_line):
                    title = next_line
                    index += 1

            node = LegalNode("Chuong", number, title)
            if current_context["Phan"]:
                current_context["Phan"].add_child(node)
            else:
                root_nodes.append(node)

            current_context["Chuong"] = node
            for key in ["Muc", "Dieu", "Khoan"]:
                current_context[key] = None
            current_node = node
            index += 1
            continue

        match_muc = RE_MUC.match(line)
        if match_muc:
            flush_content()
            number = match_muc.group(1).strip()
            title = match_muc.group(2).strip() if match_muc.group(2) else ""

            if not title and index + 1 < len(lines) and lines[index + 1].strip():
                next_line = lines[index + 1].strip()
                if not _is_heading(next_line):
                    title = next_line
                    index += 1

            node = LegalNode("Muc", number, title)
            if current_context["Chuong"]:
                current_context["Chuong"].add_child(node)
            elif current_context["Phan"]:
                current_context["Phan"].add_child(node)
            else:
                root_nodes.append(node)

            current_context["Muc"] = node
            for key in ["Dieu", "Khoan"]:
                current_context[key] = None
            current_node = node
            index += 1
            continue

        match_dieu = RE_DIEU.match(line)
        if match_dieu:
            flush_content()
            number = match_dieu.group(1).strip()
            title = match_dieu.group(2).strip()

            node = LegalNode("Dieu", number, title)
            if current_context["Muc"]:
                current_context["Muc"].add_child(node)
            elif current_context["Chuong"]:
                current_context["Chuong"].add_child(node)
            elif current_context["Phan"]:
                current_context["Phan"].add_child(node)
            else:
                root_nodes.append(node)

            current_context["Dieu"] = node
            current_context["Khoan"] = None
            current_node = node
            index += 1
            continue

        if current_context["Dieu"]:
            match_khoan = RE_KHOAN.match(line)
            if match_khoan:
                khoan_num = int(match_khoan.group(1))
                if 1 <= khoan_num <= 50:
                    flush_content()
                    number = match_khoan.group(1).strip()
                    khoan_content = match_khoan.group(2).strip()

                    node = LegalNode("Khoan", number, content=khoan_content)
                    current_context["Dieu"].add_child(node)
                    current_context["Khoan"] = node
                    current_node = node
                    index += 1
                    continue

        if current_context["Khoan"]:
            match_diem = RE_DIEM.match(line)
            if match_diem:
                flush_content()
                number = match_diem.group(1).strip()
                diem_content = match_diem.group(2).strip()

                node = LegalNode("Diem", number, content=diem_content)
                current_context["Khoan"].add_child(node)
                current_node = node
                index += 1
                continue

        content_buffer.append(line)
        index += 1

    flush_content()
    return root_nodes


def _is_heading(line: str) -> bool:
    line = line.strip()
    return bool(
        RE_PHAN.match(line)
        or RE_CHUONG.match(line)
        or RE_MUC.match(line)
        or RE_DIEU.match(line)
    )


def extract_cross_references(nodes: list[LegalNode]):
    """
    Trích xuất tham chiếu chéo từ nội dung của mỗi node.
    """
    all_nodes = []
    for root in nodes:
        all_nodes.extend(root.get_all_nodes_flat())

    dieu_map: dict[str, str] = {}
    for node in all_nodes:
        if node.node_type == "Dieu":
            dieu_map[node.number] = node.id

    for node in all_nodes:
        if not node.content:
            continue

        refs = []

        for match in RE_CROSS_REF.finditer(node.content):
            ref = {
                "source_id": node.id,
                "raw_text": match.group(0).strip(),
            }

            dieu_ref = match.group(5)
            if dieu_ref:
                ref["target_dieu"] = dieu_ref
                if dieu_ref in dieu_map:
                    ref["target_node_id"] = dieu_map[dieu_ref]

            khoan_ref = match.group(3)
            if khoan_ref:
                ref["target_khoan"] = khoan_ref

            diem_ref = match.group(1)
            if diem_ref:
                ref["target_diem"] = diem_ref

            if "target_dieu" in ref or "target_khoan" in ref:
                refs.append(ref)

        for match in RE_SELF_REF.finditer(node.content):
            full_match = match.group(0)
            if not full_match or len(full_match) < 5:
                continue

            ref = {
                "source_id": node.id,
                "raw_text": full_match.strip(),
                "is_self_reference": True,
            }

            self_dieu = match.group(5)
            if self_dieu and self_dieu in dieu_map:
                ref["target_node_id"] = dieu_map[self_dieu]
                ref["target_dieu"] = self_dieu
            else:
                current = node
                while current and current.node_type != "Dieu":
                    current = current.parent
                if current:
                    ref["target_node_id"] = current.id
                    ref["target_dieu"] = current.number

            if "target_node_id" in ref:
                refs.append(ref)

        node.cross_references = refs


def get_embeddable_chunks(nodes: list[LegalNode]) -> list[dict]:
    """
    Lấy các chunk ở cấp nhỏ nhất để tạo embedding cho Vector DB.
    """
    chunks = []

    for root in nodes:
        all_nodes = root.get_all_nodes_flat()
        for node in all_nodes:
            if node.node_type == "Diem" and node.content:
                chunks.append(
                    {
                        "id": node.id,
                        "type": node.node_type,
                        "number": node.number,
                        "content": node.content,
                        "full_path": node.full_path,
                        "parent_chain": node.parent_chain,
                        "cross_references": node.cross_references,
                    }
                )
            elif node.node_type == "Khoan" and not node.children and node.content:
                chunks.append(
                    {
                        "id": node.id,
                        "type": node.node_type,
                        "number": node.number,
                        "content": node.content,
                        "full_path": node.full_path,
                        "parent_chain": node.parent_chain,
                        "cross_references": node.cross_references,
                    }
                )
            elif node.node_type == "Dieu" and not node.children and node.content:
                chunks.append(
                    {
                        "id": node.id,
                        "type": node.node_type,
                        "number": node.number,
                        "title": node.title,
                        "content": node.content,
                        "full_path": node.full_path,
                        "parent_chain": node.parent_chain,
                        "cross_references": node.cross_references,
                    }
                )

    return chunks


def run_parsing(text: str) -> tuple[list[LegalNode], list[dict]]:
    """
    Chạy toàn bộ bước phân rã cấu trúc.
    """
    print("=" * 60)
    print("BƯỚC 2: PHÂN RÃ CẤU TRÚC PHÁP LÝ")
    print("=" * 60)

    print("[2.1] Phân tách theo cấu trúc: Phần -> Chương -> Mục -> Điều -> Khoản -> Điểm...")
    root_nodes = parse_legal_structure(text)

    all_nodes = []
    for root in root_nodes:
        all_nodes.extend(root.get_all_nodes_flat())

    stats = {}
    for node in all_nodes:
        stats[node.node_type] = stats.get(node.node_type, 0) + 1

    print("  -> Kết quả phân rã:")
    display_names = {
        "Phan": "Phần",
        "Chuong": "Chương",
        "Muc": "Mục",
        "Dieu": "Điều",
        "Khoan": "Khoản",
        "Diem": "Điểm",
    }
    for node_type in ["Phan", "Chuong", "Muc", "Dieu", "Khoan", "Diem"]:
        count = stats.get(node_type, 0)
        if count > 0:
            print(f"    - {display_names[node_type]}: {count}")

    print("[2.2] Trích xuất tham chiếu chéo...")
    extract_cross_references(root_nodes)
    ref_count = sum(len(node.cross_references) for node in all_nodes)
    print(f"  -> Tìm thấy {ref_count} tham chiếu chéo")

    print("[2.3] Tạo embedding chunks...")
    chunks = get_embeddable_chunks(root_nodes)
    print(f"  -> Tạo được {len(chunks)} chunks cho Vector DB")

    print(f"[2.4] Lưu cấu trúc ra: {PARSED_STRUCTURE_PATH}")
    output_data = {
        "metadata": {
            "source_file": "Luat-doanh-nghiep-2020-test.docx",
            "total_nodes": len(all_nodes),
            "total_chunks": len(chunks),
            "total_cross_references": ref_count,
            "statistics": {key: value for key, value in sorted(stats.items())},
        },
        "tree": [root.to_dict() for root in root_nodes],
        "chunks": chunks,
    }

    with open(PARSED_STRUCTURE_PATH, "w", encoding="utf-8") as file_obj:
        json.dump(output_data, file_obj, ensure_ascii=False, indent=2)

    print("  -> Đã lưu thành công!")

    if chunks:
        sample = chunks[0]
        print("\n--- PREVIEW CHUNK ĐẦU TIÊN ---")
        print(f"  ID: {sample['id']}")
        print(f"  Type: {sample['type']}")
        print(f"  Path: {sample['full_path']}")
        print(f"  Content: {sample['content'][:200]}...")
        print("--- END PREVIEW ---\n")

    return root_nodes, chunks


if __name__ == "__main__":
    with open(RAW_TEXT_PATH, "r", encoding="utf-8") as file_obj:
        raw_text = file_obj.read()
    run_parsing(raw_text)
