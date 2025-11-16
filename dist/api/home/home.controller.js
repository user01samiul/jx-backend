"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetHome = void 0;
const home_service_1 = require("../../services/home/home.service");
const GetHome = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
