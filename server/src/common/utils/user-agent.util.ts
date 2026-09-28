interface ParsedUA {
  browser: string;
  os: string;
}

/** 轻量 User-Agent 解析(无第三方依赖) */
export function parseUserAgent(ua: string = ''): ParsedUA {
  const browser = /Edg\/([\d.]+)/.test(ua)
    ? 'Edge'
    : /Chrome\/([\d.]+)/.test(ua)
      ? 'Chrome'
      : /Firefox\/([\d.]+)/.test(ua)
        ? 'Firefox'
        : /Safari\/([\d.]+)/.test(ua)
          ? 'Safari'
          : /MicroMessenger/.test(ua)
            ? '微信内置浏览器'
            : '未知';

  const os = /Windows NT 10/.test(ua)
    ? 'Windows 10/11'
    : /Windows NT 6\.3/.test(ua)
      ? 'Windows 8.1'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Android/.test(ua)
            ? 'Android'
            : /iPhone|iPad/.test(ua)
              ? 'iOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : '未知';
  return { browser, os };
}

/** 内网 IP 归属地占位(生产环境可接入离线 IP 库或第三方 API) */
export function ipToLocation(ip: string = ''): string {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return '本机';
  const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  return isPrivate ? '内网' : '外网';
}
