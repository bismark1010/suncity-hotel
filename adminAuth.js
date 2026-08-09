function adminAuth(req, res, next) {
  const key = req.header('x-admin-key');
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected === 'changeme') {
    return res.status(500).json({ error: 'Server misconfigured: ADMIN_API_KEY is not set' });
  }
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Missing or invalid x-admin-key header' });
  }
  next();
}

module.exports = adminAuth;
