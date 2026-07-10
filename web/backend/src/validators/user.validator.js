const Joi = require('joi');

const updateProfileSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().email().max(255).optional(),
}).min(1);

const updateDashboardLayoutSchema = Joi.object({
  widgets: Joi.array()
    .items(Joi.string().valid('trend_chart', 'research_gap_heatmap', 'top_papers', 'ai_insights'))
    .min(1)
    .max(10)
    .required(),
});

module.exports = { updateProfileSchema, updateDashboardLayoutSchema };
