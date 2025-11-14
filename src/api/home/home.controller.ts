import { Request, Response, NextFunction } from "express";
import { getHomeDataService } from "../../services/home/home.service";

export const GetHome = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const homeData = await getHomeDataService(userId);
    
    res.status(200).json({ 
      success: true, 
      message: "Home data retrieved successfully",
      data: homeData 
    });
  } catch (error) {
    next(error);
  }
};