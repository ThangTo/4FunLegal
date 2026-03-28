export const procedureStepTitles = [
  { id: 1, title: 'Chủ hộ' },
  { id: 2, title: 'Hộ kinh doanh' },
  { id: 3, title: 'Ngành nghề' },
  { id: 4, title: 'Tài liệu' },
  { id: 5, title: 'Phân tích' },
  { id: 6, title: 'Kết quả' },
] as const;

export const requiredDocumentCatalog = [
  { id: 'citizen-id', label: 'CCCD/Hộ chiếu' },
  { id: 'application', label: 'Đơn đăng ký' },
  { id: 'lease-contract', label: 'Hợp đồng thuê địa điểm' },
  { id: 'authorization', label: 'Văn bản ủy quyền' },
  { id: 'practice-license', label: 'Chứng chỉ hành nghề' },
  { id: 'household-member-consent', label: 'Biên bản họp thành viên hộ gia đình' },
] as const;

export const processingTimelineTemplate = [
  {
    id: 'read',
    title: 'Đọc tệp tải lên',
    icon: 'upload_file',
    completedLabel: 'Đã nhận diện cấu trúc của các tệp và kiểm tra định dạng.',
    pendingLabel: 'Chờ xử lý',
  },
  {
    id: 'extract',
    title: 'Trích xuất thông tin',
    icon: 'progress_activity',
    completedLabel: 'Hoàn tất OCR và bóc tách các trường chính từ hồ sơ.',
    pendingLabel: 'Chờ AI xử lý',
  },
  {
    id: 'rule-check',
    title: 'Đối chiếu quy định',
    icon: 'rule',
    completedLabel: 'Đã đối chiếu với bộ quy tắc hồ sơ hộ kinh doanh hiện hành.',
    pendingLabel: 'Chờ xử lý',
  },
  {
    id: 'consistency',
    title: 'Kiểm tra tính nhất quán',
    icon: 'fact_check',
    completedLabel: 'Đã so sánh thông tin trên tờ khai với các tệp đính kèm.',
    pendingLabel: 'Chờ xử lý',
  },
  {
    id: 'summary',
    title: 'Tổng hợp lỗi và gợi ý sửa',
    icon: 'assignment_turned_in',
    completedLabel: 'Kết quả phân tích đã sẵn sàng để bạn xem và chỉnh sửa.',
    pendingLabel: 'Chờ xử lý',
  },
] as const;

export const defaultSuggestedPrompts = [
  'Hồ sơ của tôi còn thiếu gì?',
  'Tên hộ kinh doanh này có phù hợp không?',
  'Tôi cần sửa mục nào trước?',
] as const;
