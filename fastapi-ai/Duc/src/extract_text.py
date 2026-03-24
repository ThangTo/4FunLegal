"""
Phần 1a: Trích xuất văn bản từ file Word (.doc/.docx).

Module này đọc file Word, làm sạch ký tự rác, chuẩn hóa khoảng trắng
và xuất ra text thô đã clean.
"""
import os
import re
import subprocess

from src.config import INPUT_DOC_PATH, RAW_TEXT_PATH


def extract_text_from_doc(doc_path: str) -> str:
    """
    Trích xuất text từ file .doc hoặc .docx.

    Args:
        doc_path: Đường dẫn tới file Word.

    Returns:
        Chuỗi text thô.
    """
    if not os.path.exists(doc_path):
        raise FileNotFoundError(f"Không tìm thấy file: {doc_path}")

    ext = os.path.splitext(doc_path)[1].lower()

    if ext == ".docx":
        return _extract_from_docx(doc_path)
    elif ext == ".doc":
        return _extract_from_doc(doc_path)
    else:
        raise ValueError(f"Định dạng file không được hỗ trợ: {ext}")


def _extract_from_docx(doc_path: str) -> str:
    """Đọc file .docx bằng python-docx."""
    from docx import Document

    doc = Document(doc_path)
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append(text)
    return "\n".join(paragraphs)


def _convert_doc_to_docx(doc_path: str) -> str:
    """
    Chuyển file .doc → .docx bằng nhiều cách.
    Trả về đường dẫn tới file .docx đã tạo.
    """
    docx_path = os.path.splitext(doc_path)[0] + ".docx"

    # Nếu file .docx đã tồn tại sẵn (user tự convert)
    if os.path.exists(docx_path):
        print(f"  [INFO] Tìm thấy file .docx sẵn có: {docx_path}")
        return docx_path

    # Phương thức 1: Dùng PowerShell + Word COM (Windows + MS Word)
    try:
        abs_doc = os.path.abspath(doc_path)
        abs_docx = os.path.abspath(docx_path)
        ps_script = f'''
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("{abs_doc}")
$doc.SaveAs2("{abs_docx}", 16)
$doc.Close()
$word.Quit()
'''
        print("  [Word COM] Đang chuyển đổi bằng Microsoft Word...")
        result = subprocess.run(
            ["powershell", "-Command", ps_script],
            capture_output=True, text=True, timeout=60
        )
        if os.path.exists(docx_path):
            print("  [Word COM] ✓ Chuyển đổi thành công!")
            return docx_path
    except Exception as e:
        print(f"  [Word COM] Thất bại: {e}")

    # Phương thức 2: Dùng LibreOffice
    try:
        output_dir = os.path.dirname(abs_doc) if 'abs_doc' in dir() else os.path.dirname(doc_path)
        for cmd_name in ["soffice", "libreoffice"]:
            try:
                print(f"  [{cmd_name}] Đang chuyển đổi...")
                subprocess.run(
                    [cmd_name, "--headless", "--convert-to", "docx",
                     "--outdir", output_dir, doc_path],
                    capture_output=True, text=True, timeout=60
                )
                if os.path.exists(docx_path):
                    print(f"  [{cmd_name}] ✓ Chuyển đổi thành công!")
                    return docx_path
            except FileNotFoundError:
                continue
    except Exception as e:
        print(f"  [LibreOffice] Thất bại: {e}")

    raise RuntimeError(
        f"Không thể chuyển đổi .doc → .docx tự động.\n"
        f"Vui lòng làm THỦ CÔNG:\n"
        f"  1. Mở file: {doc_path}\n"
        f"  2. Trong Word: File → Save As → chọn .docx\n"
        f"  3. Lưu tại: {docx_path}\n"
        f"  4. Chạy lại pipeline"
    )


def _extract_from_doc(doc_path: str) -> str:
    """Đọc file .doc bằng cách chuyển sang .docx trước."""
    docx_path = _convert_doc_to_docx(doc_path)
    return _extract_from_docx(docx_path)


def clean_text(raw_text: str) -> str:
    """
    Làm sạch text thô:
    - Xóa ký tự rác (control characters)
    - Chuẩn hóa khoảng trắng
    - Chuẩn hóa xuống dòng
    - Xóa dòng trống thừa
    """
    # Xóa ký tự control (trừ \n, \r, \t)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', raw_text)

    # Chuẩn hóa xuống dòng Windows → Unix
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Xóa khoảng trắng thừa trên mỗi dòng
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        line = line.rstrip()
        line = line.replace('\t', '    ')
        line = re.sub(r' {2,}', ' ', line)
        cleaned_lines.append(line)

    text = '\n'.join(cleaned_lines)

    # Xóa nhiều dòng trống liên tiếp (giữ tối đa 1 dòng trống)
    text = re.sub(r'\n{3,}', '\n\n', text)

    text = text.strip()
    return text


def run_extraction() -> str:
    """
    Chạy toàn bộ bước trích xuất: đọc file → clean → lưu.

    Returns:
        Text đã clean.
    """
    print("=" * 60)
    print("BƯỚC 1: TRÍCH XUẤT VĂN BẢN TỪ FILE WORD")
    print("=" * 60)

    print(f"[1.1] Đọc file: {INPUT_DOC_PATH}")
    raw_text = extract_text_from_doc(INPUT_DOC_PATH)
    print(f"  → Đã đọc {len(raw_text):,} ký tự")

    print("[1.2] Làm sạch văn bản...")
    cleaned_text = clean_text(raw_text)
    print(f"  → Còn {len(cleaned_text):,} ký tự sau khi clean")

    print(f"[1.3] Lưu text đã clean ra: {RAW_TEXT_PATH}")
    with open(RAW_TEXT_PATH, "w", encoding="utf-8") as f:
        f.write(cleaned_text)

    preview = cleaned_text[:500]
    print(f"\n--- PREVIEW (500 ký tự đầu) ---")
    print(preview)
    print(f"--- END PREVIEW ---\n")

    return cleaned_text


if __name__ == "__main__":
    run_extraction()
