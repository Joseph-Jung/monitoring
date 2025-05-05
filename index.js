require('dotenv').config();
const Stripe = require('stripe');
const { WebClient } = require('@slack/web-api');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function getSucceededPaymentIntents(limit = 5) {
  const paymentIntents = await stripe.paymentIntents.list({
    limit: 20,
  });
  const succeededIntents = paymentIntents.data.filter(pi => pi.status === 'succeeded').slice(0, limit);
  return succeededIntents;
}

async function postToSlackPaymentIntents(paymentIntents) {
  if (paymentIntents.length === 0) {
    await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: 'No succeeded payment instruments found.'
    });
    return;
  }
  const text = paymentIntents.map(pi => {
    const meta = pi.metadata && Object.keys(pi.metadata).length > 0
      ? `Metadata: ${JSON.stringify(pi.metadata)}`
      : 'Metadata: none';
    return `ID: ${pi.id}, Amount: ${pi.amount / 100} ${pi.currency.toUpperCase()}, Status: ${pi.status}, ${meta}`;
  }).join('\n');
  await slack.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID,
    text: `Recent succeeded payment instruments:\n${text}`
  });
}

(async () => {
  try {
    const succeeded = await getSucceededPaymentIntents(5);
    await postToSlackPaymentIntents(succeeded);
    console.log('Posted to Slack.');
  } catch (err) {
    console.error('Error:', err);
  }
})();