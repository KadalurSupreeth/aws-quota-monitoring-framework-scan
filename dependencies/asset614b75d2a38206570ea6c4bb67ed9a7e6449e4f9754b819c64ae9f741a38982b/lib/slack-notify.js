"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackNotifier = void 0;
const https = __importStar(require("https"));
const url_1 = require("url");
const solutions_utils_1 = require("solutions-utils");
class SlackNotifier {
    constructor() {
        this.ssmHelper = new solutions_utils_1.SSMHelper();
        this.slackHookParameter = process.env.SLACK_HOOK;
    }
    async sendNotification(event) {
        try {
            const slackUrl = (await this.ssmHelper.getParameter(this.slackHookParameter, true))[0];
            const slackMessage = this.slackMessageBuilder(event);
            const processEventResponse = await this.processEvent(slackUrl, slackMessage);
            return {
                result: processEventResponse,
            };
        }
        catch (error) {
            return {
                result: "error",
            };
        }
    }
    slackMessageBuilder(event) {
        let _notifyColor = "#93938f";
        if (event.detail["status"] === "OK")
            _notifyColor = "#36a64f";
        else if (event.detail["status"] === "WARN")
            _notifyColor = "#eaea3c";
        else if (event.detail["status"] === "ERROR")
            _notifyColor = "#bf3e2d";
        let _status = event.detail["status"];
        if (_status === "OK")
            _status = `🆗`;
        else if (_status === "WARN")
            _status = `⚠️`;
        else if (_status === "ERROR")
            _status = `🔥`;
        return {
            attachments: [
                {
                    color: _notifyColor,
                    fields: [
                        {
                            title: "AccountId",
                            value: `${event.account}`,
                            short: true,
                        },
                        {
                            title: "Status",
                            value: _status,
                            short: true,
                        },
                        {
                            title: "TimeStamp",
                            value: event.detail["check-item-detail"]["Timestamp"] ?? event.time,
                            short: true,
                        },
                        {
                            title: "Region",
                            value: `${event.detail["check-item-detail"]["Region"]}`,
                            short: true,
                        },
                        {
                            title: "Service",
                            value: `${event.detail["check-item-detail"]["Service"]}`,
                            short: true,
                        },
                        {
                            title: "LimitName",
                            value: `${event.detail["check-item-detail"]["Limit Name"]}`,
                            short: true,
                        },
                        {
                            title: "CurrentUsage",
                            value: `${event.detail["check-item-detail"]["Current Usage"]}`,
                            short: true,
                        },
                        {
                            title: "LimitAmount",
                            value: `${event.detail["check-item-detail"]["Limit Amount"]}`,
                            short: true,
                        },
                    ],
                    pretext: "*Quota Monitor for AWS Update*",
                    fallback: "new notification from Quota Monitor for AWS",
                    author_name: "@quota-monitor-for-aws",
                    title: "Quota Monitor for AWS Documentation",
                    title_link: "https://aws.amazon.com/solutions/implementations/quota-monitor/",
                    footer: "Take Action?",
                    actions: [
                        {
                            text: "AWS Console",
                            type: "button",
                            url: "https://console.aws.amazon.com/support/home?region=us-east-1#",
                        },
                    ],
                },
            ],
        };
    }
    async postMessage(slackUrl, message) {
        const messageBody = JSON.stringify(message);
        const url = new url_1.URL(slackUrl);
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(messageBody),
            },
        };
        return new Promise((resolve) => {
            const postReq = https.request(url, options, (res) => {
                let body = "";
                res.setEncoding("utf8");
                res.on("data", (chunk) => (body += chunk));
                res.on("end", () => {
                    resolve({
                        body: body,
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                    });
                });
            });
            postReq.write(messageBody);
            postReq.end();
        });
    }
    async processEvent(slackUrl, slackMessage) {
        const response = await this.postMessage(slackUrl, slackMessage);
        if (response.statusCode && response.statusCode < 400) {
            return "Message posted successfully";
        }
        else if (response.statusCode && response.statusCode < 500) {
            solutions_utils_1.logger.warn(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
            return response.statusMessage;
        }
        else {
            return `Server error when processing message: ${response.statusCode} - ${response.statusMessage}`;
        }
    }
}
exports.SlackNotifier = SlackNotifier;
