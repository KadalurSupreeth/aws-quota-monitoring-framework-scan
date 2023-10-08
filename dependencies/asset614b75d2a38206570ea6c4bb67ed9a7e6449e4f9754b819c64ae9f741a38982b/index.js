"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const slack_notify_1 = require("./lib/slack-notify");
const solutions_utils_1 = require("solutions-utils");
const handler = async (event) => {
    solutions_utils_1.logger.debug(`Received event: ${JSON.stringify(event)}`);
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
        const slackNotifier = new slack_notify_1.SlackNotifier();
        try {
            return await slackNotifier.sendNotification(event);
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
};
exports.handler = handler;
