/**
 * Thin router aggregator.
 */

import { Router } from 'express';
import familyRoutes from './familyRoutes';
import importRoutes from './importRoutes';
import personRoutes from './personRoutes';
import relationshipRoutes from './relationshipRoutes';
import searchRoutes from './searchRoutes';
import sideRoutes from './sideRoutes';
import titleRoutes from './titleRoutes';

const router = Router();

router.use('/families', familyRoutes);
router.use('/persons', personRoutes);
router.use('/relationships', relationshipRoutes);
router.use('/calculate', titleRoutes);
router.use('/sides', sideRoutes);
router.use('/search', searchRoutes);
router.use('/import', importRoutes);

export default router;
