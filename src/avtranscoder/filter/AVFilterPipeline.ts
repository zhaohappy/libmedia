/*
 * libmedia AudioEncodePipeline
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

import List from 'cheap/std/collection/List'
import { Mutex } from 'cheap/thread/mutex'
import { AVFrameRef } from 'avutil/struct/avframe'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import * as error from 'avutil/error'
import Pipeline, { TaskOptions } from 'avpipeline/Pipeline'
import { FilterGraph, FilterGraphDes, FilterGraphPortDes, checkFilterGraphInvalid, createFilterGraph } from 'avfilter/graph'
import AVInputNode from 'avfilter/AVInputNode'
import AVOutputNode from 'avfilter/AVOutputNode'


export interface AVFilterTaskOptions extends TaskOptions {
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>
  graph: FilterGraphDes
  inputPorts: FilterGraphPortDes[]
  outputPorts: FilterGraphPortDes[]
}

type SelfTask = AVFilterTaskOptions & {
  avframePool: AVFramePoolImpl
  filterGraph: FilterGraph
  inputNodes: AVInputNode[]
  outputNodes: AVOutputNode[]
}

export default class AVFilterPipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private async createTask(options: AVFilterTaskOptions): Promise<number> {

    const avframePool = new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)

    const filterGraph = createFilterGraph(options.graph, avframePool)
    if (!checkFilterGraphInvalid(filterGraph, options.inputPorts, options.outputPorts)) {
      return error.INVALID_OPERATE
    }

    const inputNodes: AVInputNode[] = []
    const outputNodes: AVOutputNode[] = []
    for (let i = 0; i < options.inputPorts.length; i++) {
      const inputNode = new AVInputNode(options.inputPorts[i].port)
      inputNodes.push(inputNode)
      const next = filterGraph.inputs.find((vertex) => {
        return vertex.id === options.inputPorts[i].id
      })
      inputNode.connect(next.filter)
    }

    for (let i = 0; i < options.outputPorts.length; i++) {
      const outputNode = new AVOutputNode(options.outputPorts[i].port)
      outputNodes.push(outputNode)
      const prev = filterGraph.outputs.find((vertex) => {
        return vertex.id === options.outputPorts[i].id
      })
      prev.filter.connect(outputNode)
    }

    for (let i = 0; i < filterGraph.vertices.length; i++) {
      await filterGraph.vertices[i].filter.ready()
    }

    this.tasks.set(options.taskId, {
      ...options,
      filterGraph,
      inputNodes,
      outputNodes,
      avframePool
    })

    return 0
  }

  public async registerTask(options: AVFilterTaskOptions): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return error.INVALID_OPERATE
    }
    return this.createTask(options)
  }

  public async unregisterTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      for (let i = 0; i < task.filterGraph.vertices.length; i++) {
        task.filterGraph.vertices[i].filter.disconnect()
        await task.filterGraph.vertices[i].filter.destroy()
      }
      this.tasks.delete(taskId)
    }
  }
}
