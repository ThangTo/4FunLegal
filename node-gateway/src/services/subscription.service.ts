import { NewsletterSubscriptionModel } from '../models/subscription.model';

export const subscriptionService = {
  async create(email: string, source = 'library') {
    const subscription = await NewsletterSubscriptionModel.findOneAndUpdate(
      { email },
      { email, source, status: 'active' },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return {
      id: subscription.id,
      email: subscription.email,
      status: subscription.status,
      source: subscription.source,
    };
  },
};
