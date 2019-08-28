/**
 * 清理字符串
 *
 * @param text 字符串
 */
export function cleanString(text: string): string {
    // 去掉转义字符
    text = text.replace(/[\b\f\n\r\t]/g, '');
    // 去掉特殊字符
    text = text.replace(/\s/g, '');
    return text;
}
