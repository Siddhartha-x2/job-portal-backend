function getProfile(req, res) {
  res.json({ success: true, message: 'Profile retrieved', data: req.user });
}

async function updateProfile(req, res) {
  // This explicit list prevents changes to role, password, status and ownership.
  for (const field of ['name', 'skills', 'education', 'experience']) {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  }
  await req.user.save();
  res.json({ success: true, message: 'Profile updated', data: req.user });
}

module.exports = { getProfile, updateProfile };
