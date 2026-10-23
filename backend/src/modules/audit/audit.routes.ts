import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { validate } from '../../shared/validation/validate.middleware.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';

const router = Router();

const auditIdParamSchema = z.object({
  id: zUuid,
});

router.get('/', auditController.listAuditLogs);
router.get('/:id', validate({ params: auditIdParamSchema }), auditController.getAuditLogById);

export const auditRouter = router;
