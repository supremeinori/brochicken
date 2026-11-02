function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Sesi berakhir atau belum login. Silakan login kembali.'
    });
  }
  next();
}

function requireOwner(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Silakan login terlebih dahulu.'
    });
  }
  if (req.session.user.role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      error: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Pemilik (Owner).'
    });
  }
  next();
}

module.exports = {
  requireAuth,
  requireOwner
};
