"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const uuid_1 = require("uuid");
const solutions_utils_1 = require("solutions-utils");
const MODULE_NAME = __filename.split("/").pop();
const handler = async (event, context) => {
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/handler`,
        message: `received event: ${JSON.stringify(event)}`,
    });
    let responseData = {
        Data: "NOV",
    };
    const status = "SUCCESS";
    const properties = event.ResourceProperties;
    if (event.ResourceType === "Custom::CreateUUID" &&
        event.RequestType === "Create") {
        responseData = {
            UUID: (0, uuid_1.v4)(),
        };
        solutions_utils_1.logger.info({
            label: `${MODULE_NAME}/handler`,
            message: `uuid create: ${responseData.UUID}`,
        });
    }
    else if (event.ResourceType === "Custom::LaunchData" &&
        (0, solutions_utils_1.stringEqualsIgnoreCase)(process.env.SEND_METRIC, "Yes")) {
        const metric = {
            Solution: process.env.SOLUTION_ID,
            UUID: properties.SOLUTION_UUID,
            TimeStamp: new Date().toISOString().replace("T", " ").replace("Z", ""),
            Data: {
                Event: `Solution${event.RequestType}`,
                Version: process.env.VERSION,
                Region: process.env.AWS_REGION,
                Stack: process.env.QM_STACK_ID,
                SlackNotification: process.env.QM_SLACK_NOTIFICATION,
                EmailNotification: process.env.QM_EMAIL_NOTIFICATION,
            },
        };
        try {
            await (0, solutions_utils_1.sendAnonymizedMetric)(process.env.METRICS_ENDPOINT, metric);
            solutions_utils_1.logger.info({
                label: `${MODULE_NAME}/handler`,
                message: `launch data sent successfully`,
            });
        }
        catch (error) {
            solutions_utils_1.logger.warn({
                label: `${MODULE_NAME}/handler`,
                message: `sending launch data failed ${error}`,
            });
        }
    }
    return sendResponse(event, context.logStreamName, status, responseData);
};
exports.handler = handler;
async function sendResponse(event, logStreamName, responseStatus, responseData) {
    const responseBody = {
        Status: responseStatus,
        Reason: `${JSON.stringify(responseData)}`,
        PhysicalResourceId: event.PhysicalResourceId
            ? event.PhysicalResourceId
            : logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData,
    };
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/sendResponse`,
        message: `Response Body: ${JSON.stringify(responseBody)}`,
    });
    return responseBody;
}
