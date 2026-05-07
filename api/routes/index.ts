/**
 * Thin router aggregator.
 */

import { Router } from 'express';
import authRoutes from './authRoutes';
import familyRoutes from './familyRoutes';
import importRoutes from './importRoutes';
import personRoutes from './personRoutes';
import relationshipRoutes from './relationshipRoutes';
import searchRoutes from './searchRoutes';
import sideRoutes from './sideRoutes';
import titleRoutes from './titleRoutes';
import uploadRoutes from './uploadRoutes';
import collaborationRoutes from './collaborationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/families', familyRoutes);
router.use('/persons', personRoutes);
router.use('/relationships', relationshipRoutes);
router.use('/calculate', titleRoutes);
router.use('/sides', sideRoutes);
router.use('/search', searchRoutes);
router.use('/import', importRoutes);
router.use('/persons', uploadRoutes);
router.use('/', collaborationRoutes);

export default router;
