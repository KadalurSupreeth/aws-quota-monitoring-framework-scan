"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LimitReport = void 0;
const solutions_utils_1 = require("solutions-utils");
class LimitReport {
    constructor() {
        this.moduleName = __filename.split("/").pop();
    }
    async readQueueAsync() {
        const promises = [];
        const maxLoops = parseInt(process.env.MAX_LOOPS) ?? 10;
        for (let i = 0; i < maxLoops; i++) {
            promises.push(this.processMessages());
        }
        await Promise.allSettled(promises);
    }
    async processMessages() {
        const sqsHelper = new solutions_utils_1.SQSHelper();
        const messages = await sqsHelper.receiveMessages(process.env.SQS_URL, parseInt(process.env.MAX_MESSAGES) ?? 10);
        await Promise.allSettled(messages.map(async (message) => {
            await this.putUsageItemOnDDB(message);
            await sqsHelper.deleteMessage(process.env.SQS_URL, message.ReceiptHandle);
        }));
        solutions_utils_1.logger.info({
            label: this.moduleName,
            message: `queue message processing complete`,
        });
    }
    async putUsageItemOnDDB(message) {
        if (!message.Body)
            return;
        const ddbHelper = new solutions_utils_1.DynamoDBHelper();
        const usageMessage = JSON.parse(message.Body);
        const item = {
            MessageId: message.MessageId,
            AccountId: usageMessage.account,
            TimeStamp: usageMessage.detail["check-item-detail"]["Timestamp"] ??
                usageMessage.time,
            Region: usageMessage.detail["check-item-detail"]["Region"],
            Source: usageMessage.source,
            Service: usageMessage.detail["check-item-detail"]["Service"],
            Resource: usageMessage.detail["check-item-detail"]["Resource"],
            LimitCode: usageMessage.detail["check-item-detail"]["Limit Code"],
            LimitName: usageMessage.detail["check-item-detail"]["Limit Name"],
            CurrentUsage: usageMessage.detail["check-item-detail"]["Current Usage"] ?? "0",
            LimitAmount: usageMessage.detail["check-item-detail"]["Limit Amount"],
            Status: usageMessage.detail["status"],
            ExpiryTime: (new Date().getTime() + 15 * 24 * 3600 * 1000).toString(),
        };
        solutions_utils_1.logger.debug({
            label: this.moduleName,
            message: `usage item to put on dynamodb: ${JSON.stringify(item)}`,
        });
        await ddbHelper.putItem(process.env.QUOTA_TABLE, item);
    }
}
exports.LimitReport = LimitReport;
