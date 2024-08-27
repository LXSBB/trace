import { TraceOptions } from "./baseTrace";
import TraceSdk from "./trace";

let instance: any;

// 初始化
export const init = (options: TraceOptions) => {
  if (instance) {
    return instance
  }
  instance = TraceSdk.init(options);
  console.log('instance: ', instance)
  return instance
};

// @ts-ignore
window.traceSdkInit = init
