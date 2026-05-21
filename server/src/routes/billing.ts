import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/authenticate';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia' as any,
});

export const billingRouter = Router();

// POST /api/billing/checkout
billingRouter.post('/checkout', authenticate, async (req: Request, res: Response) => {
  try {
    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing`,
      client_reference_id: req.user._id.toString(),
      customer_email: req.user.email,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/billing/portal
billingRouter.post('/portal', authenticate, async (req: Request, res: Response) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id });
    if (!sub || !sub.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/billing/status
billingRouter.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    let sub = await Subscription.findOne({ userId: req.user._id });
    if (!sub) {
      sub = await Subscription.create({ userId: req.user._id, planId: 'free', status: 'active' });
    }
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/billing/webhook - Stripe webhook receiver
billingRouter.post(
  '/webhook',
  require('express').raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy';

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.client_reference_id;
          if (userId) {
            await Subscription.findOneAndUpdate(
              { userId },
              {
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                planId: 'pro',
                status: 'active',
              },
              { upsert: true }
            );

            // Sync with User model
            await User.findByIdAndUpdate(userId, {
              plan: 'pro',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            });
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const isDeleted = event.type === 'customer.subscription.deleted' || subscription.status !== 'active';
          const updatedSub = await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscription.id },
            {
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              planId: isDeleted ? 'free' : 'pro',
            },
            { new: true }
          );

          if (updatedSub && updatedSub.userId) {
            await User.findByIdAndUpdate(updatedSub.userId, {
              plan: isDeleted ? 'free' : 'pro',
            });
          }
          break;
        }
      }
      res.json({ received: true });
    } catch (err) {
      console.error('Error handling webhook event', err);
      res.status(500).end();
    }
  }
);
