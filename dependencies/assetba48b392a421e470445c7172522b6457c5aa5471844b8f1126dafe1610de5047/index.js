"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const preReqManager_1 = require("./lib/preReqManager");
const solutions_utils_1 = require("solutions-utils");
const moduleName = __filename.split("/").pop();
const handler = async (event) => {
    solutions_utils_1.logger.debug({
        label: moduleName,
        message: `prereq-manager triggering event: ${JSON.stringify(event)}`,
    });
    solutions_utils_1.logger.info({
        label: moduleName,
        message: `initiating organization feature check`,
    });
    if (solutions_utils_1.LambdaTriggers.isCfnEvent(event)) {
        if (event.RequestType === "Create" || event.RequestType === "Update")
            await handleCreateOrUpdate(event.ResourceProperties);
        return;
    }
    throw new solutions_utils_1.UnsupportedEventException("this event type is not supported");
};
exports.handler = handler;
async function handleCreateOrUpdate(properties) {
    try {
        const preReqManager = new preReqManager_1.PreReqManager(properties.AccountId);
        await preReqManager.throwIfOrgMisconfigured();
        await preReqManager.enableTrustedAccess();
        await preReqManager.registerDelegatedAdministrator(properties.QMMonitoringAccountId);
        solutions_utils_1.logger.info({
            label: moduleName,
            message: `All pre-requisites validated & installed`,
        });
    }
    catch (error) {
        solutions_utils_1.logger.error({
            label: moduleName,
            message: `Pre-requisites failed: ${JSON.stringify(error)}`,
        });
        throw `${error.name}-${error.message}. Check cloudwatch logs for more details`;
    }
}
