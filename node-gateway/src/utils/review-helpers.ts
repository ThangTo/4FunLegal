import { defaultSuggestedPrompts, processingTimelineTemplate } from './constants';
import {
  getRequiredDocumentChecklist,
  SubmissionDocumentType,
  SubmissionDraftShape,
} from './submission-helpers';

type UploadedDocumentInfo = {
  id?: string;
  label: string;
  originalName?: string;
  name?: string;
  sizeLabel?: string;
  size?: string;
  format?: string;
  fileKind?: 'image' | 'doc';
  type?: 'image' | 'doc';
  publicUrl?: string;
  preview?: string;
  documentType?: SubmissionDocumentType;
  semanticStatus?:
    | 'pending'
    | 'checklist_only'
    | 'matched'
    | 'mismatch'
    | 'insufficient_evidence'
    | 'possible_type_mismatch';
  semanticStatusLabel?: string | null;
  extractionConfidence?: 'low' | 'medium' | 'high' | null;
  semanticIssues?: Array<Record<string, unknown>>;
};

const reviewDurationsMs = [0, 1500, 3000, 4500, 6000];

const normalizeText = (value: string) => value.trim().toLowerCase();

const mentionsOnlineChannel = (description: string) => {
  const normalizedDescription = normalizeText(description);
  return (
    normalizedDescription.includes('online') ||
    normalizedDescription.includes('trực tuyến') ||
    normalizedDescription.includes('truc tuyen') ||
    normalizedDescription.includes('giao hàng') ||
    normalizedDescription.includes('giao hang')
  );
};

const looksLikeDistinctBusinessName = (businessName: string) =>
  businessName.trim().length >= 18 && businessName.trim().split(/\s+/).length >= 4;

export const inferDocumentTypeFromName = (fileName: string) => {
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes('cccd') || lowerName.includes('cmnd') || lowerName.includes('passport')) {
    return 'citizen-id';
  }

  if (lowerName.includes('don') || lowerName.includes('application')) {
    return 'application';
  }

  if (lowerName.includes('hop_dong') || lowerName.includes('hop-dong') || lowerName.includes('lease')) {
    return 'lease-contract';
  }

  if (lowerName.includes('uy_quyen') || lowerName.includes('authorization')) {
    return 'authorization';
  }

  if (lowerName.includes('chung_chi') || lowerName.includes('license')) {
    return 'practice-license';
  }

  if (
    lowerName.includes('bien_ban') ||
    lowerName.includes('household-member') ||
    lowerName.includes('thanh_vien')
  ) {
    return 'household-member-consent';
  }

  return 'other';
};

export const inferDocumentLabel = (documentType: SubmissionDocumentType) => {
  const labelMap: Record<SubmissionDocumentType, string> = {
    'citizen-id': 'CCCD',
    application: 'Đơn đăng ký',
    'lease-contract': 'Hợp đồng thuê địa điểm',
    authorization: 'Giấy ủy quyền',
    'practice-license': 'Chứng chỉ hành nghề',
    'household-member-consent': 'Biên bản họp thành viên hộ gia đình',
    license: 'Chứng chỉ hành nghề',
    other: 'Tài liệu bổ sung',
  };

  return labelMap[documentType] ?? 'Tài liệu bổ sung';
};

export const inferFileKind = (mimeType: string) =>
  mimeType.startsWith('image/') ? 'image' : 'doc';

export const formatBytesToLabel = (size: number) => {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const getReviewProgressStage = (startedAt: Date) => {
  const elapsed = Date.now() - startedAt.getTime();
  let currentStage = 1;

  reviewDurationsMs.forEach((threshold, index) => {
    if (elapsed >= threshold) {
      currentStage = index + 1;
    }
  });

  return Math.min(currentStage, processingTimelineTemplate.length);
};

export const isReviewComplete = (startedAt: Date) =>
  Date.now() - startedAt.getTime() >= reviewDurationsMs[reviewDurationsMs.length - 1];

export const buildProcessingSummary = (
  uploadedFiles: UploadedDocumentInfo[],
  ownerName: string,
) => ({
  ownerName,
  files: uploadedFiles,
  tips: [
    'AI ưu tiên đối chiếu tên hộ kinh doanh, địa chỉ, người nộp hồ sơ và nhóm tài liệu điều kiện trước khi kết luận.',
  ],
});

export const buildReviewResult = (
  submission: SubmissionDraftShape,
  uploadedDocumentTypes: SubmissionDocumentType[],
) => {
  const checklist = getRequiredDocumentChecklist(submission, uploadedDocumentTypes);
  const missingDocuments = checklist
    .filter((item) => item.status === 'missing_required')
    .map((item) => ({
      id: item.id,
      label: item.label,
      description:
        item.reason ?? `Cần bổ sung ${item.label.toLowerCase()} trước khi phân tích lại.`,
      target: {
        route: '/documents' as const,
      },
    }));

  const findings: Array<{
    id: string;
    severity: 'critical' | 'warning';
    title: string;
    affectedField: string;
    extractedValue: string;
    rejectionReason: string;
    suggestion: string;
    target: { route: '/register'; step: 2 | 3 } | { route: '/documents' };
  }> = [];

  if (!looksLikeDistinctBusinessName(submission.business.businessName)) {
    findings.push({
      id: 'business-name-duplicate',
      severity: 'critical',
      title: 'Tên hộ kinh doanh cần rõ yếu tố phân biệt',
      affectedField: 'Tên hộ kinh doanh',
      extractedValue: submission.business.businessName,
      rejectionReason:
        'Tên hiện tại quá ngắn hoặc chưa đủ yếu tố nhận diện, dễ bị yêu cầu điều chỉnh khi đối chiếu với hồ sơ cùng địa bàn.',
      suggestion:
        'Bổ sung thêm nhóm sản phẩm, khu vực hoặc tên riêng để tăng khả năng được chấp nhận ngay từ lần nộp đầu.',
      target: {
        route: '/register',
        step: 2,
      },
    });
  }

  if (
    normalizeText(submission.industry.salesChannel).includes('online') &&
    !mentionsOnlineChannel(submission.business.businessDescription)
  ) {
    findings.push({
      id: 'business-scope-clarity',
      severity: 'warning',
      title: 'Mô tả hoạt động kinh doanh chưa khớp kênh bán hàng',
      affectedField: 'Mô tả hoạt động kinh doanh',
      extractedValue: submission.business.businessDescription,
      rejectionReason:
        'Bạn đã chọn kênh bán hàng online nhưng phần mô tả chưa thể hiện rõ hoạt động trực tuyến hoặc giao nhận.',
      suggestion:
        'Bổ sung thông tin về bán hàng online, giao nhận hoặc kênh phân phối trực tuyến để hồ sơ nhất quán hơn.',
      target: {
        route: '/register',
        step: 3,
      },
    });
  }

  const issueScorePenalty = findings.length * 8 + missingDocuments.length * 6;
  const reviewScore = Math.max(62, 94 - issueScorePenalty);
  const hasBlockingIssues = missingDocuments.length > 0 || findings.length > 0;

  const summaryItems = [
    {
      id: 'identity',
      tone: 'success' as const,
      icon: 'check_circle',
      text: 'Thông tin chủ hộ và bộ tài liệu đã được đọc thành công, sẵn sàng cho bước rà soát quy tắc hồ sơ.',
    },
    hasBlockingIssues
      ? {
          id: 'blocking',
          tone: 'warning' as const,
          icon: 'info',
          text: `Hệ thống phát hiện ${findings.length} điểm cần chỉnh sửa và ${missingDocuments.length} nhóm tài liệu bắt buộc còn thiếu.`,
        }
      : {
          id: 'ready',
          tone: 'success' as const,
          icon: 'verified',
          text: 'Hồ sơ đã vượt qua kiểm tra sơ bộ và chưa phát hiện điểm bất nhất đáng kể.',
        },
  ];

  return {
    statusBanner: {
      tone: hasBlockingIssues ? 'warning' : 'success',
      title: hasBlockingIssues ? 'Cần sửa trước khi nộp' : 'Đủ điều kiện sơ bộ',
      description: hasBlockingIssues
        ? 'AI đã hoàn tất phân tích và phát hiện một số điểm cần xử lý thêm để hồ sơ nhất quán và đầy đủ hơn.'
        : 'Hồ sơ đã vượt qua kiểm tra sơ bộ và có thể tiếp tục dùng làm bộ hồ sơ tham chiếu trước khi nộp chính thức.',
      score: reviewScore,
      scoreLabel: hasBlockingIssues
        ? 'Nên chỉnh sửa trước khi gửi hồ sơ'
        : 'Khả năng cao sẽ được tiếp nhận',
    },
    summaryItems,
    findings,
    missingDocuments,
    documentChecks: [],
    fieldComparisons: [],
    nextActions: hasBlockingIssues
      ? [
          {
            id: 'edit-form',
            step: 1,
            title: 'Sửa thông tin kê khai',
            description: 'Điều chỉnh các trường bị gắn cờ để hồ sơ nhất quán hơn.',
          },
          {
            id: 'upload-docs',
            step: 2,
            title: 'Bổ sung tài liệu còn thiếu',
            description: 'Tải lên đủ giấy tờ bắt buộc và phân loại đúng nhóm tài liệu.',
          },
          {
            id: 'rerun',
            step: 3,
            title: 'Phân tích lại',
            description: 'Sau khi cập nhật hồ sơ, chạy lại AI để lấy kết quả mới nhất.',
          },
        ]
      : [
          {
            id: 'save-report',
            step: 1,
            title: 'Lưu báo cáo AI',
            description: 'Giữ báo cáo này để đối chiếu khi hoàn thiện bộ hồ sơ chính thức.',
          },
          {
            id: 'review-docs',
            step: 2,
            title: 'Rà soát lần cuối',
            description: 'Kiểm tra lại chữ ký, thông tin nhận diện và nhóm tài liệu điều kiện.',
          },
          {
            id: 'follow-history',
            step: 3,
            title: 'Theo dõi tại lịch sử',
            description: 'Quản lý các bộ hồ sơ đã tạo và tiếp tục chỉnh sửa nếu có thay đổi.',
          },
        ],
    references: ['Nghị định 01/2021/NĐ-CP', 'Luật Doanh nghiệp 2020'],
    legalBasis: ['Nghị định 01/2021/NĐ-CP', 'Luật Doanh nghiệp 2020'],
  };
};

export const buildAssistantWelcome = (businessName: string) => ({
  id: 'assistant-welcome',
  role: 'assistant',
  paragraphs: [
    `Chào bạn, tôi đang theo dõi hồ sơ "${businessName}" và có thể giúp bạn rà từng lỗi trước khi phân tích lại.`,
    'Bạn muốn tôi hướng dẫn sửa thông tin kê khai hay kiểm tra bộ tài liệu trước?',
  ],
  references: ['Nghị định 01/2021/NĐ-CP', 'Luật Doanh nghiệp 2020'],
  actions: [
    {
      label: 'Mở phần kê khai',
      icon: 'edit_note',
      tone: 'primary',
      route: '/register',
      step: 2,
    },
    {
      label: 'Xem kết quả hiện tại',
      icon: 'assignment',
      tone: 'outline',
      route: '/results',
    },
  ],
});

export const buildAssistantReply = (
  message: string,
  submission: SubmissionDraftShape,
  missingDocumentCount: number,
  findingCount: number,
) => {
  const normalizedMessage = normalizeText(message);

  if (normalizedMessage.includes('thiếu') || normalizedMessage.includes('tài liệu')) {
    return {
      paragraphs: [
        `Hiện tại hồ sơ "${submission.business.businessName}" còn ${missingDocumentCount} nhóm tài liệu bắt buộc cần rà soát.`,
        'Bạn nên kiểm tra lại đúng loại giấy tờ đã gán cho từng file và bổ sung ngay các mục còn thiếu trước khi phân tích lại.',
      ],
      references: ['Nghị định 01/2021/NĐ-CP'],
      actions: [
        {
          label: 'Mở tài liệu',
          icon: 'upload_file',
          tone: 'primary',
          route: '/documents',
        },
        {
          label: 'Xem kết quả',
          icon: 'assignment',
          tone: 'outline',
          route: '/results',
        },
      ],
    };
  }

  if (normalizedMessage.includes('tên')) {
    return {
      paragraphs: [
        `Tên hiện tại "${submission.business.businessName}" sẽ an toàn hơn nếu có thêm yếu tố nhận diện cụ thể như khu vực hoặc nhóm sản phẩm.`,
        'Bạn nên giữ cấu trúc “Hộ kinh doanh + tên riêng/nhóm hàng + khu vực” để giảm nguy cơ bị yêu cầu sửa đổi.',
      ],
      references: ['Nghị định 01/2021/NĐ-CP'],
      actions: [
        {
          label: 'Sửa tên hộ kinh doanh',
          icon: 'edit_note',
          tone: 'primary',
          route: '/register',
          step: 2,
        },
      ],
    };
  }

  return {
    paragraphs: [
      `Tôi đang theo dõi hồ sơ "${submission.business.businessName}".`,
      `Hiện có ${findingCount} điểm cần lưu ý trong phần kê khai và ${missingDocumentCount} nhóm tài liệu cần kiểm tra thêm. Bạn có thể hỏi cụ thể về từng mục để tôi hướng dẫn nhanh hơn.`,
    ],
    references: ['Luật Doanh nghiệp 2020'],
    actions: [],
  };
};

export const buildAssistantSessionContext = (
  submission: SubmissionDraftShape & { submissionCode: string },
  uploadedFiles: UploadedDocumentInfo[],
  findings: Array<{ id: string; title: string }>,
) => ({
  suggestedPrompts: [...defaultSuggestedPrompts],
  context: {
    submission: {
      businessName: submission.business.businessName,
      submissionCode: submission.submissionCode,
    },
    errorSummary: {
      count: findings.length,
      items: findings,
    },
    relatedDocuments: uploadedFiles.slice(0, 3),
    documentIssues: uploadedFiles
      .filter((file) =>
        file.semanticStatus &&
        ['mismatch', 'insufficient_evidence', 'possible_type_mismatch'].includes(
          file.semanticStatus,
        ),
      )
      .map((file) => ({
        id: file.id ?? file.name ?? file.label,
        title: file.label,
        semanticStatus: file.semanticStatus!,
        semanticStatusLabel: file.semanticStatusLabel ?? 'Cần kiểm tra thêm',
        extractionConfidence: file.extractionConfidence ?? null,
      })),
    references: ['Nghị định 01/2021/NĐ-CP', 'Luật Doanh nghiệp 2020'],
  },
});
