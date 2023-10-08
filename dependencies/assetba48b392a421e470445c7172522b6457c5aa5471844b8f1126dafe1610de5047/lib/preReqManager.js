"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreReqManager = void 0;
const solutions_utils_1 = require("solutions-utils");
class PreReqManager {
    constructor(accountId) {
        this.accountId = accountId;
        this.orgHelper = new solutions_utils_1.OrganizationsHelper();
        this.moduleName = __filename.split("/").pop();
    }
    async throwIfOrgMisconfigured() {
        const organization = await this.orgHelper.getOrganizationDetails();
        if (organization && organization.FeatureSet !== "ALL") {
            const message = "Organization must be set with full-features";
            solutions_utils_1.logger.error({
                label: this.moduleName,
                message: message,
            });
            throw new solutions_utils_1.IncorrectConfigurationException(message);
        }
        if (organization && organization.MasterAccountId !== this.accountId) {
            const message = "The template must be deployed in Organization Management account";
            solutions_utils_1.logger.error({
                label: this.moduleName,
                message: message,
            });
            throw new solutions_utils_1.IncorrectConfigurationException(message);
        }
    }
    async enableTrustedAccess() {
        await this.orgHelper.enableAWSServiceAccess("member.org.stacksets.cloudformation.amazonaws.com");
    }
    async registerDelegatedAdministrator(monitortingAccountId) {
        if (this.accountId === monitortingAccountId) {
            const message = "Cannot register Management account as a delegated StackSet administrator";
            solutions_utils_1.logger.error({
                label: this.moduleName,
                message: message,
            });
            throw new solutions_utils_1.IncorrectConfigurationException(message);
        }
        await this.orgHelper.registerDelegatedAdministrator(monitortingAccountId, "member.org.stacksets.cloudformation.amazonaws.com");
    }
}
exports.PreReqManager = PreReqManager;
