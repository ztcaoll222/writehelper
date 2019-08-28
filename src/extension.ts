import * as vscode from 'vscode';
import * as wordcount from "./wordcount";
import * as syncfile from "./syncfile";
import * as CommonUtil from "./CommonUtil";
import path = require("path");

// debug 时打开的文件
let debugOpenFile: string = "1.md";
// debug 时打开的工作区
let debugOpenWorkSpace = "file:///Users/ztcaoll222/Desktop/writehelper.code-workspace";

// 身份标识
let id: string = "";

// 字数统计模块
let wordCount: wordcount.WordCount;

// 同步模块
let syncFile: syncfile.SyncFile;

/**
 * 读取设置
 */
function loadSetting() {
    // 读取身份标识设置
    let tId = vscode.workspace.getConfiguration().get("writeHelper.id");
    if (tId) {
        id = <string>tId;
    }
}

/**
 * 初始化字数统计模块
 *
 * @param subscriptions
 */
function initWordCount(subscriptions: { dispose(): any; }[] | vscode.Disposable[]): void {
    // 读取统计 flag 设置
    let tCountFlag = vscode.workspace.getConfiguration().get("writeHelper.countFlag");
    if (tCountFlag) {
        wordCount = new wordcount.WordCount(<number>tCountFlag, subscriptions);
    }
}

/**
 * 初始化定时调度
 */
function initSchedule(): void {
    // 读取是否开启同步设置
    let sync: boolean = false;
    let tSync = vscode.workspace.getConfiguration().get("writeHelper.sync");
    if (tSync) {
        sync = <boolean>tSync;
    }

    // 读取 corn 表达式设置
    let cron: string = "*/30 * * * * *";
    let tCron = vscode.workspace.getConfiguration().get("writeHelper.cron");
    if (tCron) {
        cron = <string>tCron;
    }
    // 读取服务器地址设置
    let host: string;
    let tHost = vscode.workspace.getConfiguration().get("writeHelper.host");
    if (CommonUtil.checkObj(id, tHost)) {
        host = <string>tHost;
        syncFile = new syncfile.SyncFile(id, sync, cron, host);
    }
}

// 插件激活时
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "writehelper" is now active!');

    loadSetting();

    // 打开文件
    vscode.window.showTextDocument(vscode.Uri.file(path.join(context.extensionPath, debugOpenFile)));
    // 打开工作区
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(debugOpenWorkSpace));

    let subscriptions = context.subscriptions;
    initWordCount(subscriptions);
    initSchedule();
}

// 插件关闭时
export function deactivate() {
}
