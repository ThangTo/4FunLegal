import { ContentPageModel } from '../models/content.model';
import { AppError } from '../utils/app-error';

export const contentService = {
  async getPage(slug: 'landing' | 'guide') {
    const page = await ContentPageModel.findOne({ slug }).lean();

    if (!page) {
      throw new AppError('Content page not found', 404, 'CONTENT_PAGE_NOT_FOUND');
    }

    return {
      slug: page.slug,
      title: page.title,
      payload: page.payload,
      version: page.version,
    };
  },
};
