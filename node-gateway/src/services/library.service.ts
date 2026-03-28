import { LibraryDocumentModel } from '../models/library.model';
import { SubmissionModel } from '../models/submission.model';

const categoryMeta = [
  { id: 'procedure', label: 'Hướng dẫn thủ tục' },
  { id: 'forms', label: 'Mẫu biểu' },
  { id: 'terms', label: 'Giải thích thuật ngữ' },
  { id: 'faq', label: 'Câu hỏi thường gặp' },
  { id: 'industry', label: 'Ngành nghề kinh doanh' },
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

  async getRelated(submissionId?: string, userId?: string) {
    const resources = [
      {
        id: 'related-name',
        title: 'Cách đặt tên doanh nghiệp không bị trùng',
        description: 'Tránh bị từ chối hồ sơ vì tên gây nhầm lẫn lần đầu.',
        border: 'border-brand-primary',
      },
      {
        id: 'related-authorization',
        title: 'Hồ sơ ủy quyền cho người đại diện',
        description: 'Mẫu văn bản ủy quyền hợp lệ theo quy định hiện hành.',
        border: 'border-brand-secondary',
      },
      {
        id: 'related-industry',
        title: 'Thủ tục đăng ký con dấu pháp nhân',
        description:
          'Sau khi có giấy chứng nhận đăng ký kinh doanh, bạn có thể cần thủ tục bổ sung tùy mô hình.',
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
      item.id === 'related-industry'
        ? {
            ...item,
            description: `Sau khi có giấy chứng nhận đăng ký kinh doanh cho "${submission.business.businessName}".`,
          }
        : item,
    );
  },
};
