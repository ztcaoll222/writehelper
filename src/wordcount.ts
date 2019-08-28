import * as vscode from 'vscode';
import * as CommonUtil from './CommonUtil';
import util = require("util");

/**
 * 统计所有字符
 *
 * @param text 字符串
 */
function countAllWord(text: string): number {
    text = CommonUtil.cleanString(text);
    return text.length;
}

/**
 * 统计除符号的字数
 *
 * @param text 字符串
 */
function countWithoutSymbolWord(text: string): number {
    text = CommonUtil.cleanString(text);
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

export class WordCount {
    // 统计选项命令
    public static countFlagCommand: string = "extension.writeHelper.selectCountFlag";
    // 统计 flag {0: 所有文字, 1: 去除符号}
    private countFlag: number = 0;
    // 字数统计状态栏
    private wordCountStatusBarItem: vscode.StatusBarItem;
    // 状态栏-所有文字模板
    private static allWordCountsFormat: string = `$(megaphone) 字符: %d`;
    // 状态栏-去除符号
    private static withoutSymbolWordCountsFormat: string = `$(megaphone) 字数(除符号): %d`;

    /**
     * 根据 countFlag 获得统计字数状态栏的文本
     *
     * @param countFlag 统计 flag @see countFlag
     */
    private static getWordCountStatusBarItemTextByCountFlag(countFlag: number): string {
        let n = getNumberOfSelected(vscode.window.activeTextEditor, countFlag);
        let text: string = "";
        switch (countFlag) {
            case 0:
                text = util.format(WordCount.allWordCountsFormat, n);
                break;
            case 1:
                text = util.format(WordCount.withoutSymbolWordCountsFormat, n);
                break;
            default:
                break;
        }
        return text;
    }

    /**
     * 获得统计字数状态栏的文本
     */
    private getWordCountStatusBarItemText(): string {
        return WordCount.getWordCountStatusBarItemTextByCountFlag(this.countFlag);
    }


    /**
     * 显示统计字数状态栏
     */
    private showWordCountStatusBarItem(): void {
        this.wordCountStatusBarItem.text = this.getWordCountStatusBarItemText();
        this.wordCountStatusBarItem.show();
    }

    /**
     * 初始化状态栏项
     *
     * @param subscriptions
     */
    private initWordCountStatusBarItem(subscriptions: { dispose(): any; }[] | vscode.Disposable[]): void {
        this.wordCountStatusBarItem.command = WordCount.countFlagCommand;
        subscriptions.push(this.wordCountStatusBarItem);
        subscriptions.push(vscode.window.onDidChangeActiveTextEditor(this.showWordCountStatusBarItem, this, subscriptions));
        subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.showWordCountStatusBarItem, this, subscriptions));
        this.showWordCountStatusBarItem();
    }

    /**
     * 初始化字数统计 flag 快速选择
     *
     * @param subscriptions
     */
    private initCountFlagQuickPickDisposable(subscriptions: { dispose(): any; }[] | vscode.Disposable[]): void {
        let countFlagQuickPickDisposable = vscode.commands.registerCommand(WordCount.countFlagCommand, () => {
            vscode.window.showQuickPick([{
                label: WordCount.getWordCountStatusBarItemTextByCountFlag(0),
                code: 0,
                description: "字符"
            }, {
                label: WordCount.getWordCountStatusBarItemTextByCountFlag(1),
                code: 1,
                description: "去除符号"
            }]).then(value => {
                if (value) {
                    this.countFlag = value.code;
                    this.showWordCountStatusBarItem();
                }
            });
        });
        subscriptions.push(countFlagQuickPickDisposable);
    }

    constructor(countFlag: number, subscriptions: { dispose(): any; }[] | vscode.Disposable[]) {
        this.countFlag = countFlag;
        this.wordCountStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);

        this.initWordCountStatusBarItem(subscriptions);
        this.initCountFlagQuickPickDisposable(subscriptions);
    }
}
