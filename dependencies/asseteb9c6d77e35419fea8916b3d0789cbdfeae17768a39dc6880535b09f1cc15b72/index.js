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
    if (!solutions_utils_1.LambdaTriggers.isScheduledEvent(event))
        throw new solutions_utils_1.UnsupportedEventException("this event type is not supported");
    const sq = new solutions_utils_1.ServiceQuotasHelper();
    const serviceCodes = await sq.getServiceCodes();
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/handler/serviceCodes`,
        message: JSON.stringify(serviceCodes),
    });
    await Promise.allSettled(serviceCodes.map(async (service) => {
        await handleQuotasForService(service);
    }));
};
exports.handler = handler;
async function handleQuotasForService(service) {
    const quotaItems = await (0, exports_1.getQuotasForService)(process.env.SQ_QUOTA_TABLE, service);
    if (!quotaItems || quotaItems.length == 0)
        return;
    const queries = (0, exports_1.generateCWQueriesForAllQuotas)(quotaItems);
    const metricQueryIdToQuotaMap = (0, exports_1.generateMetricQueryIdMap)(quotaItems);
    const metrics = await (0, exports_1.getCWDataForQuotaUtilization)(queries);
    await Promise.allSettled(metrics.map(async (metric) => {
        const utilizationEvents = (0, exports_1.createQuotaUtilizationEvents)(metric, metricQueryIdToQuotaMap);
        solutions_utils_1.logger.debug({
            label: `${MODULE_NAME}/handler/UtilizationEvents`,
            message: JSON.stringify(utilizationEvents),
        });
        await (0, exports_1.sendQuotaUtilizationEventsToBridge)(process.env.SPOKE_EVENT_BUS, utilizationEvents);
    }));
    solutions_utils_1.logger.debug(`${service} utilizationEvents sent to spoke event bridge bus`);
}
