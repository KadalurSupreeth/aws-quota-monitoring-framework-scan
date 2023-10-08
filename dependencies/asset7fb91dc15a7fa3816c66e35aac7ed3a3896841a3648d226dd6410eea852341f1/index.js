"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const solutions_utils_1 = require("solutions-utils");
const limit_report_1 = require("./lib/limit-report");
const moduleName = __filename.split("/").pop();
const handler = async (event) => {
    solutions_utils_1.logger.debug({
        label: moduleName,
        message: `Received event: ${JSON.stringify(event)}`,
    });
    if (solutions_utils_1.LambdaTriggers.isScheduledEvent(event)) {
        const limitReport = new limit_report_1.LimitReport();
        await limitReport.readQueueAsync();
    }
    else
        throw new solutions_utils_1.UnsupportedEventException("this event type is not support");
};
exports.handler = handler;
