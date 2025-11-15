"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetHome = void 0;
const home_service_1 = require("../../services/home/home.service");
const GetHome = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const homeData = await (0, home_service_1.getHomeDataService)(userId);
        res.status(200).json({
            success: true,
            message: "Home data retrieved successfully",
            data: homeData
        });
    }
    catch (error) {
        next(error);
    }
};
exports.GetHome = GetHome;
