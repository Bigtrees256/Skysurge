# Stripe Integration Setup for SkySurge

## Prerequisites
1. A Stripe account (sign up at https://stripe.com)
2. Your Stripe API keys

## Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Getting Your Stripe Keys

### 1. Secret Key & Publishable Key
1. Log into your Stripe Dashboard
2. Go to Developers → API Keys
3. Copy your "Publishable key" and "Secret key"
4. Use test keys for development, live keys for production

### 2. Webhook Secret (Optional for Development)
1. In Stripe Dashboard, go to Developers → Webhooks
2. Create a new webhook endpoint: `https://yourdomain.com/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the webhook signing secret

## Testing the Integration

### Test Card Numbers
Use these test card numbers for testing:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test Flow
1. Start your backend server
2. Login to the game
3. Run out of attempts
4. Click "Get More Attempts"
5. Select a package and complete payment with test card

## Available Packages

The system includes these default packages:
- **Basic Pack**: 3 attempts for $0.99
- **Standard Pack**: 10 attempts for $2.99
- **Premium Pack**: 25 attempts for $5.99
- **Unlimited Pack**: 100 attempts for $9.99

## Production Deployment

### 1. Switch to Live Keys
Replace test keys with live keys in your `.env` file:
```env
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
```

### 2. Configure Webhooks
Set up webhooks in Stripe Dashboard for production domain.

### 3. SSL Certificate
Ensure your domain has SSL (HTTPS) for secure payments.

## Security Notes

- Never expose your secret key in frontend code
- Always use HTTPS in production
- Validate payments on the backend
- Store payment metadata for audit trails

## Troubleshooting

### Common Issues

1. **"Payment failed" errors**
   - Check your Stripe keys are correct
   - Verify the card number is valid
   - Check browser console for errors

2. **"Authentication required" errors**
   - Ensure user is logged in
   - Check JWT token is valid

3. **Webhook errors**
   - Verify webhook URL is accessible
   - Check webhook secret is correct

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
```

## Support

For Stripe-specific issues, refer to:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com) 