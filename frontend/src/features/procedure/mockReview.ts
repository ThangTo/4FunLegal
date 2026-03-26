import type { ProcedureDraft, RegistrationStep } from "./procedureDraft";

export type ProcedureUploadedFile = {
  id: string;
  label: string;
  name: string;
  size: string;
  format: string;
  type: "image" | "doc";
  preview?: string;
  icon?: string;
  status: "verified" | "processing";
  statusLabel: string;
};

export type RequiredProcedureDocument = {
  id: string;
  label: string;
  status: "uploaded" | "missing" | "required";
};

export type ProcessingTimelineItem = {
  id: string;
  title: string;
  icon: string;
  completedLabel: string;
  pendingLabel: string;
};

export type ReviewSummaryItem = {
  id: string;
  tone: "success" | "warning" | "error" | "info";
  icon: string;
  text: string;
};

export type ReviewTarget =
  | {
      route: "/register";
      step: RegistrationStep;
    }
  | {
      route: "/documents";
    };

export type ReviewFinding = {
  id: string;
  severity: "critical" | "warning";
  title: string;
  affectedField: string;
  extractedValueFallback: string;
  sourceField?: keyof ProcedureDraft;
  rejectionReason: string;
  suggestion: string;
  target: ReviewTarget;
};

export type MissingProcedureDocument = {
  id: string;
  label: string;
  description: string;
  target: Extract<ReviewTarget, { route: "/documents" }>;
};

export const uploadedProcedureFiles: ProcedureUploadedFile[] = [
  {
    id: "citizen-id",
    label: "CCCD",
    name: "CCCD_NguyenVanA.jpg",
    size: "1.2 MB",
    format: "JPG",
    type: "image",
    preview:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCdPIWeK1KX8ia1hdsHtwhyOyZkp2Ta5wy5hlAmr5q3VmoFtDsR-GjmT5m2p3BQ-EhBaVs9QD7XcLf2NHi5T7Vv7kV929ZCfnve7Zyf5BxdFsgFrO9kVi86Al784MfEkKJ8W9HsQnfLNlt2p-IdRYl1iVOTQ142waDn7BqmVgC-bxQZkNHuRWo4M044b7881L1nykh80Ph6ZiS3qHfyXTYTtGKNDwiXao4vVNELPYk2novPC9frAfVsZkpWPZClYQ8iOaUaEttjssPw",
    status: "verified",
    statusLabel: "Đã kiểm tra",
  },
  {
    id: "application",
    label: "Đơn đăng ký",
    name: "Don_dang_ky.pdf",
    size: "450 KB",
    format: "PDF",
    type: "doc",
    icon: "description",
    status: "processing",
    statusLabel: "Đang xử lý OCR",
  },
  {
    id: "lease-contract",
    label: "Hợp đồng thuê địa điểm",
    name: "Hop_dong_thue_nha.docx",
    size: "2.8 MB",
    format: "DOCX",
    type: "doc",
    icon: "article",
    status: "verified",
    statusLabel: "Đã kiểm tra",
  },
];

export const requiredProcedureDocuments: RequiredProcedureDocument[] = [
  { id: "citizen-id", label: "CCCD/Hộ chiếu", status: "uploaded" },
  { id: "application", label: "Đơn đăng ký", status: "uploaded" },
  {
    id: "lease-contract",
    label: "Hợp đồng thuê địa điểm",
    status: "uploaded",
  },
  { id: "authorization", label: "Văn bản ủy quyền", status: "missing" },
  { id: "license", label: "Chứng chỉ hành nghề", status: "required" },
];

export const processingTimeline: ProcessingTimelineItem[] = [
  {
    id: "read",
    title: "Đọc tệp tải lên",
    icon: "upload_file",
    completedLabel: "Đã nhận diện cấu trúc của các tệp và kiểm tra định dạng.",
    pendingLabel: "Chờ xử lý",
  },
  {
    id: "extract",
    title: "Trích xuất thông tin",
    icon: "progress_activity",
    completedLabel: "Hoàn tất OCR và bóc tách các trường chính từ hồ sơ.",
    pendingLabel: "Chờ AI xử lý",
  },
  {
    id: "rule-check",
    title: "Đối chiếu quy định",
    icon: "rule",
    completedLabel: "Đã đối chiếu với bộ quy tắc hồ sơ hộ kinh doanh hiện hành.",
    pendingLabel: "Chờ xử lý",
  },
  {
    id: "consistency",
    title: "Kiểm tra tính nhất quán",
    icon: "fact_check",
    completedLabel: "Đã so sánh thông tin trên tờ khai với các tệp đính kèm.",
    pendingLabel: "Chờ xử lý",
  },
  {
    id: "summary",
    title: "Tổng hợp lỗi và gợi ý sửa",
    icon: "assignment_turned_in",
    completedLabel: "Kết quả phân tích đã sẵn sàng để bạn xem và chỉnh sửa.",
    pendingLabel: "Chờ xử lý",
  },
];

export const reviewScore = 78;

export const reviewSummaryItems: ReviewSummaryItem[] = [
  {
    id: "identity",
    tone: "success",
    icon: "check_circle",
    text: "Thông tin định danh của chủ hộ và tệp CCCD tải lên đều đọc được rõ ràng, không phát hiện sai lệch lớn.",
  },
  {
    id: "business-name",
    tone: "warning",
    icon: "info",
    text: "Tên hộ kinh doanh hiện tại nên bổ sung yếu tố phân biệt để giảm nguy cơ trùng lặp tại địa phương đăng ký.",
  },
  {
    id: "authorization",
    tone: "error",
    icon: "warning",
    text: "Nếu hồ sơ được nộp thay cho chủ hộ, bạn cần bổ sung văn bản ủy quyền hợp lệ trước khi nộp.",
  },
];

export const reviewFindings: ReviewFinding[] = [
  {
    id: "business-name-duplicate",
    severity: "critical",
    title: "Tên hộ kinh doanh cần bổ sung yếu tố phân biệt",
    affectedField: "Tên hộ kinh doanh",
    sourceField: "businessName",
    extractedValueFallback: "Hộ kinh doanh Thực phẩm Minh An",
    rejectionReason:
      "Tên hiện tại khá phổ biến và có thể bị yêu cầu điều chỉnh nếu trùng hoặc gây nhầm lẫn với hộ kinh doanh đã đăng ký trước đó trên cùng địa bàn.",
    suggestion:
      "Bổ sung yếu tố nhận diện cụ thể như khu vực, nhóm sản phẩm hoặc tên riêng của hộ để tăng khả năng được chấp nhận ngay từ lần nộp đầu tiên.",
    target: {
      route: "/register",
      step: 2,
    },
  },
  {
    id: "business-scope-clarity",
    severity: "warning",
    title: "Mô tả hoạt động kinh doanh nên làm rõ hơn",
    affectedField: "Mô tả hoạt động kinh doanh",
    sourceField: "businessDescription",
    extractedValueFallback:
      "Kinh doanh thực phẩm khô và hàng tiêu dùng tại cửa hàng.",
    rejectionReason:
      "Nội dung mô tả hiện chưa thể hiện rõ phạm vi bán hàng online dù bạn đã chọn kênh bán tại cửa hàng và online.",
    suggestion:
      "Bổ sung thêm thông tin về hình thức bán hàng trực tuyến hoặc giao nhận để phần mô tả đồng nhất với mô hình vận hành dự kiến.",
    target: {
      route: "/register",
      step: 3,
    },
  },
];

export const missingProcedureDocuments: MissingProcedureDocument[] = [
  {
    id: "authorization",
    label: "Giấy ủy quyền (nếu nộp thay)",
    description:
      "Cần bổ sung khi người trực tiếp nộp hồ sơ hoặc làm việc với cơ quan đăng ký không phải là chủ hộ kinh doanh.",
    target: {
      route: "/documents",
    },
  },
];

export const reviewNextActions = [
  {
    id: "edit-form",
    step: 1,
    title: "Sửa lỗi trực tuyến",
    description:
      "Điều chỉnh ngay các trường bị AI gắn cờ trong phần thông tin hộ kinh doanh và mô tả hoạt động.",
  },
  {
    id: "upload-docs",
    step: 2,
    title: "Tải lại tài liệu",
    description:
      "Bổ sung hoặc thay thế các tệp còn thiếu để hồ sơ đủ điều kiện phân tích lại.",
  },
  {
    id: "export-report",
    step: 3,
    title: "Xuất báo cáo AI",
    description:
      "Lưu kết quả này để đối chiếu khi làm việc với đơn vị hỗ trợ hoặc chuyên viên tiếp nhận hồ sơ.",
  },
];
