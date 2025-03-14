import RangeFilterNode from './RangeFilterNode'
import ResampleFilterNode from './audio/ResampleFilterNode'
import FramerateFilterNode from './video/FramerateFilterNode'
import ScaleFilterNode from './video/ScaleFilterNode'
import { AVFramePool } from 'avutil/struct/avframe'
import * as logger from 'common/util/logger'

type ConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends new (...args: infer P) => any ? P : never

type FirstConstructorParameter<T extends abstract new (...args: any) => any> =
  ConstructorParameters<T>[0]

export type GraphNodeType = 'resampler' | 'scaler' | 'range' | 'framerate'

type GraphNodeType2AVFilterConstructor<T extends GraphNodeType> =
  T extends 'resampler'
    ? typeof ResampleFilterNode
    : T extends 'scaler'
      ? typeof ScaleFilterNode
      : T extends 'range'
        ? typeof RangeFilterNode
        : T extends 'framerate'
          ? typeof FramerateFilterNode
          : never

type GraphNodeType2AVFilter<T extends GraphNodeType> =
  T extends 'resampler'
    ? ResampleFilterNode
    : T extends 'scaler'
      ? ScaleFilterNode
      : T extends 'range'
        ? RangeFilterNode
        : T extends 'framerate'
          ? FramerateFilterNode
          : never

type AVFilterGraphFilterOptions<T extends GraphNodeType> = FirstConstructorParameter<GraphNodeType2AVFilterConstructor<T>>

export interface AVFilterGraphDesVertex<T extends GraphNodeType> {
  id: number
  type: T
  options: AVFilterGraphFilterOptions<T>
}

export interface AVFilterGraphVertex<T extends GraphNodeType> {
  id: number
  filter: GraphNodeType2AVFilter<T>
  children: AVFilterGraphVertex<GraphNodeType>[]
  parents: AVFilterGraphVertex<GraphNodeType>[]
}

export interface FilterGraphDes {
  vertices: AVFilterGraphDesVertex<GraphNodeType>[]
  edges: { parent: number, child: number }[]
}

export interface FilterGraphPortDes {
  port: MessagePort
  id: number
}

export interface FilterGraph {
  vertices: AVFilterGraphVertex<GraphNodeType>[]
  edges: { parent: number, child: number }[]
  inputs: AVFilterGraphVertex<GraphNodeType>[]
  outputs: AVFilterGraphVertex<GraphNodeType>[]
}

function createFilter(vertex: AVFilterGraphDesVertex<GraphNodeType>, avframePool?: AVFramePool) {
  const options = vertex.options
  if (avframePool) {
    options.avframePool = avframePool
  }

  switch (vertex.type) {
    case 'resampler':
      return new ResampleFilterNode(options as AVFilterGraphFilterOptions<'resampler'>)
    case 'scaler':
      return new ScaleFilterNode(options as AVFilterGraphFilterOptions<'scaler'>)
    case 'range':
      return new RangeFilterNode(options as AVFilterGraphFilterOptions<'range'>)
    case 'framerate':
      return new FramerateFilterNode(options as AVFilterGraphFilterOptions<'framerate'>)
    default:
      throw new Error(`invalid GraphNodeType, ${vertex.type}`)
  }
}

let id = 0
export function createGraphDesVertex<T extends GraphNodeType>(type: T, options: AVFilterGraphFilterOptions<T>): AVFilterGraphDesVertex<T> {
  return {
    id: id++,
    type,
    options
  }
}

export function createFilterGraph(des: FilterGraphDes, avframePool?: AVFramePool): FilterGraph {
  const vertices: AVFilterGraphVertex<GraphNodeType>[] = []
  const inputs: AVFilterGraphVertex<GraphNodeType>[] = []
  const outputs: AVFilterGraphVertex<GraphNodeType>[] = []

  const map: Map<number, AVFilterGraphVertex<GraphNodeType>> = new Map()

  const hasChildMap: Map<number, boolean> = new Map()
  const hasParentMap: Map<number, boolean> = new Map()

  des.vertices.forEach((vertex) => {
    const node: AVFilterGraphVertex<GraphNodeType> = {
      id: vertex.id,
      filter: createFilter(vertex, avframePool),
      children: [],
      parents: []
    }
    map.set(node.id, node)
    vertices.push(node)
  })

  des.edges.forEach((edge, index) => {
    const parent = map.get(edge.parent)!
    const child = map.get(edge.child)!

    if (!parent) {
      logger.fatal(`${index} edge parent(${edge.parent}) not found`)
    }
    if (!child) {
      logger.fatal(`${index} edge child(${edge.child}) not found`)
    }
    parent.children.push(child)
    child.parents.push(parent)
    hasChildMap.set(parent.id, true)
    hasParentMap.set(child.id, true)
    parent.filter.connect(child.filter)
  })

  des.vertices.forEach((vertex) => {
    if (!hasParentMap.has(vertex.id)) {
      inputs.push(map.get(vertex.id)!)
    }
    if (!hasChildMap.has(vertex.id)) {
      outputs.push(map.get(vertex.id)!)
    }
  })

  return {
    vertices,
    edges: des.edges,
    inputs,
    outputs
  }
}

export function checkFilterGraphInvalid(graph: FilterGraph, inputs: FilterGraphPortDes[], output: FilterGraphPortDes[]) {
  const inputsMap: Map<number, number> = new Map()
  const outputsMap: Map<number, number> = new Map()

  for (let i = 0; i < inputs.length; i++) {
    if (inputsMap.has(inputs[i].id)) {
      inputsMap.set(inputs[i].id, inputsMap.get(inputs[i].id)! + 1)
    }
    else {
      inputsMap.set(inputs[i].id, 1)
    }
  }

  for (let i = 0; i < output.length; i++) {
    if (outputsMap.has(output[i].id)) {
      outputsMap.set(output[i].id, outputsMap.get(output[i].id)! + 1)
    }
    else {
      outputsMap.set(output[i].id, 1)
    }
  }

  for (let i = 0; i < graph.inputs.length; i++) {
    if (graph.inputs[i].filter.getInputCount() > (inputsMap.get(graph.inputs[i].id) ?? 0)) {
      logger.error(`input filter(${graph.inputs[i].id}) only has ${inputsMap.get(graph.inputs[i].id)} input channel port`)
      return false
    }
  }

  for (let i = 0; i < graph.outputs.length; i++) {
    if (graph.outputs[i].filter.getOutputCount() > (outputsMap.get(graph.outputs[i].id) ?? 0)) {
      logger.error(`output filter(${graph.outputs[i].id}) only has ${outputsMap.get(graph.outputs[i].id)} output channel port`)
      return false
    }
  }

  for (let i = 0; i < graph.vertices.length; i++) {
    if (graph.vertices[i].children.length && graph.vertices[i].parents.length) {
      if (graph.vertices[i].filter.getOutputCount() !== graph.vertices[i].children.length) {
        logger.error(`filter(${graph.vertices[i].id}) only has ${graph.vertices[i].children.length} output channel port`)
        return false
      }
      if (graph.vertices[i].filter.getInputCount() !== graph.vertices[i].parents.length) {
        logger.error(`filter(${graph.vertices[i].id}) only has ${graph.vertices[i].parents.length} input channel port`)
        return false
      }
    }
  }

  return true
}
