"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentManager = exports.DEPLOYMENT_MODEL = void 0;
const solutions_utils_1 = require("solutions-utils");
var DEPLOYMENT_MODEL;
(function (DEPLOYMENT_MODEL) {
    DEPLOYMENT_MODEL["ORG"] = "Organizations";
    DEPLOYMENT_MODEL["ACCOUNT"] = "Accounts";
    DEPLOYMENT_MODEL["HYBRID"] = "Hybrid";
})(DEPLOYMENT_MODEL || (exports.DEPLOYMENT_MODEL = DEPLOYMENT_MODEL = {}));
class DeploymentManager {
    constructor() {
        this.org = new solutions_utils_1.OrganizationsHelper();
        this.events = new solutions_utils_1.EventsHelper();
        this.ec2 = new solutions_utils_1.EC2Helper();
        this.ssm = new solutions_utils_1.SSMHelper();
        this.moduleName = __filename.split("/").pop();
        this.stackSetOpsPrefs = {
            RegionConcurrencyType: process.env.REGIONS_CONCURRENCY_TYPE,
            MaxConcurrentPercentage: parseInt(process.env.MAX_CONCURRENT_PERCENTAGE, 10),
            FailureTolerancePercentage: parseInt(process.env.FAILURE_TOLERANCE_PERCENTAGE, 10),
        };
        this.sqParameterOverrides = [
            {
                ParameterKey: "NotificationThreshold",
                ParameterValue: process.env.SQ_NOTIFICATION_THRESHOLD,
            },
            {
                ParameterKey: "MonitoringFrequency",
                ParameterValue: process.env.SQ_MONITORING_FREQUENCY,
            },
        ];
    }
    async manageDeployments() {
        const principals = await this.getPrincipals();
        const organizationId = await this.getOrganizationId();
        await this.updatePermissions(principals, organizationId);
        await this.manageStackSets();
    }
    async getPrincipals() {
        const accountParameter = process.env.QM_ACCOUNT_PARAMETER;
        const ouParameter = process.env.QM_OU_PARAMETER;
        let principals = [];
        switch (process.env.DEPLOYMENT_MODEL) {
            case DEPLOYMENT_MODEL.ORG: {
                principals = await this.ssm.getParameter(ouParameter);
                (0, solutions_utils_1.validateOrgInput)(principals);
                break;
            }
            case DEPLOYMENT_MODEL.ACCOUNT: {
                principals = await this.ssm.getParameter(accountParameter);
                (0, solutions_utils_1.validateAccountInput)(principals);
                break;
            }
            case DEPLOYMENT_MODEL.HYBRID: {
                const org_principals = await this.ssm.getParameter(ouParameter);
                (0, solutions_utils_1.validateOrgInput)(org_principals);
                const account_principals = await this.ssm.getParameter(accountParameter);
                (0, solutions_utils_1.validateAccountInput)(account_principals);
                principals = [...org_principals, ...account_principals];
                break;
            }
        }
        return principals;
    }
    async getOrganizationId() {
        let organizationId = "";
        if (process.env.DEPLOYMENT_MODEL === DEPLOYMENT_MODEL.ORG ||
            process.env.DEPLOYMENT_MODEL === DEPLOYMENT_MODEL.HYBRID)
            organizationId = await this.org.getOrganizationId();
        return organizationId;
    }
    async updatePermissions(principals, organizationId) {
        await this.events.createEventBusPolicy(principals, organizationId, process.env.EVENT_BUS_ARN, process.env.EVENT_BUS_NAME);
    }
    getTARegions(regionsList) {
        const taRegions = [];
        const REGION_US_EAST_1 = "us-east-1";
        const REGION_US_GOV_WEST_1 = "us-gov-west-1";
        if (regionsList.includes(REGION_US_GOV_WEST_1)) {
            taRegions.push(REGION_US_GOV_WEST_1);
        }
        else if (regionsList.includes(REGION_US_EAST_1)) {
            taRegions.push(REGION_US_EAST_1);
        }
        else {
            throw new solutions_utils_1.IncorrectConfigurationException(`The Trusted Advisor template can only be deployed in the regions ${REGION_US_EAST_1} and ${REGION_US_GOV_WEST_1}`);
        }
        return taRegions;
    }
    async getUserSelectedRegions() {
        const regionsFromCfnTemplate = process.env.REGIONS_LIST.split(",");
        const ssmParamName = process.env.QM_REGIONS_LIST_PARAMETER;
        const regionsFromSSMParamStore = await this.ssm.getParameter(ssmParamName);
        solutions_utils_1.logger.debug({
            label: `${this.moduleName}/handler/getUserSelectedRegions`,
            message: `original list of regions passed to the template = ${regionsFromCfnTemplate}`,
        });
        solutions_utils_1.logger.debug({
            label: `${this.moduleName}/handler/getUserSelectedRegions`,
            message: `current list of regions from the ssm parameter = ${regionsFromSSMParamStore}`,
        });
        return regionsFromSSMParamStore;
    }
    async manageStackSets() {
        const ouParameter = process.env.QM_OU_PARAMETER;
        if (process.env.DEPLOYMENT_MODEL === DEPLOYMENT_MODEL.ORG ||
            process.env.DEPLOYMENT_MODEL === DEPLOYMENT_MODEL.HYBRID) {
            const cfnTA = new solutions_utils_1.CloudFormationHelper(process.env.TA_STACKSET_ID);
            const cfnSQ = new solutions_utils_1.CloudFormationHelper(process.env.SQ_STACKSET_ID);
            const isTAAvailable = await new solutions_utils_1.SupportHelper().isTrustedAdvisorAvailable();
            const deploymentTargets = await this.ssm.getParameter(ouParameter);
            const sqRegions = [];
            const userSelectedRegions = await this.getUserSelectedRegions();
            const spokeDeploymentMetricData = {};
            if (userSelectedRegions.length === 0 ||
                (0, solutions_utils_1.arrayIncludesIgnoreCase)(userSelectedRegions, "ALL")) {
                sqRegions.push(...(await this.ec2.getEnabledRegionNames()));
                spokeDeploymentMetricData.RegionsList = "ALL";
            }
            else {
                sqRegions.push(...userSelectedRegions);
                spokeDeploymentMetricData.RegionsList = userSelectedRegions.join(",");
            }
            const taRegions = this.getTARegions(sqRegions);
            solutions_utils_1.logger.debug({
                label: `${this.moduleName}/handler/manageStackSets`,
                message: `StackSet Operation Preferences = ${JSON.stringify(this.stackSetOpsPrefs)}`,
            });
            if (isTAAvailable) {
                await this.manageStackSetInstances(cfnTA, deploymentTargets, taRegions);
            }
            await this.manageStackSetInstances(cfnSQ, deploymentTargets, sqRegions, spokeDeploymentMetricData, this.sqParameterOverrides);
            await this.sendMetric({
                TAAvailable: isTAAvailable,
            }, "Is Trusted Advisor Available");
        }
    }
    async manageStackSetInstances(stackSet, deploymentTargets, regions, spokeDeploymentMetricData, parameterOverrides) {
        const deployedRegions = await stackSet.getDeployedRegions();
        const regionsToRemove = (0, solutions_utils_1.arrayDiff)(deployedRegions, regions);
        const regionsNetNew = (0, solutions_utils_1.arrayDiff)(regions, deployedRegions);
        solutions_utils_1.logger.debug({
            label: `${this.moduleName}/handler/manageStackSetInstances ${stackSet.stackSetName}`,
            message: `deployedRegions: ${JSON.stringify(deployedRegions)}`,
        });
        solutions_utils_1.logger.debug({
            label: `${this.moduleName}/handler/manageStackSetInstances ${stackSet.stackSetName}`,
            message: `regionsToRemove: ${JSON.stringify(regionsToRemove)}`,
        });
        solutions_utils_1.logger.debug({
            label: `${this.moduleName}/handler/manageStackSetInstances ${stackSet.stackSetName}`,
            message: `regionsNetNew: ${JSON.stringify(regionsNetNew)}`,
        });
        const sendMetric = (0, solutions_utils_1.stringEqualsIgnoreCase)(process.env.SEND_METRIC, "Yes") &&
            spokeDeploymentMetricData;
        if (deploymentTargets[0].match(solutions_utils_1.ORG_REGEX)) {
            const root = await this.org.getRootId();
            await stackSet.deleteStackSetInstances([root], regionsToRemove, this.stackSetOpsPrefs);
            await stackSet.createStackSetInstances([root], regionsNetNew, this.stackSetOpsPrefs, parameterOverrides);
            if (sendMetric) {
                spokeDeploymentMetricData.SpokeCount =
                    (await this.org.getNumberOfAccountsInOrg()) - 1;
            }
        }
        else {
            const deployedTargets = await stackSet.getDeploymentTargets();
            const targetsToRemove = (0, solutions_utils_1.arrayDiff)(deployedTargets, deploymentTargets);
            const targetsNetNew = (0, solutions_utils_1.arrayDiff)(deploymentTargets, deployedTargets);
            solutions_utils_1.logger.debug({
                label: `${this.moduleName}/handler/manageStackSetInstances ${stackSet.stackSetName}`,
                message: `targetsToRemove: ${JSON.stringify(targetsToRemove)}`,
            });
            solutions_utils_1.logger.debug({
                label: `${this.moduleName}/handler/manageStackSetInstances ${stackSet.stackSetName}`,
                message: `targetsNetNew: ${JSON.stringify(targetsNetNew)}`,
            });
            await stackSet.deleteStackSetInstances(targetsToRemove, deployedRegions, this.stackSetOpsPrefs);
            await stackSet.deleteStackSetInstances(deployedTargets, regionsToRemove, this.stackSetOpsPrefs);
            await stackSet.createStackSetInstances(targetsNetNew, regions, this.stackSetOpsPrefs, parameterOverrides);
            await stackSet.createStackSetInstances(deploymentTargets, regionsNetNew, this.stackSetOpsPrefs, parameterOverrides);
            if (sendMetric) {
                const allPromises = Promise.allSettled(deploymentTargets.map(async (ouId) => {
                    return this.org.getNumberOfAccountsInOU(ouId);
                }));
                spokeDeploymentMetricData.SpokeCount = (await allPromises)
                    .map((result) => (result.status === "fulfilled" ? result.value : 0))
                    .reduce((count1, count2) => count1 + count2);
            }
        }
        if (sendMetric) {
            await this.sendMetric({
                SpokeCount: spokeDeploymentMetricData?.SpokeCount || 0,
                SpokeDeploymentRegions: spokeDeploymentMetricData?.RegionsList || "",
            }, "Spoke Deployment Metric");
        }
    }
    async sendMetric(data, message = "") {
        const metric = {
            UUID: process.env.SOLUTION_UUID,
            Solution: process.env.SOLUTION_ID,
            TimeStamp: new Date().toISOString().replace("T", " ").replace("Z", ""),
            Data: {
                Event: "ManageStackSetInstances",
                Version: process.env.VERSION,
                ...data,
            },
        };
        try {
            await (0, solutions_utils_1.sendAnonymizedMetric)(process.env.METRICS_ENDPOINT, metric);
            solutions_utils_1.logger.info({
                label: `${this.moduleName}/sendMetric`,
                message: `${message} metric sent successfully`,
            });
        }
        catch (error) {
            solutions_utils_1.logger.warn({
                label: `${this.moduleName}/sendMetric`,
                message: `${message} metric failed ${error}`,
            });
        }
    }
}
exports.DeploymentManager = DeploymentManager;
