import schedule = require('node-schedule');
import request = require('request');
import util = require("util");
import * as CommonUtil from './CommonUtil';
import * as vscode from "vscode";

export class SyncFile {
    // 身份标识
    private id: string;
    // 是否开启同步
    private sync: boolean = false;
    // corn 表达式, 默认是 30 秒同步一次
    private cron: string = "*/30 * * * * *";
    // 定时同步调度器
    private syncSchedule: schedule.Job | undefined;
    // 服务器地址
    private host: string;
    // 同步地址
    private syncAddr: string = "%s/bucket/sync";

    constructor(id: string, sync: boolean, cron: string, host: string) {
        this.id = id;
        if (CommonUtil.checkObj(sync)) {
            this.sync = sync;
        }
        if (CommonUtil.checkObj(cron)) {
            this.cron = cron;
        }
        this.host = host;

        // 初始化定时同步调度
        if (sync) {
            this.syncSchedule = schedule.scheduleJob(cron, () => {
                let editor = vscode.window.activeTextEditor;
                if (editor) {
                    let text = editor.document.getText();
                    let currentFilePath = editor.document.uri.path;
                    request.post(util.format(this.syncAddr, host)).form({
                        "id": id,
                        "path": currentFilePath,
                        "text": text
                    });
                }
            });
        }
    }
}
