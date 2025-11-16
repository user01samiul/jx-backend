"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamPerformance = exports.assignAffiliateToTeam = exports.getTeamAffiliates = exports.updateTeam = exports.createTeam = exports.getManagerTeams = exports.getManagerDashboard = void 0;
const manager_service_1 = require("../../services/affiliate/manager.service");
// =====================================================
// MANAGER DASHBOARD CONTROLLERS
// =====================================================
const getManagerDashboard = async (req, res) => {
    try {
        const managerId = req.user.id;
        const dashboard = await manager_service_1.ManagerService.getManagerDashboard(managerId);
        res.json({
            success: true,
            data: dashboard
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getManagerDashboard = getManagerDashboard;
// =====================================================
// TEAM MANAGEMENT CONTROLLERS
// =====================================================
const getManagerTeams = async (req, res) => {
    try {
        const managerId = req.user.id;
        const teams = await manager_service_1.ManagerService.getManagerTeams(managerId);
        res.json({
            success: true,
            data: teams
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getManagerTeams = getManagerTeams;
const createTeam = async (req, res) => {
    try {
        const managerId = req.user.id;
        const teamData = req.validated?.body;
        const team = await manager_service_1.ManagerService.createTeam(managerId, teamData);
        res.status(201).json({
            success: true,
            message: "Team created successfully",
            data: team
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.createTeam = createTeam;
const updateTeam = async (req, res) => {
    try {
        const managerId = req.user.id;
        const teamId = parseInt(req.params.id);
        const teamData = req.validated?.body;
        const team = await manager_service_1.ManagerService.updateTeam(teamId, managerId, teamData);
        res.json({
            success: true,
            message: "Team updated successfully",
            data: team
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.updateTeam = updateTeam;
const getTeamAffiliates = async (req, res) => {
    try {
        const managerId = req.user.id;
        const teamId = parseInt(req.params.id);
        const affiliates = await manager_service_1.ManagerService.getTeamAffiliates(teamId, managerId);
        res.json({
            success: true,
            data: affiliates
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getTeamAffiliates = getTeamAffiliates;
const assignAffiliateToTeam = async (req, res) => {
    try {
        const managerId = req.user.id;
        const { affiliate_id, team_id } = req.validated?.body;
        await manager_service_1.ManagerService.assignAffiliateToTeam(affiliate_id, team_id, managerId);
        res.json({
            success: true,
            message: "Affiliate assigned to team successfully"
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.assignAffiliateToTeam = assignAffiliateToTeam;
const getTeamPerformance = async (req, res) => {
    try {
        const managerId = req.user.id;
        const teamId = parseInt(req.params.id);
        const performance = await manager_service_1.ManagerService.getTeamPerformance(teamId, managerId);
        res.json({
            success: true,
            data: performance
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getTeamPerformance = getTeamPerformance;
