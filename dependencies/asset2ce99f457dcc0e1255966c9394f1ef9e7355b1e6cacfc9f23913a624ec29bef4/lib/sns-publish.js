"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNSPublisher = void 0;
const solutions_utils_1 = require("solutions-utils");
class SNSPublisher {
    constructor() {
        this.snsHelper = new solutions_utils_1.SNSHelper();
        this.topicArn = process.env.TOPIC_ARN;
    }
    async publish(message) {
        await this.snsHelper.publish(this.topicArn, message);
    }
}
exports.SNSPublisher = SNSPublisher;
