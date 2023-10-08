"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAHelper = void 0;
const solutions_utils_1 = require("solutions-utils");
var TAServices;
(function (TAServices) {
    TAServices["AUTOSCALING"] = "AutoScaling";
    TAServices["CLOUDFORMATION"] = "CloudFormation";
    TAServices["DYNAMODB"] = "DynamoDB";
    TAServices["EBS"] = "EBS";
    TAServices["EC2"] = "EC2";
    TAServices["ELB"] = "ELB";
    TAServices["IAM"] = "IAM";
    TAServices["KINESIS"] = "Kinesis";
    TAServices["RDS"] = "RDS";
    TAServices["ROUTE53"] = "Route53";
    TAServices["SES"] = "SES";
    TAServices["VPC"] = "VPC";
})(TAServices || (TAServices = {}));
const serviceChecks = {};
serviceChecks[TAServices.AUTOSCALING] = ["aW7HH0l7J9", "fW7HH0l7J9"];
serviceChecks[TAServices.CLOUDFORMATION] = ["gW7HH0l7J9"];
serviceChecks[TAServices.DYNAMODB] = ["6gtQddfEw6", "c5ftjdfkMr"];
serviceChecks[TAServices.EBS] = [
    "eI7KK0l7J9",
    "dH7RR0l6J9",
    "cG7HH0l7J9",
    "tV7YY0l7J9",
    "gI7MM0l7J9",
    "wH7DD0l3J9",
    "gH5CC0e3J9",
    "dH7RR0l6J3",
    "gI7MM0l7J2",
];
serviceChecks[TAServices.EC2] = ["0Xc6LMYG8P", "iH7PP0l7J9", "aW9HH0l8J6"];
serviceChecks[TAServices.ELB] = ["iK7OO0l7J9", "EM8b3yLRTr", "8wIqYSt25K"];
serviceChecks[TAServices.IAM] = [
    "sU7XX0l7J9",
    "nO7SS0l7J9",
    "pR7UU0l7J9",
    "oQ7TT0l7J9",
    "rT7WW0l7J9",
    "qS7VV0l7J9",
];
serviceChecks[TAServices.KINESIS] = ["bW7HH0l7J9"];
serviceChecks[TAServices.RDS] = [
    "jtlIMO3qZM",
    "7fuccf1Mx7",
    "gjqMBn6pjz",
    "XG0aXHpIEt",
    "jEECYg2YVU",
    "gfZAn3W7wl",
    "dV84wpqRUs",
    "keAhfbH5yb",
    "dBkuNCvqn5",
    "3Njm0DJQO9",
    "pYW8UkYz2w",
    "UUDvOa5r34",
    "dYWBaXaaMM",
    "jEhCtdJKOY",
    "P1jhKWEmLa",
];
serviceChecks[TAServices.ROUTE53] = [
    "dx3xfcdfMr",
    "ru4xfcdfMr",
    "ty3xfcdfMr",
    "dx3xfbjfMr",
    "dx8afcdfMr",
];
serviceChecks[TAServices.SES] = ["hJ7NN0l7J9"];
serviceChecks[TAServices.VPC] = ["lN7RR0l7J9", "kM7QQ0l7J9", "jL7PP0l7J9"];
class TAHelper {
    constructor() {
        this.supportHelper = new solutions_utils_1.SupportHelper();
        this.moduleName = __filename.split("/").pop();
    }
    async refreshChecks(services) {
        solutions_utils_1.logger.debug({
            label: this.moduleName,
            message: `refreshing TA checks for: ${services}`,
        });
        const checkIds = [];
        services.forEach((service) => {
            const _checks = serviceChecks[service];
            if (_checks) {
                checkIds.push(..._checks);
            }
        });
        await Promise.allSettled(checkIds.map(async (checkId) => {
            await this.supportHelper.refreshTrustedAdvisorCheck(checkId);
        }));
    }
}
exports.TAHelper = TAHelper;
