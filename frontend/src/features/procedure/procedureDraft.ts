export type RegistrationStep = 1 | 2 | 3;

export type ProcedureStep = 1 | 2 | 3 | 4 | 5 | 6;

export type ProcedureDraft = {
  ownerName: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  businessName: string;
  businessModel: string;
  businessAddress: string;
  startDate: string;
  businessDescription: string;
  householdMembers: string;
  mainIndustry: string;
  subIndustry: string;
  expectedCapital: string;
  laborScale: string;
  salesChannel: string;
  note: string;
};

export const procedureSteps: Array<{ id: ProcedureStep; title: string }> = [
  { id: 1, title: "Chủ hộ" },
  { id: 2, title: "Hộ kinh doanh" },
  { id: 3, title: "Ngành nghề" },
  { id: 4, title: "Tài liệu" },
  { id: 5, title: "Phân tích" },
  { id: 6, title: "Kết quả" },
];

export const initialProcedureDraft: ProcedureDraft = {
  ownerName: "Nguyễn Văn A",
  nationalId: "012345678901",
  birthDate: "1985-05-20",
  phone: "0901234567",
  email: "nguyenvana@gmail.com",
  address: "123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
  businessName: "Hộ kinh doanh Thực phẩm Minh An",
  businessModel: "Hộ kinh doanh cá thể",
  businessAddress:
    "45 Nguyễn Thái Học, Phường Cầu Ông Lãnh, Quận 1, TP. Hồ Chí Minh",
  startDate: "2026-04-15",
  businessDescription:
    "Kinh doanh thực phẩm khô, đồ gia dụng tiêu dùng nhanh và bán lẻ trực tiếp tại cửa hàng.",
  householdMembers: "01 thành viên hỗ trợ",
  mainIndustry: "Bán lẻ thực phẩm trong các cửa hàng chuyên doanh",
  subIndustry: "Bán lẻ hàng tiêu dùng thiết yếu",
  expectedCapital: "300000000",
  laborScale: "3 - 5 lao động",
  salesChannel: "Tại cửa hàng và online",
  note: "Dự kiến bổ sung giao hàng nội quận sau 3 tháng hoạt động.",
};

export const formatPhone = (phone: string) => {
  if (phone.length !== 10) {
    return phone;
  }

  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
};
