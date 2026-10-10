// Single source for the JWT signing secret. The old 'demo_secret' fallback
// would let anyone forge tokens, so it is only allowed outside production.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set');
  }
  return 'demo_secret';
}

module.exports = getJwtSecret;
