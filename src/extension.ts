import * as vscode from 'vscode';
import path = require("path");
import util = require("util");
import request = require('request');
import schedule = require('node-schedule');

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

// 统计选项命令
let countFlagCommand = "extension.writeHelper.selectCountFlag";
// 统计 flag {0: 所有文字, 1: 去除符号}
let countFlag: number = 0;
// 字数统计状态栏
let wordCountStatusBarItem: vscode.StatusBarItem;
// 状态栏-所有文字模板
let allWordCountsFormat: string = `$(megaphone) 字符: %d`;
// 状态栏-去除符号
let withoutSymbolWordCountsFormat: string = `$(megaphone) 字数(除符号): %d`;

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

	// 读取统计 flag 设置
	let tCountFlag = vscode.workspace.getConfiguration().get("writeHelper.countFlag");
	if (tCountFlag) {
		countFlag = <number>tCountFlag;
	}
}

/**
 * 清理字符串
 * 
 * @param text 字符串
 */
function cleanString(text: string): string {
	// 去掉转义字符
	text = text.replace(/[\b\f\n\r\t]/g, '');
	// 去掉特殊字符
	text = text.replace(/\s/g, '');
	return text;
}

/**
 * 统计所有字符
 * 
 * @param text 字符串
 */
function countAllWord(text: string): number {
	text = cleanString(text);
	return text.length;
}

/**
 * 统计除符号的字数
 * 
 * @param text 字符串
 */
function countWithoutSymbolWord(text: string): number {
	text = cleanString(text);
	// 只保留中文数字字母
	text = text.replace(/[^a-zA-Z0-9\u4E00-\u9FA5]/g, '');
	return text.length;
}

/**
 * 统计字数
 * 
 * @param editor 编辑区对象
 * @param countFlag 统计 flag @see countFlag
 */
function getNumberOfSelected(editor: vscode.TextEditor | undefined, countFlag: number): number {
	let counts = 0;
	if (editor) {
		let text = editor.document.getText(editor.selection);
		if (text.length === 0) {
			text = editor.document.getText();
		}

		switch (countFlag) {
			case 0:
				counts = countAllWord(text);
				break;
			case 1:
				counts = countWithoutSymbolWord(text);
				break;
			default:
				break;
		}
	}
	return counts;
}

/**
 * 获得统计字数状态栏的文本
 * 
 * @param countFlag 统计 flag @see countFlag
 */
function getStatusBarItemText(countFlag: number): string {
	let n = getNumberOfSelected(vscode.window.activeTextEditor, countFlag);
	let text: string = "";
	switch (countFlag) {
		case 0:
			text = util.format(allWordCountsFormat, n);
			break;
		case 1:
			text = util.format(withoutSymbolWordCountsFormat, n);
			break;
		default:
			break;
	}
	return text;
}

/**
 * 更新状态栏
 */
function updateStatusBarItem(): string {
	// 更新统计字数状态栏
	return getStatusBarItemText(countFlag);
}

/**
 * 显示状态栏
 */
function showStatusBarItem(): void {
	// 显示统计字数状态栏
	wordCountStatusBarItem.text = updateStatusBarItem();
	wordCountStatusBarItem.show();
}

// 初始化状态栏项
function initStatusBarItem(subscriptions: { dispose(): any; }[] | vscode.Disposable[]): void {
	// 初始化统计字数状态栏
	wordCountStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	wordCountStatusBarItem.command = countFlagCommand;
	subscriptions.push(wordCountStatusBarItem);
	subscriptions.push(vscode.window.onDidChangeActiveTextEditor(showStatusBarItem));
	subscriptions.push(vscode.window.onDidChangeTextEditorSelection(showStatusBarItem));
	showStatusBarItem();
}

// 初始化快速选择
function initQuickPickDisposable(subscriptions: { dispose(): any; }[] | vscode.Disposable[]): void {
	// 初始化字数统计 flag 快速选择
	let countFlagQuickPickDisposable = vscode.commands.registerCommand(countFlagCommand, () => {
		vscode.window.showQuickPick([{
			label: getStatusBarItemText(0),
			code: 0,
			description: "字符"
		}, {
			label: getStatusBarItemText(1),
			code: 1,
			description: "去除符号"
		}]).then(value => {
			if (value) {
				countFlag = value.code;
				showStatusBarItem();
			}
		});
	});
	subscriptions.push(countFlagQuickPickDisposable);
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

// 插件激活时
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "writehelper" is now active!');

	// 打开文件
	vscode.window.showTextDocument(vscode.Uri.file(path.join(context.extensionPath, debugOpenFile)));

	loadConfiguration();

	let subscriptions = context.subscriptions;
	initStatusBarItem(subscriptions);
	initQuickPickDisposable(subscriptions);
	initSchedule();
}

// 插件关闭时
export function deactivate() { }
