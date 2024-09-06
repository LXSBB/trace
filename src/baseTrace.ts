
import { BaseTraceInterface } from './core/interface';
import { onVitals, mapMetric, generateUniqueId } from './core/webvitals';
import { OnBeforeProps, OnFetchDataType } from './core/fetch';
import { dataCategory2BreadcrumbsCategory, dataTypes2BreadcrumbsType, getPerfLevel, getTimestamp, getTraceDataLevel, getTraceDataType, hashCode, isResourceTarget, uuid } from './core/util';
import { BreadcrumbTypes, BreadcrumbsCategorys, TraceDataSeverity, TraceDataTypes, TraceLevelType, TraceTypes } from './typings/common'
import { getFingerprintId } from './core/fingerprint';
import { sendByImg } from './core/send';
import { detect } from './core/detect.js'
import SlsTracker from '@aliyun-sls/web-track-browser'
import { trackerConfig } from './config'

export interface TraceOptions {
  perfOnSend: () => void;
  perfBeforeSend: () => void;
  dsn?: string
  debug?: boolean
  appId: string
  // 是否打开资源监听
  resourceWatch: boolean
  // 是否打开点击监听
  clickWatch: boolean
  // 是否开启用户行为
  breadcrumbEnabled: boolean
  // 是否打开性能检测
  perfWatch: boolean
  maxBreadcrumb?: number
}

interface Navigator {
  connection: any
  mozConnection: any
  webkitConnection: any
}

export class BaseTrace implements BaseTraceInterface {

  // 日志上报后端API
  public dsn: string = ''
  // 页面ID
  public pageId: string = ''
  // 前端路由
  public pageRoute: string = ''
  // 浏览器信息
  public userAgent = detect(navigator)
  // 网络状态
  public connection: Connection = {
    online: true,
    effectiveType: '无法获取'
  }
  // 设备指纹id fingerprintId
  public fpId = ''
  serverId = ''
  userId = ''
  userName = ''
  token = ''
  // appId
  public appId = ''
  // 是否开启debug状态
  public debug = true
  // 性能日志数据
  public perfData: TracePerf = {
    id: ''
  }
  // 资源下载速度监控
  resourceWatch: boolean = false
  // 存储异常资源数据
  public resources: TraceDataResource[] = []
  public result = {}
  // 记录用户行为
  public breadcrumb: TraceBreadcrumbs = []
  // 最大存储用户行为
  public maxBreadcrumb = 10
  // 是否开启用户行为
  public breadcrumbEnabled = true
  public observer = null
  // 存储链路日志数据
  public queue: TraceData[] = []
  // 发送请求时间间隔
  public sendTimer = 1000
  // 阿里日志sdk实例
  public track: any = null

  public constructor(options: TraceOptions) {
    console.log('%cBaseTrace constructor.', 'color:green')
    this.pageId = uuid()
    this.dsn = options.dsn
    this.appId = options.appId
    this.debug = !!options.debug
    this.maxBreadcrumb = options?.maxBreadcrumb ? options.maxBreadcrumb : 10
    // 是否开启用户行为
    this.breadcrumbEnabled = options.breadcrumbEnabled
    // 监听资源加载
    this.resourceWatch = options.resourceWatch
    if (options.perfWatch) {
      this.perfData = {
        id: generateUniqueId()
      }
    }
    // 生成设备指纹id
    this.fpId = getFingerprintId('TraceCourse')
    // 生成性能监测对象，检测资源加载
    // this.observer = new PerformanceObserver((list, observer) => {
    //   list.getEntries().forEach((entry) => {
    //     this.debug && console.log(`name    : ${entry.name}`);
    //     this.debug && console.log(`type    : ${entry.entryType}`);
    //     this.debug && console.log(`duration: ${entry.duration}`);
    //     if (entry.entryType === 'resource') {
    //       this.handleObserverResource(entry as PerformanceResourceTiming)
    //     }
    //   });
    // });
  }

  public log(log: TraceDataLog) {
    this.saveBreadcrumb({
      name: 'customer-log',
      level: log.level,
      type: dataTypes2BreadcrumbsType(log.type),
      category: dataCategory2BreadcrumbsCategory(log.type),
      message: log.message,
      time: getTimestamp(),
    })
    this.debug && console.log(`[log] data ${log}`);
    this.send(log)
  }

  public info(message: string, tag?: string) {
    this.log({
      name: 'customer-info',
      type: TraceDataTypes.LOG,
      level: TraceDataSeverity.Info,
      message,
      time: getTimestamp(),
      dataId: hashCode(`${message}|${tag || ''}`),
      tag,
    })
  }

  public warn(message: string, tag?: string) {
    this.log({
      name: 'customer-warning',
      type: TraceDataTypes.LOG,
      level: TraceDataSeverity.Warning,
      message,
      time: getTimestamp(),
      dataId: hashCode(`${message}|${tag || ''}`),
      tag,
    })
  }

  public error(message: string, tag?: string) {
    this.log({
      name: 'customer-error',
      type: TraceDataTypes.LOG,
      level: TraceDataSeverity.Error,
      message,
      time: getTimestamp(),
      dataId: hashCode(`${message}|${tag || ''}`),
      tag,
    })
  }

  // 配置链路数据
  public setTraceData(data: TraceTypeData | TracePerf, hasTraceId: boolean = false) {
    let type = TraceTypes.CONSOLE
    let level = TraceLevelType.Debug
    let _data = null
    let perf = null
    // 如果有dataId则是异常信息日志
    if (!!(data as TraceTypeData).dataId) {
      type = getTraceDataType((data as TraceTypeData).type)
      level = getTraceDataLevel((data as TraceTypeData).level)
      _data = data as TraceTypeData
    }
    // 如果有id则是性能日志
    if (!!(data as TracePerf).id) {
      type = TraceTypes.PERF
      level = getPerfLevel(data as TracePerf)
      perf = data as TracePerf
    }
    // 获取实时网络状态
    this.connection.online = navigator.onLine
    const traceData: TraceData = {
      type,
      level,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
      data: _data,
      perf,
      breadcrumbs: this.breadcrumb,
      traceId: hasTraceId ? _data?.requestId : uuid(),
      ua: this.userAgent,
      connection: this.connection,
      appId: this.appId,
      url: document.URL,
      pid: this.pageId,
      pageRoute: this.pageRoute,
      userInfo: {
        fpId: this.fpId,
        userId: this.userId,
        userName: this.userName,
        token: this.token,
        serverId: this.serverId
      }
    }
    if (this.resourceWatch) {
      traceData.resources = this.resources
    }
    this.debug && console.log('[setTraceData] traceData: ',traceData)
    return traceData
  }

  // 发送日志
  public send(data: TraceTypeData | TracePerf, isQueue = false) {
    const traceData = isQueue ? data : this.setTraceData(data)
    console.log('%c[send] traceData: ', 'color:red', traceData)
    this.track.send(traceData)
    // sendByImg(this.dsn, traceData)
  }

  // 监听性能
  createPerfReport() {
    const report = (metric) => {
      this.perfData = { ...this.perfData, ...mapMetric(metric) };
    };

    setTimeout(() => {
      const supportedEntryTypes = (PerformanceObserver && PerformanceObserver.supportedEntryTypes) || []
      const isLatestVisibilityChangeSupported = supportedEntryTypes.indexOf('layout-shift') !== -1

      if (isLatestVisibilityChangeSupported) {
        const onVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            console.log('this.send', this.perfData)
            this.send(this.perfData)
            // removeEventListener('visibilitychange', onVisibilityChange, true)
          }
        }
        addEventListener('visibilitychange', onVisibilityChange, true)
      } else {
        addEventListener('pagehide', () => {
          console.log('pagehide', this.perfData)
          this.send(this.perfData)
        }, { capture: true, once: true })
      }
    })

    return report
  }

  // 报错错误信息
  public saveError(event: ErrorEvent) {
    const target = event.target || event.srcElement;
    const isResTarget = isResourceTarget(target as HTMLElement);
    if (!isResTarget) {
      // 是脚本类型文件报错
      const traceData: TraceTypeData = {
        dataId: hashCode(`${event.type}-${event.error.stack}`),
        name: 'script-error',
        level: TraceDataSeverity.Error,
        message: event.message,
        time: getTimestamp(),
        type: TraceDataTypes.JAVASCRIPT,
        stack: event.error.stack
      }
      this.saveBreadcrumb({
        name: event.error.name,
        type: BreadcrumbTypes.CODE_ERROR,
        category: BreadcrumbsCategorys.Exception,
        level: TraceDataSeverity.Error,
        message: event.message,
        stack: event.error.stack,
        time: getTimestamp()
      })
      this.debug && console.log('[onScriptError] event: ', event)
      this.queue.push(this.setTraceData(traceData))
    } else {
      // 资源类型元素报错
      const url = (target as HTMLElement).getAttribute('src') || (target as HTMLElement).getAttribute('href')
      const traceData: TraceTypeData = {
        dataId: hashCode(`${(target as HTMLElement).nodeName.toLowerCase()}-${event.message}${url}`),
        name: 'resource-load-error',
        level: TraceDataSeverity.Warning,
        message: (event.target as any)?.outerHTML,
        time: getTimestamp(),
        type: TraceDataTypes.RESOURCE,
        stack: null
      }
      this.resources.push(traceData)
      this.saveBreadcrumb({
        name: traceData.name,
        type: BreadcrumbTypes.RESOURCE,
        category: BreadcrumbsCategorys.Exception,
        level: TraceDataSeverity.Warning,
        message: event.message,
        time: getTimestamp()
      })
      this.debug && console.log('[onResourceError] event: ', event)
      this.queue.push(this.setTraceData(traceData))
    }
  }

  // 收集加载速度异常的资源信息
  public handleObserverResource(entry: PerformanceResourceTiming) {
    if (entry.entryType === 'resource') {
      let level = TraceDataSeverity.Info
      if (entry.duration > 1000 && entry.duration < 1500) {
        level = TraceDataSeverity.Warning
      } else  if (entry.duration > 1500) {
        level = TraceDataSeverity.Error
      }
      entry.duration > 1000 && this.resources.push({
        url: entry.name,
        name: `${entry.entryType}-duration-${entry.initiatorType}`,
        type: TraceDataTypes.PERF,
        level,
        message: `duration:${Math.round(entry.duration)}`,
        time: getTimestamp(),
        dataId: hashCode(`${entry.entryType}-${entry.name}`),
      })
    }
  }

  // 请求之前发送日志
  onFetchBefore(props: OnBeforeProps){
    this.saveBreadcrumb({
      name: 'fetch',
      level: TraceDataSeverity.Normal,
      type: BreadcrumbTypes.FETCH,
      category: BreadcrumbsCategorys.Http,
      message: props.url,
      time: getTimestamp(),
      request: {
        method: props.method,
        url: props.url,
        options: props.options
      }
    })
  }

  // 请求之后发送日志
  onFetchAfter(result: OnFetchDataType) {
    this.saveBreadcrumb({
      name: 'fetch-response-info',
      level: TraceDataSeverity.Normal,
      type: BreadcrumbTypes.FETCH,
      category: BreadcrumbsCategorys.Http,
      message: result.status,
      time: getTimestamp(),
      response: {
        status: result.status,
        statusText: result.statusText
      }
    })
    const traceBaseData: TraceBaseData = {
      dataId: hashCode(`${result.url}-${result.method}-${result.status}-${result.statusText}`),
      name: 'fetch-response-info',
      level: TraceDataSeverity.Info,
      message: '',
      time: getTimestamp(),
      type: TraceDataTypes.HTTP
    }
    const data: TraceDataFetch = {
      ...traceBaseData,
      url: result.url,
      status: result.status,
      message: result.statusText,
      method: result.method,
      body: result.body,
      elapsedTime: result.elapsedTime,
      httpType: 'fetch',
      response: result.response,
      requestId: result.traceId
    }
    this.debug && console.log('[onFetchAfter] data: ', result)
    this.queue.push(this.setTraceData(data, true))
  }

  // 请求报错日志发送
  public onFetchError(message: OnFetchDataType) {
    this.saveBreadcrumb({
      name: 'fetch-response-error',
      level: TraceDataSeverity.Critical,
      type: BreadcrumbTypes.FETCH,
      category: BreadcrumbsCategorys.Http,
      time: getTimestamp(),
      response: {
        status: message.status,
        statusText: message.statusText
      }
    })
    const traceBaseData: TraceBaseData = {
      dataId: hashCode(`${message.url}-${message.method}-${message.status}-${message.statusText}`),
      name: 'fetch-error',
      level: TraceDataSeverity.Critical,
      message: '',
      time: getTimestamp(),
      type: TraceDataTypes.HTTP
    }
    const errorData: TraceDataFetch = {
      ...traceBaseData,
      url: message.url,
      status: message.status,
      message: message.statusText,
      method: message.method,
      body: message.body,
      elapsedTime: message.elapsedTime,
      httpType: 'fetch',
      response: message.response,
      requestId: message.traceId
    }
    this.debug && console.log('[onFetchError] data: ', message)
    this.queue.push(this.setTraceData(errorData))
  }

  // 监听全局报错
  public onGlobalError() {
    const _t = this
    window.addEventListener('error', (event) => {
      _t.saveError(event)
    }, true)
    // 捕获未catch的reject
    window.addEventListener('unhandledrejection', (event: any) => {
      this.debug && console.log(event)
      if (event instanceof PromiseRejectionEvent) {
        const errorEvent = new ErrorEvent("promiseRejection", {
          message: event.reason.toString(),
          error: event.reason,
        });
        _t.saveError(errorEvent);
      } else if (event instanceof ErrorEvent) {
        _t.saveError(event);
      }
    })
  }

  // 监听全局点击事件
  public onGlobalClick() {
    const _t = this
    window.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const innerHTML = target.innerHTML
      const bc: TraceAction = {
        name: 'click',
        level: TraceDataSeverity.Normal,
        type: BreadcrumbTypes.CLICK,
        category: BreadcrumbsCategorys.User,
        message: innerHTML,
        time: getTimestamp()
      }
      this.saveBreadcrumb(bc)
    })
  }

  // 监听网络信息
  public connectionWatch() {
    const _t = this
    const connection = (navigator as unknown as Navigator ).connection ||
      (navigator as unknown as Navigator ).mozConnection ||
      (navigator as unknown as Navigator ).webkitConnection;
    if (connection) {
      _t.connection.effectiveType = connection.effectiveType
      connection.addEventListener('change', () => {
        this.debug && console.log('[connectionChange] message',connection.effectiveType)
        _t.connection.effectiveType = connection.effectiveType
      });
    }
  }

  // 监听资源加载
  public onObserverResource() {
    const _t = this
    this.observer = new PerformanceObserver((list, observer) => {
      list.getEntries().forEach((entry: PerformanceResourceTiming) => {
        this.debug && console.log(`name    : ${entry.name}`);
        this.debug && console.log(`type    : ${entry.entryType}`);
        this.debug && console.log(`duration: ${entry.duration}`);
        _t.handleObserverResource(entry)
      });
    });
    this.observer.observe({
      entryTypes: ["resource"],
    });
  }

  // 收集行为事件
  public saveBreadcrumb(data: TraceAction) {
    if (this.breadcrumbEnabled) {
      this.breadcrumb.push(data)
      if (this.breadcrumb.length > this.maxBreadcrumb) {
        this.breadcrumb.shift()
      }
    }
  }

  public setUserinfo(info: any) {
    this.userId = info.userId
    this.userName = info.userName
    this.token = info.token
    this.serverId = info.serverId
  }
  public setPageInfo(info: any) {
    this.pageRoute = info.pageRoute
  }
  public getUuid() {
    return uuid()
  }

  // 初始化实例
  public static init(options: TraceOptions): BaseTrace {
    const traceSdk = new BaseTrace(options)
    traceSdk.track = new SlsTracker(trackerConfig)
    // 监听全局报错
    traceSdk.onGlobalError()
    // 监听资源加载
    traceSdk.resourceWatch && traceSdk.onObserverResource()
    // 监听全局点击事件
    options.clickWatch && traceSdk.onGlobalClick()
    // 监听页面性能
    options.perfWatch && onVitals(traceSdk.createPerfReport())
    traceSdk.connectionWatch()
    // 延迟上报链路数据
    setInterval(() => {
      options.debug && console.log('[queue] traceSdk.queue: ', traceSdk.queue)
      const data = traceSdk.queue.shift()
      if (data) {
        traceSdk.send(data as any, true)
        // 发送日志
        // sendByImg(traceSdk.dsn, data)
      }
    }, traceSdk.sendTimer)

    // @ts-ignore
    window.traceSdk = traceSdk
    return traceSdk
  }
}
