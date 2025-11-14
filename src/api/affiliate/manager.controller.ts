import { Request, Response } from "express";
import { ManagerService } from "../../services/affiliate/manager.service";

// =====================================================
// MANAGER DASHBOARD CONTROLLERS
// =====================================================

export const getManagerDashboard = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;

    const dashboard = await ManagerService.getManagerDashboard(managerId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// TEAM MANAGEMENT CONTROLLERS
// =====================================================

export const getManagerTeams = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;

    const teams = await ManagerService.getManagerTeams(managerId);

    res.json({
      success: true,
      data: teams
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createTeam = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;
    const teamData = req.validated?.body;

    const team = await ManagerService.createTeam(managerId, teamData);

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: team
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;
    const teamId = parseInt(req.params.id);
    const teamData = req.validated?.body;

    const team = await ManagerService.updateTeam(teamId, managerId, teamData);

    res.json({
      success: true,
      message: "Team updated successfully",
      data: team
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getTeamAffiliates = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;
    const teamId = parseInt(req.params.id);

    const affiliates = await ManagerService.getTeamAffiliates(teamId, managerId);

    res.json({
      success: true,
      data: affiliates
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const assignAffiliateToTeam = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;
    const { affiliate_id, team_id } = req.validated?.body;

    await ManagerService.assignAffiliateToTeam(affiliate_id, team_id, managerId);

    res.json({
      success: true,
      message: "Affiliate assigned to team successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getTeamPerformance = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;
    const teamId = parseInt(req.params.id);

    const performance = await ManagerService.getTeamPerformance(teamId, managerId);

    res.json({
      success: true,
      data: performance
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}; 