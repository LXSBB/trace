/** 接口 */
import {
  TraceTypes,
  BrowserType,
  TraceLevelType,
  TraceDataTypes,
  BreadcrumbTypes,
  BreadcrumbsCategorys,
  TraceBaseDataName
} from './common'
/** 数据类型 */

/** 基类 */

declare global {
  // 全链路日志基类
  type BaseTrace = {
    // 唯一ID，用户侧生成
    traceId: string
    // 日志类型
    type: TraceTypes
    // 日志产生时间
    createdAt: number | string
    // 日志最后更新时间
    updatedAt: number | string
  }

  // 浏览器相关字段基类
  type BaseBrowserTrace = {
    // 当前浏览器的UserAgent
    ua: any
    connection: Connection
  }

  // 网络链接状态
  type Connection = {
    online: boolean
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '无法获取'
  }

  // 用户相关字段基类
  type TypeUserTrace = {
    // 指纹ID，fingerprintId
    fpId: string
    // 用户ID
    uId?: string | number
    userId?: string | number
    // 用户名称
    userName?: string
    // 用户邮箱
    email?: string
    token?: string
    serverId?: string | number
  }

  // 业务相关字段基类
  type BaseAppTrace = {
    // 业务ID
    appId: string
    // 业务名称
    appName?: string
    // 日志级别
    level: TraceLevelType
  }

  // 页面相关字段基类
  type BasePageTrace = {
    // 页面ID
    pid: string
    // 页面标题
    title?: string
    // 当前页面URL
    url: string
    // 页面路由
    pageRoute: string
  }

  type BaseTraceInfo = BaseTrace & BaseBrowserTrace & BaseAppTrace & BasePageTrace

  /** ================ 以下是业务数据类型 ================ */

  type TraceBaseAction = {
    // 动作名称
    name: string
    // 动作等级
    level: TraceDataSeverity
    // 动作时间
    time: number | string
    // 日志类型
    type: BreadcrumbTypes
    // 行为分类
    category: BreadcrumbsCategorys
  }

  // 行为日志
  type TraceAction = TraceBaseAction & {
    index?: number
    // 行为动作相关的信息，可以是DOM，可以是错误信息，可以是自定义信息
    message?: string | number
    // 请求参数
    request?: any
    // 请求结果内容
    response?: any
    // 错误堆栈信息
    stack?: string
  }

  type TraceBaseData = {
    // id
    dataId: number
    // 日志信息名称
    name: string
    // name: TraceBaseDataName
    // 问题级别
    level: TraceDataSeverity
    // 异常信息
    message: string
    // 发生时间
    time: number | string
    // 日志类型
    type: TraceDataTypes
  }

  // 请求类信息
  type TraceDataFetch = TraceBaseData & {
    requestId?: string
    // 执行时间，用于统计耗时
    elapsedTime: number | string
    // 请求方法
    method: 'POST' | 'GET'
    // 请求类型
    httpType: 'fetch' | 'xhr'
    // 请求地址
    url: string
    // 请求参数
    body: string
    // 响应状态
    status: number
    // 请求结果内容
    response?: any
  }

  // 代码异常错误信息
  type TractDataCodeError = TraceBaseData & {
    stack: string
  }

  type TraceDataPromise = TraceBaseData

  type TraceDataResource = TraceBaseData & {
    url?: string
  }

  // 普通日志
  type TraceDataLog = TraceBaseData & {
    tag: string
  }

  type TraceDataPageView = TraceBaseData & {
    route: string
  }

  // webVitals性能收集信息对象
  // type TracePerf = {
  //   id: string
  //   name: 'FCP' | 'CLS' | 'FID' | 'INP' | 'LCP' | 'TTFB'
  //   value: number
  //   delta: number
  //   rating: string
  // }

  type TracePerfRating = 'good' | 'needs improvement' | 'poor'

  type TracePerf = {
    id: string
    LCP?: number
    LCPRating?: TracePerfRating
    FID?: number
    FIDRating?: TracePerfRating
    FCP?: number
    FCPRating?: TracePerfRating
    TTFB?: number
    TTFBRating?: TracePerfRating
    CLS?: number
    CLSRating?: TracePerfRating
    INP?: number
    INPRating?: TracePerfRating
    // cpus?: number
    // memory?: number
    // connection?: {
    //   rtt: number
    //   downlink: number
    //   effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
    // }
  }
  type TracePing = {
    ping: string
    jitter: string
  }

  // 一份错误信息的类型集合
  type TraceTypeData =
    | TraceDataFetch
    | TractDataCodeError
    | TraceDataPromise
    | TraceDataResource
    | TraceDataLog
    | TraceDataPageView

  // 面包屑记录行为日志
  type TraceBreadcrumbs = TraceAction[]

  // 完整的全链路日志
  type TraceData = BaseTraceInfo & {
    userInfo: TypeUserTrace
    // 记录错误信息
    data?: TraceTypeData
    // 记录操作行为
    breadcrumbs?: TraceBreadcrumbs
    // 记录性能信息
    perf?: TracePerf
    // 记录异常资源的信息集合
    resources?: any
  }
}
