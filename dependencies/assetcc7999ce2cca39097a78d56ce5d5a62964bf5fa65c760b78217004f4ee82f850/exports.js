"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDynamoDBStreamEvent = exports.deleteQuotasForService = exports.putQuotasForService = exports.readDynamoDBStreamEvent = exports.getServiceMonitoringStatus = exports.putServiceMonitoringStatus = void 0;
const solutions_utils_1 = require("solutions-utils");
const MODULE_NAME = __filename.split("/").pop();
async function putServiceMonitoringStatus(serviceTable = process.env.SQ_SERVICE_TABLE, refresh = false) {
    const ddb = new solutions_utils_1.DynamoDBHelper();
    const sq = new solutions_utils_1.ServiceQuotasHelper();
    const serviceCodes = await sq.getServiceCodes();
    const monitoredServices = [];
    const disabledServices = [];
    const newServices = [];
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/serviceCodes`,
        message: JSON.stringify(serviceCodes),
    });
    await Promise.allSettled(serviceCodes.map(async (service) => {
        const getItemResponse = await ddb.getItem(serviceTable, {
            ServiceCode: service,
        });
        if (!getItemResponse)
            newServices.push(service);
        else if (getItemResponse.Monitored)
            monitoredServices.push(service);
        else
            disabledServices.push(service);
    }));
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/monitoredServices`,
        message: JSON.stringify(monitoredServices),
    });
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/disabledServices`,
        message: JSON.stringify(disabledServices),
    });
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/newServices`,
        message: JSON.stringify(newServices),
    });
    if (newServices.length > 0) {
        solutions_utils_1.logger.debug({
            label: `${MODULE_NAME}/putServiceMonitoringStatus`,
            message: "Adding new services",
        });
        await Promise.allSettled(newServices.map(async (service) => {
            await ddb.putItem(serviceTable, {
                ServiceCode: service,
                Monitored: true,
            });
        }));
    }
    if (refresh) {
        solutions_utils_1.logger.debug({
            label: `${MODULE_NAME}/putServiceMonitoringStatus`,
            message: "Refresh: Toggling the monitored services Monitored to false",
        });
        await Promise.allSettled(monitoredServices.map(async (service) => {
            await ddb.putItem(serviceTable, {
                ServiceCode: service,
                Monitored: false,
            });
        }));
        solutions_utils_1.logger.debug({
            label: `${MODULE_NAME}/putServiceMonitoringStatus`,
            message: "Refresh: Setting monitored services Monitored flag to true",
        });
        await Promise.allSettled(monitoredServices.map(async (service) => {
            await ddb.putItem(serviceTable, {
                ServiceCode: service,
                Monitored: true,
            });
        }));
    }
}
exports.putServiceMonitoringStatus = putServiceMonitoringStatus;
async function getServiceMonitoringStatus(serviceTable = process.env.SQ_SERVICE_TABLE) {
    const ddb = new solutions_utils_1.DynamoDBHelper();
    const statusItems = [];
    const sq = new solutions_utils_1.ServiceQuotasHelper();
    const serviceCodes = await sq.getServiceCodes();
    await Promise.allSettled(serviceCodes.map(async (service) => {
        const getItemResponse = await ddb.getItem(serviceTable, {
            ServiceCode: service,
        });
        if (getItemResponse)
            statusItems.push(getItemResponse);
    }));
    return statusItems;
}
exports.getServiceMonitoringStatus = getServiceMonitoringStatus;
function readDynamoDBStreamEvent(event) {
    if (solutions_utils_1.LambdaTriggers.isDynamoDBStreamEvent(event) && event.Records.length > 1)
        throw new solutions_utils_1.IncorrectConfigurationException("batch size more than 1 not supported");
    const streamRecord = event.Records[0];
    if (streamRecord.eventName == "INSERT" &&
        streamRecord.dynamodb?.NewImage?.ServiceCode?.S &&
        streamRecord.dynamodb?.NewImage?.Monitored?.BOOL)
        return "INSERT";
    if (streamRecord.eventName == "MODIFY" &&
        streamRecord.dynamodb?.NewImage?.Monitored?.BOOL !=
            streamRecord.dynamodb?.OldImage?.Monitored?.BOOL)
        return "MODIFY";
    if (streamRecord.eventName == "REMOVE" &&
        streamRecord.dynamodb?.OldImage?.ServiceCode?.S)
        return "REMOVE";
    else
        throw new solutions_utils_1.IncorrectConfigurationException("incorrect stream record format");
}
exports.readDynamoDBStreamEvent = readDynamoDBStreamEvent;
async function putQuotasForService(serviceCode) {
    const _quotas = await _getQuotasWithUtilizationMetrics(serviceCode);
    await _putMonitoredQuotas(_quotas, process.env.SQ_QUOTA_TABLE);
}
exports.putQuotasForService = putQuotasForService;
async function _getQuotasWithUtilizationMetrics(serviceCode) {
    const sq = new solutions_utils_1.ServiceQuotasHelper();
    const quotas = (await sq.getQuotaList(serviceCode)) || [];
    const quotasWithMetric = await sq.getQuotasWithUtilizationMetrics(quotas, serviceCode);
    return quotasWithMetric;
}
async function _putMonitoredQuotas(quotas, table) {
    const ddb = new solutions_utils_1.DynamoDBHelper();
    await Promise.allSettled(quotas.map(async (quota) => {
        await ddb.putItem(table, quota);
    }));
}
async function deleteQuotasForService(serviceCode) {
    const ddb = new solutions_utils_1.DynamoDBHelper();
    const quotaItems = await ddb.queryQuotasForService(process.env.SQ_QUOTA_TABLE, serviceCode);
    const deleteRequestChunks = _getChunkedDeleteQuotasRequests(quotaItems);
    await Promise.allSettled(deleteRequestChunks.map(async (chunk) => {
        await ddb.batchDelete(process.env.SQ_QUOTA_TABLE, chunk);
    }));
}
exports.deleteQuotasForService = deleteQuotasForService;
function _getChunkedDeleteQuotasRequests(quotas) {
    const deleteRequests = quotas.map((item) => {
        return {
            DeleteRequest: {
                Key: {
                    ServiceCode: item.ServiceCode,
                    QuotaCode: item.QuotaCode,
                },
            },
        };
    });
    return (0, solutions_utils_1.createChunksFromArray)(deleteRequests, 25);
}
async function handleDynamoDBStreamEvent(event) {
    const _record = event.Records[0];
    switch (readDynamoDBStreamEvent(event)) {
        case "INSERT": {
            await putQuotasForService(_record.dynamodb?.NewImage?.ServiceCode.S);
            break;
        }
        case "MODIFY": {
            await deleteQuotasForService(_record.dynamodb?.NewImage?.ServiceCode.S);
            if (_record.dynamodb?.NewImage?.Monitored?.BOOL)
                await putQuotasForService(_record.dynamodb?.NewImage?.ServiceCode.S);
            break;
        }
        case "REMOVE": {
            await deleteQuotasForService(_record.dynamodb?.OldImage?.ServiceCode.S);
            break;
        }
    }
}
exports.handleDynamoDBStreamEvent = handleDynamoDBStreamEvent;
