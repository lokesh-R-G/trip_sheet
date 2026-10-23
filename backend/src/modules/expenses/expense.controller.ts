import { Request, Response, NextFunction } from 'express';
import { expenseService, ExpenseService } from './expense.service.js';

export class ExpenseController {
  constructor(private service: ExpenseService = expenseService) {}

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || req.body.submittedBy || 'system';
      const result = await this.service.submitExpense(req.body, actor);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  review = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.headers['x-actor-id'] as string;
      const result = await this.service.reviewExpense(req.params.id, req.body, actor);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getExpenseById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tripId, category, approvalStatus, page, limit } = req.query as any;
      const result = await this.service.listExpenses({
        tripId,
        category,
        approvalStatus,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const expenseController = new ExpenseController();
