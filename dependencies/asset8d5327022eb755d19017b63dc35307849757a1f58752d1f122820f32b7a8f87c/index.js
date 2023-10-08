"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const ta_helper_1 = require("./lib/ta-helper");
const solutions_utils_1 = require("solutions-utils");
const handler = async (event) => {
    solutions_utils_1.logger.debug({
        label: "taRefresher/handler",
        message: JSON.stringify(event),
    });
    const _services = process.env.AWS_SERVICES
        .replace(/"/g, "")
        .split(",");
    const taRefresh = new ta_helper_1.TAHelper();
    await taRefresh.refreshChecks(_services);
};
exports.handler = handler;
