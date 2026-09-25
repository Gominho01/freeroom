import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Express 5 exposes `req.query` as a getter with no setter, so a plain
    // assignment throws. Redefine the property instead of reassigning it.
    Object.defineProperty(req, "query", {
      value: schema.parse(req.query),
      writable: true,
      configurable: true,
    });
    next();
  };
}

export function validateParams(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };
}
