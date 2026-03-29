import { LibraryDocumentModel } from '../models/library.model';
import { SubmissionModel } from '../models/submission.model';
import { AppError } from '../utils/app-error';

const categoryMeta = [
  { id: 'procedure', label: 'Hướng dẫn thủ tục' },
  { id: 'forms', label: 'Mẫu biểu chính thức' },
  { id: 'terms', label: 'Giải thích thuật ngữ' },
  { id: 'faq', label: 'Câu hỏi thường gặp' },
  { id: 'industry', label: 'Văn bản pháp lý' },
] as const;

export const libraryService = {
  async getCategories() {
    return categoryMeta;
  },

  async getFeatured() {
    const [hero, side] = await Promise.all([
      LibraryDocumentModel.findOne({ featured: 'hero' }).lean(),
      LibraryDocumentModel.find({ featured: 'side' }).sort({ updatedAt: -1 }).limit(2).lean(),
    ]);

    return {
      hero,
      side,
    };
  },

  async listDocuments(query: {
    category?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(12, query.limit ?? 3));
    const filter: Record<string, unknown> = { featured: 'none' };

    if (query.category && query.category !== 'all') {
      filter.category = query.category;
    }

    if (query.q?.trim()) {
      const normalizedQuery = query.q.trim();
      filter.$or = [
        { title: { $regex: normalizedQuery, $options: 'i' } },
        { summary: { $regex: normalizedQuery, $options: 'i' } },
        { keywords: { $elemMatch: { $regex: normalizedQuery, $options: 'i' } } },
        { documentNumber: { $regex: normalizedQuery, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      LibraryDocumentModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LibraryDocumentModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async getDocumentDetail(slug: string) {
    const document = await LibraryDocumentModel.findOne({ slug }).lean();

    if (!document) {
      throw new AppError('Library document not found', 404, 'LIBRARY_DOCUMENT_NOT_FOUND');
    }

    return document;
  },

  async getRelated(submissionId?: string, userId?: string) {
    const resources = [
      {
        id: 'related-name',
        title: 'Kiểm tra tên hộ kinh doanh trước khi nộp',
        description: 'Đối chiếu lại cách đặt tên để tránh bị yêu cầu sửa hồ sơ ở vòng đầu.',
        border: 'border-brand-primary',
      },
      {
        id: 'related-form',
        title: 'Mẫu giấy đề nghị đăng ký hộ kinh doanh',
        description: 'Mở nhanh biểu mẫu chính thức để soát lại trường thông tin trước khi tải lên.',
        border: 'border-brand-secondary',
      },
      {
        id: 'related-legal',
        title: 'Văn bản pháp lý hiện hành cho hộ kinh doanh',
        description: 'Tập hợp các nguồn chính thức cần đối chiếu khi chuẩn bị hồ sơ hoặc giải trình.',
        border: 'border-state-warning',
      },
    ];

    if (!submissionId || !userId) {
      return resources;
    }

    const submission = await SubmissionModel.findOne({ _id: submissionId, userId });

    if (!submission) {
      return resources;
    }

    return resources.map((item) =>
      item.id === 'related-legal'
        ? {
            ...item,
            description: `Đối chiếu nguồn chính thức đang phù hợp với hồ sơ "${submission.business.businessName}".`,
          }
        : item,
    );
  },
};
