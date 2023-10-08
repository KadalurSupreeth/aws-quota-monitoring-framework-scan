"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const solutions_utils_1 = require("solutions-utils");
const exports_1 = require("./exports");
const MODULE_NAME = __filename.split("/").pop();
const handler = async (event) => {
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/handler`,
        message: JSON.stringify(event),
    });
    if (solutions_utils_1.LambdaTriggers.isCfnEvent(event)) {
        if (event.RequestType === "Create" || event.RequestType === "Update") {
            const delay = parseInt(process.env.RESOURCES_WAIT_TIME_SECONDS ?? "120") *
                1000;
            solutions_utils_1.logger.info({
                label: `${MODULE_NAME}/handler`,
                message: `Sleeping for ${delay / 1000} seconds to make sure all resources are provisioned`,
            });
            await (0, solutions_utils_1.sleep)(delay);
            solutions_utils_1.logger.info({
                label: `${MODULE_NAME}/handler`,
                message: "Start putting supported services",
            });
            await (0, exports_1.putServiceMonitoringStatus)(process.env.SQ_SERVICE_TABLE);
        }
    }
    else if (solutions_utils_1.LambdaTriggers.isDynamoDBStreamEvent(event)) {
        await (0, exports_1.handleDynamoDBStreamEvent)(event);
    }
    else if (solutions_utils_1.LambdaTriggers.isScheduledEvent(event)) {
        await (0, exports_1.putServiceMonitoringStatus)(process.env.SQ_SERVICE_TABLE, true);
    }
    else
        throw new solutions_utils_1.UnsupportedEventException("this event type is not support");
};
exports.handler = handler;
