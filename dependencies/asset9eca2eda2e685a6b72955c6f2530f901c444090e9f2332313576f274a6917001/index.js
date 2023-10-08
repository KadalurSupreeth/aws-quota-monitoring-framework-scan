"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const solutions_utils_1 = require("solutions-utils");
const deployment_manager_1 = require("./lib/deployment-manager");
const MODULE_NAME = __filename.split("/").pop();
const handler = async (event) => {
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/handler`,
        message: JSON.stringify(event),
    });
    const deploymentMananger = new deployment_manager_1.DeploymentManager();
    await deploymentMananger.manageDeployments();
};
exports.handler = handler;
