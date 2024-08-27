function bin2hex(str: string) {
  let o = ''
  let n = null
  str += '';
  for (let i = 0, l = str.length; i < l; i++) {
    n = str.charCodeAt(i).toString(16);
    o += n.length < 2 ? '0' + n : n;
  }
  return o;
}

type FingerprintOptions = {
  font?: string
  reactStyle?: string | CanvasGradient | CanvasPattern
  contentStyle?: string | CanvasGradient | CanvasPattern
  textBaseline?: CanvasTextBaseline
}

const DEFAULT_FINGPRINT_OPTIONS: FingerprintOptions = {
  font: "14px 'Arial'",
  reactStyle: "#f60",
  contentStyle: "#f60",
  textBaseline: "top"
}

/**
 * 生成唯一ID（非用户ID）
 * 通过HTML5 Canvas API创建一个接近不重复的唯一指纹ID （帆布指纹识别技术）
 * @param content
 * @returns
 */
export const getFingerprintId = (content: string, options?: FingerprintOptions) => {
  if (!content) {
    console.error("content is empty");
    return null;
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext("2d");
  // 如果不存在，则返回空值，说明不支持Canvas指纹
  if (!ctx) return null;

  const txt = content || 'geekbang';
  ctx.textBaseline = options && options.textBaseline ? options.textBaseline : "top";
  ctx.font = options && options.font ? options.font : "14px 'Arial'";

  ctx.fillStyle = options && options.reactStyle ? options.reactStyle : "#f60";
  // 先画一个62x20矩形内容
  ctx.fillRect(125, 1, 62, 20);

  ctx.fillStyle = options && options.contentStyle ? options.contentStyle : "#069";
  // 把字填充到矩形内
  ctx.fillText(txt, 2, 15);
  // ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  // ctx.fillText(txt, 4, 17);

  const b64 = canvas.toDataURL().replace("data:image/png;base64,","");
  const bin = atob(b64);
  const crc = bin2hex(bin.slice(-16,-12));
  return crc;
}
