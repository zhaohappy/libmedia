import AVFilterNode, { AVFilterNodePort } from './AVFilterNode'
import AVOutputNode from './AVOutputNode'

export default class AVInputNode {

  private nodePort: AVFilterNodePort

  private outputNode: AVFilterNode | AVOutputNode | undefined

  constructor(port: MessagePort) {
    this.nodePort = new AVFilterNodePort(port)
  }

  public connect(node: AVFilterNode | AVOutputNode) {
    const { port: nextPort, index } = node.getFreeInputNodePort()!
    this.nodePort.connect(nextPort)
    node.addInputPeer(this, index)
    this.outputNode = node
  }

}
