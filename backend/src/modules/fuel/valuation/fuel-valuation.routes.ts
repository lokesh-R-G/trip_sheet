import { Router } from 'express';
import { fuelValuationController } from './fuel-valuation.controller.js';

export const fuelValuationRouter = Router();

fuelValuationRouter.post('/', fuelValuationController.create);
fuelValuationRouter.get('/', fuelValuationController.list);
