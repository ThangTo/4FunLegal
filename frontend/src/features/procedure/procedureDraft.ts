export type RegistrationStep = 1 | 2 | 3;

export type ProcedureStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ProcedureDraft = {
  ownerName: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  submittedByProxy: boolean;
  proxyName: string;
  proxyRelationship: string;
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
  requiresPracticeLicense: boolean;
};

export const procedureSteps: Array<{ id: ProcedureStep; title: string }> = [
  { id: 1, title: 'Chủ hộ' },
  { id: 2, title: 'Hộ kinh doanh' },
  { id: 3, title: 'Ngành nghề' },
  { id: 4, title: 'Tài liệu' },
  { id: 5, title: 'Phân tích' },
  { id: 6, title: 'Kết quả' },
  { id: 7, title: 'Nộp' },
];

export const initialProcedureDraft: ProcedureDraft = {
  ownerName: '',
  nationalId: '',
  birthDate: '',
  phone: '',
  email: '',
  address: '',
  submittedByProxy: false,
  proxyName: '',
  proxyRelationship: '',
  businessName: '',
  businessModel: 'Hộ kinh doanh cá thể',
  businessAddress: '',
  startDate: '',
  businessDescription: '',
  householdMembers: '',
  mainIndustry: '',
  subIndustry: '',
  expectedCapital: '',
  laborScale: '',
  salesChannel: '',
  note: '',
  requiresPracticeLicense: false,
};

export const formatPhone = (phone: string) => {
  if (phone.length !== 10) {
    return phone;
  }

  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
};
