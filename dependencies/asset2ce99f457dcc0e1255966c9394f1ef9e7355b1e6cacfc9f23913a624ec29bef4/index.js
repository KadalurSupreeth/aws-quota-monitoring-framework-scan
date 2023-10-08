"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const solutions_utils_1 = require("solutions-utils");
const sns_publish_1 = require("./lib/sns-publish");
const moduleName = __filename.split("/").pop();
const handler = async (event) => {
    const eventText = JSON.stringify(event);
    solutions_utils_1.logger.debug(`Received event: ${eventText}`);
    const ssm = new solutions_utils_1.SSMHelper();
    const ssmNotificationMutingConfigParamName = (process.env.QM_NOTIFICATION_MUTING_CONFIG_PARAMETER);
    const mutingConfiguration = await ssm.getParameter(ssmNotificationMutingConfigParamName);
    solutions_utils_1.logger.debug(`mutingConfiguration ${JSON.stringify(mutingConfiguration)}`);
    const service = event["detail"]["check-item-detail"]["Service"];
    const limitName = event["detail"]["check-item-detail"]["Limit Name"];
    const limitCode = event["detail"]["check-item-detail"]["Limit Code"];
    const resource = event["detail"]["check-item-detail"]["Resource"];
    const notificationMutingStatus = (0, solutions_utils_1.getNotificationMutingStatus)(mutingConfiguration, {
        service: service,
        quotaName: limitName,
        quotaCode: limitCode,
        resource: resource,
    });
    if (!notificationMutingStatus.muted) {
        const snsPublisher = new sns_publish_1.SNSPublisher();
        try {
            await snsPublisher.publish(eventText);
            const message = "Successfully published to topic";
            solutions_utils_1.logger.debug(message);
            if ((0, solutions_utils_1.stringEqualsIgnoreCase)(process.env.SEND_METRIC, "Yes")) {
                await sendMetric({
                    Region: event["detail"]["check-item-detail"]["Region"],
                    Service: service,
                    LimitName: limitName,
                    LimitCode: limitCode,
                    Status: event["detail"]["status"],
                }, "Alert notification");
            }
            return { message: message };
        }
        catch (error) {
            solutions_utils_1.logger.error(error);
            return error;
        }
    }
    else {
        solutions_utils_1.logger.debug(notificationMutingStatus.message);
        return {
            message: "Processed event, notification not sent",
            reason: notificationMutingStatus.message,
        };
    }
    async function sendMetric(data, message = "") {
        const metric = {
            UUID: process.env.SOLUTION_UUID,
            Solution: process.env.SOLUTION_ID,
            TimeStamp: new Date().toISOString().replace("T", " ").replace("Z", ""),
            Data: {
                Event: "AlertNotification",
                Version: process.env.VERSION,
                ...data,
            },
        };
        try {
            await (0, solutions_utils_1.sendAnonymizedMetric)(process.env.METRICS_ENDPOINT, metric);
            solutions_utils_1.logger.info({
                label: `${moduleName}/sendMetric`,
                message: `${message} metric sent successfully`,
            });
        }
        catch (error) {
            solutions_utils_1.logger.warn({
                label: `${moduleName}/sendMetric`,
                message: `${message} metric failed ${error}`,
            });
        }
    }
};
exports.handler = handler;
