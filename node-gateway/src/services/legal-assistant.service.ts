import { AppError } from '../utils/app-error';
import { aiService } from './ai.service';
import { libraryService } from './library.service';

type LegalAssistantAvailability = {
  available: boolean;
  degraded: boolean;
  serviceMode: string;
  neo4jReady: boolean;
  chromaReady: boolean;
  geminiConfigured: boolean;
  reason: string | null;
};

type LegalAssistantHistoryItem = {
  role: 'user' | 'assistant' | 'system';
  paragraphs: string[];
};

type LegalAssistantContext = {
  documentTitle?: string;
  documentSummary?: string;
  documentSlug?: string;
  sourceName?: string;
  sourceUrl?: string;
  documentNumber?: string;
  highlights?: string[];
  roadmap?: Array<Record<string, unknown>>;
  officialLinks?: Array<Record<string, unknown>>;
};

const defaultSuggestedPrompts = [
  'Điều kiện đăng ký hộ kinh doanh gồm những gì?',
  'Tên hộ kinh doanh cần lưu ý điểm nào?',
  'Các giấy tờ nào thường phải chuẩn bị trước?',
];

const buildWelcomeMessages = (availability: LegalAssistantAvailability) => {
  const baseParagraphs = [
    'Tôi có thể hỗ trợ tra cứu quy định, giải thích điều kiện pháp lý và gợi ý căn cứ liên quan đến đăng ký kinh doanh.',
    availability.degraded
      ? 'Hiện dịch vụ đang chạy ở chế độ dự phòng nên câu trả lời phù hợp để định hướng nhanh, chưa thay thế tư vấn pháp lý đầy đủ.'
      : 'Bạn có thể hỏi về điều kiện đăng ký, tên hộ kinh doanh, bộ hồ sơ hoặc căn cứ pháp lý cụ thể.',
  ];

  if (!availability.available) {
    return [
      {
        id: 'support-welcome-unavailable',
        role: 'assistant' as const,
        paragraphs: [
          'Kho tri thức pháp lý AI hiện chưa sẵn sàng.',
          availability.reason ||
            'Bạn có thể thử lại sau khi dịch vụ GraphRAG và knowledge base đã được khởi động đầy đủ.',
        ],
        references: [] as string[],
      },
    ];
  }

  return [
    {
      id: 'support-welcome',
      role: 'assistant' as const,
      paragraphs: baseParagraphs,
      references: ['Luật Doanh nghiệp 2020'],
    },
  ];
};

const splitAnswerIntoParagraphs = (answer: string) =>
  answer
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildAvailabilityFromHealth = (
  health: Awaited<ReturnType<typeof aiService.getHealth>>,
): LegalAssistantAvailability => {
  const degraded =
    health.serviceMode === 'deterministic' ||
    !health.neo4jReady ||
    !health.chromaReady ||
    !health.geminiConfigured;

  const available =
    health.status === 'OK' &&
    (health.legalQaReady ||
      health.serviceMode === 'deterministic');

  return {
    available,
    degraded: available && degraded,
    serviceMode: health.serviceMode,
    neo4jReady: health.neo4jReady,
    chromaReady: health.chromaReady,
    geminiConfigured: health.geminiConfigured,
    reason: available
      ? health.serviceMode === 'deterministic'
        ? 'Dịch vụ đang chạy ở chế độ dự phòng.'
        : null
      : 'Knowledge base GraphRAG chưa sẵn sàng.',
  };
};

const buildUnavailableAvailability = (message: string): LegalAssistantAvailability => ({
  available: false,
  degraded: false,
  serviceMode: 'unreachable',
  neo4jReady: false,
  chromaReady: false,
  geminiConfigured: false,
  reason: message,
});

export const legalAssistantService = {
  async getSession() {
    const availability = await aiService
      .getHealth()
      .then((health) => buildAvailabilityFromHealth(health))
      .catch((error) =>
        buildUnavailableAvailability(
          error instanceof Error ? error.message : 'Dịch vụ AI hiện không phản hồi.',
        ),
      );

    return {
      welcome: buildWelcomeMessages(availability),
      suggestedPrompts: defaultSuggestedPrompts,
      availability,
    };
  },

  async createMessage(
    message: string,
    history: LegalAssistantHistoryItem[] = [],
    context?: LegalAssistantContext,
  ) {
    const trimmedMessage = String(message ?? '').trim();

    if (!trimmedMessage) {
      throw new AppError('Nội dung câu hỏi là bắt buộc', 422, 'MESSAGE_REQUIRED');
    }

    const health = await aiService.getHealth();
    const availability = buildAvailabilityFromHealth(health);

    if (!availability.available) {
      throw new AppError(
        availability.reason || 'Trợ lý pháp lý AI hiện chưa sẵn sàng.',
        503,
        'LEGAL_ASSISTANT_UNAVAILABLE',
        availability,
      );
    }

    let resolvedContext = context;

    if (context?.documentSlug) {
      try {
        const detail = await libraryService.getDocumentDetail(context.documentSlug);
        resolvedContext = {
          documentSlug: detail.slug,
          documentTitle: detail.title,
          documentSummary: detail.summary,
          sourceName: detail.sourceName,
          sourceUrl: detail.sourceUrl,
          documentNumber: detail.documentNumber,
          highlights: detail.highlights ?? [],
          roadmap: detail.roadmap ?? [],
          officialLinks: detail.officialLinks ?? [],
        };
      } catch {
        resolvedContext = {
          ...context,
        };
      }
    }

    const response = await aiService.askLegalQuestion({
      question: trimmedMessage,
      history: history
        .slice(-8)
        .map((item) => ({
          role: item.role,
          content: item.paragraphs.join('\n\n'),
        })),
      context: resolvedContext,
    });

    return {
      reply: {
        id: `support-assistant-${Date.now()}`,
        role: 'assistant' as const,
        paragraphs: splitAnswerIntoParagraphs(response.answer),
        references: response.citations,
        routeType: response.routeType,
        confidenceScore: response.confidenceScore,
      },
      suggestedPrompts: response.suggestedPrompts ?? defaultSuggestedPrompts,
      availability,
    };
  },
};
