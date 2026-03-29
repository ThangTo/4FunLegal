import { AssistantThreadModel } from '../models/assistant.model';
import { ContentPageModel } from '../models/content.model';
import { SubmissionFileModel } from '../models/document.model';
import { LibraryDocumentModel } from '../models/library.model';
import { ReviewModel } from '../models/review.model';
import { SubmissionModel } from '../models/submission.model';
import { NewsletterSubscriptionModel } from '../models/subscription.model';
import { UserModel } from '../models/user.model';
import { officialLibraryDocuments } from './library-documents.data';
import { hashPassword } from '../utils/auth-password';
import { landingPageContent, guidePageContent } from '../utils/demo-content';
import {
  buildAssistantWelcome,
  buildReviewResult,
  formatBytesToLabel,
} from '../utils/review-helpers';
import { buildSubmissionCode, defaultSubmissionDraft } from '../utils/submission-helpers';

const legacyDemoLibraryDocuments = [
  {
    slug: 'procedure-household-online',
    title: 'Lộ trình 5 bước đăng ký hộ kinh doanh cá thể năm 2024',
    summary:
      'Cập nhật những thay đổi mới nhất về thông tư quản lý và các ưu đãi thuế cho hộ kinh doanh mới thành lập.',
    category: 'procedure',
    updatedAtLabel: '03/2024',
    tag: 'Mới',
    accent: 'secondary',
    featured: 'hero',
    eyebrow: 'Mới nhất',
    actionKind: 'learn',
    keywords: ['đăng ký', 'hộ kinh doanh', 'lộ trình'],
    relatedConditions: ['household'],
  },
  {
    slug: 'capital-regulation',
    title: 'Quy định về vốn điều lệ và vốn pháp định',
    summary: 'Giải mã những con số quan trọng khi bắt đầu thành lập doanh nghiệp.',
    category: 'terms',
    updatedAtLabel: '15/12/2023',
    tag: 'Giải thích',
    accent: 'secondary',
    featured: 'side',
    actionKind: 'learn',
    keywords: ['vốn', 'pháp định', 'điều lệ'],
    relatedConditions: ['business'],
  },
  {
    slug: 'tnhh-forms',
    title: 'Bộ mẫu biểu chuẩn cho công ty TNHH',
    summary: 'Tải xuống bộ 12 văn bản pháp lý cần thiết được chuyên gia biên soạn.',
    category: 'forms',
    updatedAtLabel: '02/11/2023',
    tag: 'Mẫu biểu',
    accent: 'primary',
    featured: 'side',
    actionKind: 'download',
    keywords: ['mẫu biểu', 'tnhh'],
    relatedConditions: ['business'],
  },
  {
    slug: 'procedure-guide-online',
    title: 'Hướng dẫn đăng ký hộ kinh doanh cá thể qua mạng',
    summary:
      'Chi tiết các bước thao tác trên cổng thông tin quốc gia, các lỗi thường gặp khi nộp hồ sơ online và cách khắc phục nhanh chóng cho người mới bắt đầu.',
    category: 'procedure',
    updatedAtLabel: '12/2023',
    tag: 'Mới',
    accent: 'secondary',
    featured: 'none',
    actionKind: 'learn',
    keywords: ['đăng ký online', 'hộ kinh doanh'],
    relatedConditions: ['household'],
  },
  {
    slug: 'conditional-industries',
    title: 'Danh mục ngành nghề kinh doanh có điều kiện',
    summary:
      'Tra cứu danh sách các ngành nghề yêu cầu vốn pháp định, chứng chỉ hành nghề hoặc giấy phép con trước khi đi vào hoạt động chính thức.',
    category: 'industry',
    updatedAtLabel: '10/2023',
    tag: 'Quan trọng',
    accent: 'warning',
    featured: 'none',
    actionKind: 'learn',
    keywords: ['ngành nghề', 'điều kiện'],
    relatedConditions: ['household', 'business'],
  },
  {
    slug: 'single-member-charter',
    title: 'Mẫu điều lệ công ty TNHH một thành viên',
    summary:
      'Bản thảo điều lệ đầy đủ, tuân thủ Luật Doanh nghiệp 2020, cho phép tùy chỉnh các điều khoản về quản trị và phân chia lợi nhuận.',
    category: 'forms',
    updatedAtLabel: '09/2023',
    tag: 'Mẫu biểu',
    accent: 'primary',
    featured: 'none',
    actionKind: 'download',
    keywords: ['điều lệ', 'tnhh'],
    relatedConditions: ['business'],
  },
  {
    slug: 'faq-authorization',
    title: 'Những trường hợp cần văn bản ủy quyền khi nộp hồ sơ',
    summary:
      'Tổng hợp các tình huống phổ biến khi chủ hộ không trực tiếp nộp hồ sơ và các loại giấy tờ thay thế thường bị nhầm lẫn.',
    category: 'faq',
    updatedAtLabel: '01/2024',
    tag: 'FAQ',
    accent: 'secondary',
    featured: 'none',
    actionKind: 'learn',
    keywords: ['ủy quyền', 'nộp hồ sơ'],
    relatedConditions: ['household'],
  },
] as const;

const demoLibraryDocuments = officialLibraryDocuments;

const baseDocuments = [
  {
    documentType: 'citizen-id',
    label: 'CCCD',
    originalName: 'CCCD_NguyenVanA.jpg',
    storedName: 'seed-cccd.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1_200_000,
    sizeLabel: formatBytesToLabel(1_200_000),
    format: 'JPG',
    fileKind: 'image',
    storagePath: 'uploads/submissions/demo/seed-cccd.jpg',
    publicUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCdPIWeK1KX8ia1hdsHtwhyOyZkp2Ta5wy5hlAmr5q3VmoFtDsR-GjmT5m2p3BQ-EhBaVs9QD7XcLf2NHi5T7Vv7kV929ZCfnve7Zyf5BxdFsgFrO9kVi86Al784MfEkKJ8W9HsQnfLNlt2p-IdRYl1iVOTQ142waDn7BqmVgC-bxQZkNHuRWo4M044b7881L1nykh80Ph6ZiS3qHfyXTYTtGKNDwiXao4vVNELPYk2novPC9frAfVsZkpWPZClYQ8iOaUaEttjssPw',
    ocrStatus: 'completed',
    validationStatus: 'verified',
  },
  {
    documentType: 'application',
    label: 'Đơn đăng ký',
    originalName: 'Don_dang_ky.pdf',
    storedName: 'seed-don.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 450_000,
    sizeLabel: formatBytesToLabel(450_000),
    format: 'PDF',
    fileKind: 'doc',
    storagePath: 'uploads/submissions/demo/seed-don.pdf',
    publicUrl: '/uploads/submissions/demo/seed-don.pdf',
    ocrStatus: 'processing',
    validationStatus: 'uploaded',
  },
  {
    documentType: 'lease-contract',
    label: 'Hợp đồng thuê địa điểm',
    originalName: 'Hop_dong_thue_nha.docx',
    storedName: 'seed-hop-dong.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 2_800_000,
    sizeLabel: formatBytesToLabel(2_800_000),
    format: 'DOCX',
    fileKind: 'doc',
    storagePath: 'uploads/submissions/demo/seed-hop-dong.docx',
    publicUrl: '/uploads/submissions/demo/seed-hop-dong.docx',
    ocrStatus: 'completed',
    validationStatus: 'verified',
  },
] as const;

export const seedDemoData = async () => {
  const shouldSeedDemoData =
    process.env.SEED_DEMO_DATA === 'true' ||
    (typeof process.env.SEED_DEMO_DATA === 'undefined' &&
      process.env.NODE_ENV !== 'production');

  if (!shouldSeedDemoData) {
    return;
  }

  const [demoUserPasswordHash, adminPasswordHash] = await Promise.all([
    hashPassword('User@123456'),
    hashPassword('Admin@123456'),
  ]);

  const user = await UserModel.findOneAndUpdate(
    { email: 'nguyenvana@gmail.com' },
    {
      fullName: 'Nguyễn Văn A',
      email: 'nguyenvana@gmail.com',
      phone: '0901234567',
      status: 'active',
      role: 'user',
      passwordHash: demoUserPasswordHash,
      googleSub: undefined,
      avatarUrl: null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await UserModel.findOneAndUpdate(
    { email: 'admin@legalfactcheck.local' },
    {
      fullName: 'System Admin',
      email: 'admin@legalfactcheck.local',
      phone: '0909999999',
      status: 'active',
      role: 'admin',
      passwordHash: adminPasswordHash,
      googleSub: undefined,
      avatarUrl: null,
      defaultSubmissionId: null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await ContentPageModel.findOneAndUpdate(
    { slug: 'landing' },
    { slug: 'landing', title: 'Trang chủ', payload: landingPageContent, version: 1 },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await ContentPageModel.findOneAndUpdate(
    { slug: 'guide' },
    { slug: 'guide', title: 'Hướng dẫn chuẩn bị hồ sơ', payload: guidePageContent, version: 1 },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await LibraryDocumentModel.deleteMany({
    slug: {
      $nin: demoLibraryDocuments.map((item) => item.slug),
    },
  });

  for (const [index, item] of demoLibraryDocuments.entries()) {
    await LibraryDocumentModel.findOneAndUpdate(
      { slug: item.slug },
      { ...item, updatedAt: new Date(Date.now() - (index + 1) * 86_400_000) },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  await UserModel.findByIdAndUpdate(user._id, {
    defaultSubmissionId: null,
  });

  if (process.env.SEED_SAMPLE_SUBMISSIONS !== 'true') {
    return;
  }

  const submissions = [
    {
      submissionCode: buildSubmissionCode(1),
      status: 'needs_fix',
      currentStep: 6,
      completionPercent: 100,
      owner: defaultSubmissionDraft.owner,
      business: {
        ...defaultSubmissionDraft.business,
        businessName: 'Hộ kinh doanh Global Tech',
      },
      industry: defaultSubmissionDraft.industry,
    },
    {
      submissionCode: buildSubmissionCode(2),
      status: 'eligible',
      currentStep: 6,
      completionPercent: 100,
      owner: defaultSubmissionDraft.owner,
      business: {
        ...defaultSubmissionDraft.business,
        businessName: 'Cửa hàng Phở Việt',
      },
      industry: {
        ...defaultSubmissionDraft.industry,
        mainIndustry: 'Dịch vụ ăn uống phục vụ lưu động',
      },
    },
    {
      submissionCode: buildSubmissionCode(3),
      status: 'processing',
      currentStep: 5,
      completionPercent: 100,
      owner: defaultSubmissionDraft.owner,
      business: {
        ...defaultSubmissionDraft.business,
        businessName: 'Xưởng May Hà Nội',
        businessModel: 'Doanh nghiệp tư nhân',
      },
      industry: {
        ...defaultSubmissionDraft.industry,
        mainIndustry: 'May mặc và gia công sản phẩm dệt',
      },
    },
    {
      submissionCode: buildSubmissionCode(4),
      status: 'documents_pending',
      currentStep: 4,
      completionPercent: 100,
      owner: defaultSubmissionDraft.owner,
      business: {
        ...defaultSubmissionDraft.business,
        businessName: 'Tiệm Bánh Minh Châu',
      },
      industry: defaultSubmissionDraft.industry,
    },
  ] as const;

  const seededSubmissions = [];

  for (const item of submissions) {
    const submission = await SubmissionModel.findOneAndUpdate(
      { submissionCode: item.submissionCode },
      { ...item, userId: user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    seededSubmissions.push(submission);
  }

  const defaultSubmission = seededSubmissions[0];

  for (const submission of seededSubmissions.slice(0, 3)) {
    for (const document of baseDocuments) {
      await SubmissionFileModel.findOneAndUpdate(
        { submissionId: submission._id, originalName: document.originalName },
        { ...document, submissionId: submission._id, userId: user._id },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    }
  }

  await SubmissionFileModel.findOneAndUpdate(
    { submissionId: seededSubmissions[1]._id, documentType: 'authorization' },
    {
      submissionId: seededSubmissions[1]._id,
      userId: user._id,
      documentType: 'authorization',
      label: 'Giấy ủy quyền',
      originalName: 'Giay_uy_quyen.pdf',
      storedName: 'seed-uy-quyen.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 240_000,
      sizeLabel: formatBytesToLabel(240_000),
      format: 'PDF',
      fileKind: 'doc',
      storagePath: 'uploads/submissions/demo/seed-uy-quyen.pdf',
      publicUrl: '/uploads/submissions/demo/seed-uy-quyen.pdf',
      ocrStatus: 'completed',
      validationStatus: 'verified',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const needsFixDocuments = await SubmissionFileModel.find({
    submissionId: defaultSubmission._id,
    userId: user._id,
  });
  const eligibleDocuments = await SubmissionFileModel.find({
    submissionId: seededSubmissions[1]._id,
    userId: user._id,
  });

  const needsFixResult = buildReviewResult(
    defaultSubmission,
    needsFixDocuments.map((item) => item.documentType),
  );

  const eligibleResult = buildReviewResult(
    seededSubmissions[1],
    eligibleDocuments.map((item) => item.documentType),
  );

  eligibleResult.missingDocuments = [];
  eligibleResult.findings = [];
  eligibleResult.statusBanner = {
    tone: 'success',
    title: 'Đủ điều kiện sơ bộ',
    description:
      'Hồ sơ đã vượt qua kiểm tra sơ bộ và có thể chuyển sang bước nộp chính thức sau khi bạn rà soát lại lần cuối.',
    score: 91,
    scoreLabel: 'Khả năng cao sẽ được duyệt',
  };

  const needsFixReview = await ReviewModel.findOneAndUpdate(
    { submissionId: defaultSubmission._id, userId: user._id },
    {
      submissionId: defaultSubmission._id,
      userId: user._id,
      status: 'completed',
      timeline: [],
      etaSeconds: 0,
      result: needsFixResult,
      startedAt: new Date(Date.now() - 10 * 60_000),
      completedAt: new Date(Date.now() - 8 * 60_000),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const eligibleReview = await ReviewModel.findOneAndUpdate(
    { submissionId: seededSubmissions[1]._id, userId: user._id },
    {
      submissionId: seededSubmissions[1]._id,
      userId: user._id,
      status: 'completed',
      timeline: [],
      etaSeconds: 0,
      result: eligibleResult,
      startedAt: new Date(Date.now() - 20 * 60_000),
      completedAt: new Date(Date.now() - 18 * 60_000),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const processingReview = await ReviewModel.findOneAndUpdate(
    { submissionId: seededSubmissions[2]._id, userId: user._id },
    {
      submissionId: seededSubmissions[2]._id,
      userId: user._id,
      status: 'processing',
      timeline: [],
      etaSeconds: 120,
      result: null,
      startedAt: new Date(Date.now() - 2_000),
      completedAt: null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await SubmissionModel.findByIdAndUpdate(defaultSubmission._id, {
    latestReviewId: needsFixReview._id,
  });
  await SubmissionModel.findByIdAndUpdate(seededSubmissions[1]._id, {
    latestReviewId: eligibleReview._id,
  });
  await SubmissionModel.findByIdAndUpdate(seededSubmissions[2]._id, {
    latestReviewId: processingReview._id,
  });

  await AssistantThreadModel.findOneAndUpdate(
    { submissionId: defaultSubmission._id, userId: user._id },
    {
      submissionId: defaultSubmission._id,
      userId: user._id,
      messages: [buildAssistantWelcome(defaultSubmission.business.businessName)],
      suggestedPrompts: [
        'Hồ sơ của tôi còn thiếu gì?',
        'Tên hộ kinh doanh này có phù hợp không?',
        'Tôi cần sửa mục nào trước?',
      ],
      references: needsFixResult.references,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await NewsletterSubscriptionModel.deleteMany({ source: 'demo-cleanup' });

  await UserModel.findByIdAndUpdate(user._id, {
    defaultSubmissionId: String(defaultSubmission._id),
  });
};
