import { requiredDocumentCatalog } from './constants';

export type SubmissionStatus =
  | 'draft'
  | 'documents_pending'
  | 'processing'
  | 'needs_fix'
  | 'eligible'
  | 'submitted';

export type SubmissionDocumentType =
  | 'citizen-id'
  | 'application'
  | 'lease-contract'
  | 'authorization'
  | 'practice-license'
  | 'household-member-consent'
  | 'other'
  | 'license';

export type SubmissionResumeTarget = {
  route: '/register' | '/documents' | '/processing' | '/results' | '/submit';
  step?: 1 | 2 | 3;
};

export type SubmissionDraftOwner = {
  ownerName: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  submittedByProxy: boolean;
  proxyName: string;
  proxyRelationship: string;
};

export type SubmissionDraftBusiness = {
  businessName: string;
  businessModel: string;
  businessAddress: string;
  startDate: string;
  businessDescription: string;
  householdMembers: string;
};

export type SubmissionDraftIndustry = {
  mainIndustry: string;
  subIndustry: string;
  expectedCapital: string;
  laborScale: string;
  salesChannel: string;
  note: string;
  requiresPracticeLicense: boolean;
};

export type SubmissionDraftShape = {
  owner: SubmissionDraftOwner;
  business: SubmissionDraftBusiness;
  industry: SubmissionDraftIndustry;
};

type SubmissionLike = SubmissionDraftShape & {
  status: SubmissionStatus;
};

type SubmissionStepValidity = {
  owner: boolean;
  business: boolean;
  industry: boolean;
};

type DocumentChecklistItem = {
  id: (typeof requiredDocumentCatalog)[number]['id'];
  label: string;
  status: 'uploaded' | 'missing_required' | 'missing_optional';
  required: boolean;
  reason?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasText = (value?: string | null) => Boolean(value?.trim());

const digitCount = (value: string) => value.replace(/\D/g, '').length;

const businessModelRequiresHouseholdConsent = (businessModel: string) =>
  businessModel.toLowerCase().includes('thành viên hộ gia đình') ||
  businessModel.toLowerCase().includes('thanh vien ho gia dinh');

const normalizeCapitalValue = (value: string) => value.replace(/[^\d]/g, '');

export const defaultSubmissionDraft: SubmissionDraftShape = {
  owner: {
    ownerName: 'Nguyễn Văn A',
    nationalId: '012345678901',
    birthDate: '1985-05-20',
    phone: '0901234567',
    email: 'nguyenvana@gmail.com',
    address: '123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    submittedByProxy: false,
    proxyName: '',
    proxyRelationship: '',
  },
  business: {
    businessName: 'Hộ kinh doanh Thực phẩm Minh An',
    businessModel: 'Hộ kinh doanh cá thể',
    businessAddress:
      '45 Nguyễn Thái Học, Phường Cầu Ông Lãnh, Quận 1, TP. Hồ Chí Minh',
    startDate: '2026-04-15',
    businessDescription:
      'Kinh doanh thực phẩm khô, đồ gia dụng tiêu dùng nhanh và bán lẻ trực tiếp tại cửa hàng.',
    householdMembers: '01 thành viên hỗ trợ',
  },
  industry: {
    mainIndustry: 'Bán lẻ thực phẩm trong các cửa hàng chuyên doanh',
    subIndustry: 'Bán lẻ hàng tiêu dùng thiết yếu',
    expectedCapital: '300000000',
    laborScale: '3 - 5 lao động',
    salesChannel: 'Tại cửa hàng và online',
    note: 'Dự kiến bổ sung giao hàng nội quận sau 3 tháng hoạt động.',
    requiresPracticeLicense: false,
  },
};

export const createEmptySubmissionDraft = (prefill?: {
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
}): SubmissionDraftShape => ({
  owner: {
    ownerName: prefill?.ownerName?.trim() ?? '',
    nationalId: '',
    birthDate: '',
    phone: prefill?.phone?.trim() ?? '',
    email: prefill?.email?.trim() ?? '',
    address: '',
    submittedByProxy: false,
    proxyName: '',
    proxyRelationship: '',
  },
  business: {
    businessName: '',
    businessModel: 'Hộ kinh doanh cá thể',
    businessAddress: '',
    startDate: '',
    businessDescription: '',
    householdMembers: '',
  },
  industry: {
    mainIndustry: '',
    subIndustry: '',
    expectedCapital: '',
    laborScale: '',
    salesChannel: '',
    note: '',
    requiresPracticeLicense: false,
  },
});

export const mapSubmissionToDraft = (submission: SubmissionDraftShape) => ({
  ...submission.owner,
  ...submission.business,
  ...submission.industry,
});

export const buildSubmissionCode = (index: number) =>
  `HKD-${new Date().getFullYear()}-${String(index).padStart(5, '0')}`;

export const normalizeSubmissionType = (businessModel: string) =>
  businessModel.toLowerCase().includes('doanh nghiệp') ||
  businessModel.toLowerCase().includes('doanh nghiep')
    ? 'business'
    : 'household';

export const normalizeDocumentType = (documentType: SubmissionDocumentType) =>
  documentType === 'license' ? 'practice-license' : documentType;

export const validateOwnerDraft = (owner: SubmissionDraftOwner) => {
  const errors: Record<string, string> = {};

  if (!hasText(owner.ownerName)) {
    errors.ownerName = 'Vui lòng nhập họ và tên chủ hộ.';
  }

  if (digitCount(owner.nationalId) < 9 || digitCount(owner.nationalId) > 12) {
    errors.nationalId = 'Số CCCD/CMND phải có từ 9 đến 12 chữ số.';
  }

  if (!hasText(owner.birthDate)) {
    errors.birthDate = 'Vui lòng chọn ngày sinh.';
  }

  if (digitCount(owner.phone) < 9 || digitCount(owner.phone) > 15) {
    errors.phone = 'Số điện thoại không hợp lệ.';
  }

  if (hasText(owner.email) && !emailPattern.test(owner.email.trim())) {
    errors.email = 'Email không hợp lệ.';
  }

  if (!hasText(owner.address)) {
    errors.address = 'Vui lòng nhập địa chỉ thường trú.';
  }

  if (owner.submittedByProxy) {
    if (!hasText(owner.proxyName)) {
      errors.proxyName = 'Vui lòng nhập họ tên người nộp thay.';
    }

    if (!hasText(owner.proxyRelationship)) {
      errors.proxyRelationship = 'Vui lòng nhập mối quan hệ với chủ hộ.';
    }
  }

  return errors;
};

export const validateBusinessDraft = (business: SubmissionDraftBusiness) => {
  const errors: Record<string, string> = {};

  if (!hasText(business.businessName)) {
    errors.businessName = 'Vui lòng nhập tên hộ kinh doanh.';
  }

  if (!hasText(business.businessModel)) {
    errors.businessModel = 'Vui lòng chọn loại hình.';
  }

  if (!hasText(business.businessAddress)) {
    errors.businessAddress = 'Vui lòng nhập địa điểm kinh doanh.';
  }

  if (!hasText(business.startDate)) {
    errors.startDate = 'Vui lòng chọn ngày bắt đầu hoạt động.';
  }

  if (!hasText(business.businessDescription)) {
    errors.businessDescription = 'Vui lòng mô tả hoạt động kinh doanh.';
  }

  return errors;
};

export const validateIndustryDraft = (industry: SubmissionDraftIndustry) => {
  const errors: Record<string, string> = {};

  if (!hasText(industry.mainIndustry)) {
    errors.mainIndustry = 'Vui lòng chọn ngành nghề chính.';
  }

  if (!hasText(industry.expectedCapital)) {
    errors.expectedCapital = 'Vui lòng nhập vốn dự kiến.';
  } else if (Number(normalizeCapitalValue(industry.expectedCapital)) <= 0) {
    errors.expectedCapital = 'Vốn dự kiến phải lớn hơn 0.';
  }

  if (!hasText(industry.laborScale)) {
    errors.laborScale = 'Vui lòng chọn quy mô lao động.';
  }

  if (!hasText(industry.salesChannel)) {
    errors.salesChannel = 'Vui lòng chọn kênh bán hàng.';
  }

  return errors;
};

export const getSubmissionStepValidity = (
  submission: SubmissionDraftShape,
): SubmissionStepValidity => ({
  owner: Object.keys(validateOwnerDraft(submission.owner)).length === 0,
  business: Object.keys(validateBusinessDraft(submission.business)).length === 0,
  industry: Object.keys(validateIndustryDraft(submission.industry)).length === 0,
});

export const getNextIncompleteRegistrationStep = (
  validity: SubmissionStepValidity,
): 1 | 2 | 3 => {
  if (!validity.owner) {
    return 1;
  }

  if (!validity.business) {
    return 2;
  }

  return 3;
};

export const inferSubmissionCompletion = (validity: SubmissionStepValidity) => {
  if (validity.industry) return 100;
  if (validity.business) return 75;
  if (validity.owner) return 50;
  return 25;
};

export const isHouseholdMemberConsentRequired = (
  business: SubmissionDraftBusiness,
) => businessModelRequiresHouseholdConsent(business.businessModel) && hasText(business.householdMembers);

export const getRequiredDocumentChecklist = (
  submission: SubmissionDraftShape,
  uploadedDocumentTypes: SubmissionDocumentType[],
): DocumentChecklistItem[] => {
  const normalizedUploadedTypes = uploadedDocumentTypes.map(normalizeDocumentType);
  const conditionalReasons: Partial<Record<DocumentChecklistItem['id'], string>> = {
    authorization: submission.owner.submittedByProxy
      ? 'Bắt buộc vì hồ sơ do người nộp thay thực hiện.'
      : 'Chỉ cần khi hồ sơ không do chủ hộ trực tiếp nộp.',
    'practice-license': submission.industry.requiresPracticeLicense
      ? 'Bắt buộc vì ngành nghề này yêu cầu chứng chỉ hành nghề.'
      : 'Chỉ cần khi ngành nghề thuộc nhóm phải có chứng chỉ hành nghề.',
    'household-member-consent': isHouseholdMemberConsentRequired(submission.business)
      ? 'Bắt buộc vì hộ kinh doanh có thành viên hộ gia đình cùng tham gia.'
      : 'Chỉ cần khi có thành viên hộ gia đình cùng tham gia kinh doanh.',
  };

  return requiredDocumentCatalog.map((item) => {
    const required =
      item.id === 'citizen-id' ||
      item.id === 'application' ||
      item.id === 'lease-contract' ||
      (item.id === 'authorization' && submission.owner.submittedByProxy) ||
      (item.id === 'practice-license' && submission.industry.requiresPracticeLicense) ||
      (item.id === 'household-member-consent' &&
        isHouseholdMemberConsentRequired(submission.business));
    const status = normalizedUploadedTypes.includes(item.id)
      ? 'uploaded'
      : required
        ? 'missing_required'
        : 'missing_optional';

    return {
      id: item.id,
      label: item.label,
      status,
      required,
      reason: conditionalReasons[item.id],
    };
  });
};

export const getSubmissionResumeTarget = (
  submission: SubmissionLike,
): SubmissionResumeTarget => {
  const validity = getSubmissionStepValidity(submission);

  if (submission.status === 'processing') {
    return { route: '/processing' };
  }

  if (submission.status === 'submitted') {
    return { route: '/submit' };
  }

  if (submission.status === 'needs_fix' || submission.status === 'eligible') {
    return { route: '/results' };
  }

  if (validity.owner && validity.business && validity.industry) {
    return { route: '/documents' };
  }

  return {
    route: '/register',
    step: getNextIncompleteRegistrationStep(validity),
  };
};
