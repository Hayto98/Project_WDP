const { Router } = require('express');
const ctrl = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createSavedSearchSchema } = require('../validators/search.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Saved searches
 */

/**
 * @swagger
 * /api/v1/searches:
 *   get:
 *     summary: Get saved searches
 *     tags: [Search]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved searches
 */
router.get('/', ctrl.getSavedSearches);

/**
 * @swagger
 * /api/v1/searches:
 *   post:
 *     summary: Create a saved search
 *     tags: [Search]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Saved search created
 */
router.post('/', validate(createSavedSearchSchema), ctrl.createSavedSearch);

/**
 * @swagger
 * /api/v1/searches/{id}:
 *   delete:
 *     summary: Delete a saved search
 *     tags: [Search]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Saved search deleted
 */
router.delete('/:id', ctrl.deleteSavedSearch);

module.exports = router;
