import * as vscode from 'vscode';
import path = require("path");
import util = require("util");
import request = require('request');
import schedule = require('node-schedule');
import * as wordcount from "./wordcount";

// debug 时打开的文件
let debugOpenFile: string = "1.md";

// 是否开启同步
let sync: boolean = false;
// corn 表达式, 默认是 30 秒同步一次
let cron: string = "*/30 * * * * *";
// 定时同步调度器
let syncSchedule: schedule.Job;
// 服务器地址
let host: string = "";
// 同步地址
let syncAddr: string = "%s/bucket/sync";

// 身份标识
let id: string = "";

let wordCount: wordcount.WordCount;

/**
 * 读取设置
 */
function loadConfiguration(): void {
    // 读取是否开启同步设置
    let tSync = vscode.workspace.getConfiguration().get("writeHelper.sync");
    if (tSync) {
        sync = <boolean>tSync;
    }

    // 读取 corn 表达式设置
    let tCron = vscode.workspace.getConfiguration().get("writeHelper.cron");
    if (tCron) {
        cron = <string>tCron;
    }

    // 读取服务器地址设置
    let tHost = vscode.workspace.getConfiguration().get("writeHelper.host");
    if (tHost) {
        host = <string>tHost;
    }

    // 读取身份标识设置
    let tId = vscode.workspace.getConfiguration().get("writeHelper.id");
    if (tId) {
        id = <string>tId;
    }
}

// 初始化定时调度
function initSchedule(): void {
    // 初始化定时同步调度
    if (sync) {
        syncSchedule = schedule.scheduleJob(cron, () => {
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                let text = editor.document.getText();
                let currentFilePath = editor.document.uri.path;
                request.post(util.format(syncAddr, host)).form({"id": id, "path": currentFilePath, "text": text});
            }
        });
    }
}

/**
 * 显示状态栏
 */
function showStatusBarItem(): void {
    // 显示统计字数状态栏
	wordCount.wordCountStatusBarItem.text = wordCount.updateStatusBarItem();
	wordCount.wordCountStatusBarItem.show();
}

/**
 * 初始化状态栏项
 *
 * @param wordCount
 * @param subscriptions
 */
function initWordCountStatusBarItem(wordCount: wordcount.WordCount, subscriptions: { dispose(): any; }[] | vscode.Disposable[]): void {
    wordCount.wordCountStatusBarItem.command = wordcount.WordCount.countFlagCommand;
    subscriptions.push(wordCount.wordCountStatusBarItem);
    subscriptions.push(vscode.window.onDidChangeActiveTextEditor(showStatusBarItem));
    subscriptions.push(vscode.window.onDidChangeTextEditorSelection(showStatusBarItem));
    showStatusBarItem();
}

/**
 * 初始化字数统计 flag 快速选择
 *
 * @param wordCount
 * @param subscriptions
 */
function initCountFlagQuickPickDisposable(wordCount: wordcount.WordCount, subscriptions: { dispose(): any; }[] | vscode.Disposable[]): void {
    let countFlagQuickPickDisposable = vscode.commands.registerCommand(wordcount.WordCount.countFlagCommand, () => {
        vscode.window.showQuickPick([{
            label: wordCount.getStatusBarItemText(0),
            code: 0,
            description: "字符"
        }, {
            label: wordCount.getStatusBarItemText(1),
            code: 1,
            description: "去除符号"
        }]).then(value => {
            if (value) {
                wordCount.countFlag = value.code;
                showStatusBarItem();
            }
        });
    });
    subscriptions.push(countFlagQuickPickDisposable);
}

// 插件激活时
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "writehelper" is now active!');

    // 打开文件
    vscode.window.showTextDocument(vscode.Uri.file(path.join(context.extensionPath, debugOpenFile)));

    loadConfiguration();

    let subscriptions = context.subscriptions;

    let wordCountStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    // 读取统计 flag 设置
    let tCountFlag = vscode.workspace.getConfiguration().get("writeHelper.countFlag");
    if (tCountFlag) {
        wordCount = new wordcount.WordCount(<number>tCountFlag, wordCountStatusBarItem);
        initWordCountStatusBarItem(wordCount, subscriptions);
        initCountFlagQuickPickDisposable(wordCount, subscriptions);
    }

    initSchedule();
}

// 插件关闭时
export function deactivate() {
}
