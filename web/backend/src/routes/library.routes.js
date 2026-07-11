const { Router } = require('express');
const ctrl = require('../controllers/library.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createCollectionSchema,
  updateCollectionSchema,
  savePaperSchema,
  updateSavedPaperSchema,
} = require('../validators/library.validator');

const router = Router();

// All routes require auth
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Library
 *   description: User library and collections
 */

/**
 * @swagger
 * /api/v1/library/collections:
 *   get:
 *     summary: Get user collections
 *     tags: [Library]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of collections
 */
router.get('/collections', ctrl.getCollections);

/**
 * @swagger
 * /api/v1/library/collections:
 *   post:
 *     summary: Create a collection
 *     tags: [Library]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Collection created
 */
router.post('/collections', validate(createCollectionSchema), ctrl.createCollection);

/**
 * @swagger
 * /api/v1/library/collections/{id}:
 *   put:
 *     summary: Update a collection
 *     tags: [Library]
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
 *         description: Collection updated
 */
router.put('/collections/:id', validate(updateCollectionSchema), ctrl.updateCollection);

/**
 * @swagger
 * /api/v1/library/collections/{id}:
 *   delete:
 *     summary: Delete a collection
 *     tags: [Library]
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
 *         description: Collection deleted
 */
router.delete('/collections/:id', ctrl.deleteCollection);

// Saved papers

/**
 * @swagger
 * /api/v1/library/papers:
 *   get:
 *     summary: Get saved papers
 *     tags: [Library]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved papers
 */
router.get('/papers', ctrl.getPapers);

/**
 * @swagger
 * /api/v1/library/papers:
 *   post:
 *     summary: Save a paper to library
 *     tags: [Library]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Paper saved
 */
router.post('/papers', validate(savePaperSchema), ctrl.savePaper);

/**
 * @swagger
 * /api/v1/library/papers/{collectionId}/{paperId}:
 *   put:
 *     summary: Update a saved paper
 *     tags: [Library]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paper updated
 */
router.put('/papers/:collectionId/:paperId', validate(updateSavedPaperSchema), ctrl.updatePaper);

/**
 * @swagger
 * /api/v1/library/papers/{collectionId}/{paperId}:
 *   delete:
 *     summary: Remove a saved paper
 *     tags: [Library]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paper removed
 */
router.delete('/papers/:collectionId/:paperId', ctrl.removePaper);

module.exports = router;
