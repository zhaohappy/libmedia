import type AVFilterNode from './AVFilterNode'
import { AVFilterNodePort } from './AVFilterNode'
import type AVInputNode from './AVInputNode'

export default class AVOutputNode {

  public nodePort: AVFilterNodePort

  private inputNode: AVFilterNode | AVInputNode | undefined

  constructor(port: MessagePort) {
    this.nodePort = new AVFilterNodePort(port)
  }

  public getFreeInputNodePort() {
    return {
      index: 0,
      port: this.nodePort
    }
  }

  public addInputPeer(node: AVFilterNode | AVInputNode) {
    this.inputNode = node
  }

}
