// A small in-memory limiter for the sign-in routes: `max` requests per `windowMs` for each client address.
// It is per process, which is enough for one server; use a shared store if the app is ever scaled out.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many attempts. Please wait a few minutes and try again.' } = {}) {
  const hits = new Map();
  const timer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => t > cutoff);
      if (fresh.length) hits.set(key, fresh);
      else hits.delete(key);
    }
  }, windowMs);
  timer.unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const recent = (hits.get(key) || []).filter((t) => t > now - windowMs);
    if (recent.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ message });
    }
    recent.push(now);
    hits.set(key, recent);
    return next();
  };
}

module.exports = rateLimit;
