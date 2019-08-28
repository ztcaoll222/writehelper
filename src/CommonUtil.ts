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

/**
 * 判空
 *
 * @param objs
 */
export function checkObj(...objs: any[]) {
    return objs.every(obj => {
        if (obj) {
            let str = obj.toString();
            return cleanString(str).length !== 0;
        } else {
            return false;
        }
    });
}
