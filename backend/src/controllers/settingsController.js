const AppSettings = require('../models/AppSettings');

exports.getPublicStorefrontSettings = async (_req, res, next) => {
  try {
    const settings = await AppSettings.findOne().select('announcementEnabled announcementText instagramUrl').lean();
    res.json({ success: true, data: {
      announcementText: settings?.announcementEnabled && settings?.announcementText ? settings.announcementText : null,
      instagramUrl: settings?.instagramUrl || null,
    } });
  } catch (error) { next(error); }
};
