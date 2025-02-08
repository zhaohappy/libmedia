import { ComponentOptions } from 'yox'
import AVPlayer, { AVPlayerStatus, ExternalSubtitle } from 'avplayer/AVPlayer'
import * as eventType from 'avplayer/eventType'

import template from './Folder.hbs'
import style from './Folder.styl'
import Node, { movExt, musicExt, subtitleExt } from './Node'
import * as array from 'common/util/array'
import * as indexDB from '../../../util/db'
import generateUUID from 'common/function/generateUUID'
import * as logger from 'common/util/logger'
import * as urlUtil from 'common/util/url'
import * as is from 'common/util/is'
import CustomEvent from 'common/event/CustomEvent'

interface FileNode {
  id: string
  type: 'file' | 'folder'
  name: string
  depth: number
  children?: FileNode[]
  source?: string | File
  opened?: boolean
  handle?: FileHandle | DirectoryHandle
  played: boolean
  paused?: boolean
  parent?: FileNode
  ref?: any
  isLive?: boolean
}

const Folder: ComponentOptions = {

  name: 'Folder',

  template,

  propTypes: {
    player: {
      type: 'object',
      required: true
    },
    language: {
      type: 'object',
      required: true
    }
  },

  data: function () {
    return {
      style,
      // @ts-ignore
      canOpenFolder: typeof showDirectoryPicker === 'function',
      // @ts-ignore
      canUseFilePicker: typeof showOpenFilePicker === 'function',
      tip: '',
      tipTop: 0,
      tipShow: false,
      root: [],
      accept: musicExt.concat(movExt).map((i) => '.' + i).join(', '),
      nextPlayNodeId: ''
    }
  },

  methods: {
    init(player: AVPlayer) {

    },

    findRootNodeBySource(source: string | File, isLive: boolean) {
      const root = this.get('root')
      for (let i = 0; i < root.length; i++) {
        if (root[i].source === source && root[i].isLive === isLive) {
          return root[i]
        }
      }
      return null
    },

    async addDir(dir: DirectoryHandle) {
      let depth = 0

      const stack: FileNode[] = []

      function pop() {
        stack.pop()
        depth--
      }

      async function addFile(handle: FileHandle) {
        const file = await handle.getFile()
        const ext = file.name.split('.').pop()
        if (array.has(movExt, ext) || array.has(musicExt, ext)) {
          const node: FileNode = {
            id: generateUUID(),
            type: 'file',
            name: file.name,
            depth,
            source: file,
            handle,
            played: false,
            parent: stack.length ? stack[stack.length - 1] : null
          }
          stack[stack.length - 1].children.push(node)
        }
      }

      async function addDir(dir: DirectoryHandle) {
        const node: FileNode = {
          id: generateUUID(),
          type: 'folder',
          name: dir.name,
          depth,
          children: [],
          opened: false,
          handle: dir,
          played: false,
          parent: stack.length ? stack[stack.length - 1] : null
        }
        if (stack.length) {
          stack[stack.length - 1].children.push(node)
        }
        stack.push(node)
        depth++

        // @ts-ignore
        for await (const handle of dir.values()) {
          if (handle.kind === 'file') {
            await addFile(handle)
          }
          else if (handle.kind === 'directory') {
            await addDir(handle)
            pop()
          }
        }
      }
      await addDir(dir)
      this.append('root', stack.pop())

    },

    async addFile(file: File, handle?: FileHandle) {
      if (this.findRootNodeBySource(file, false)) {
        return
      }
      this.append('root', {
        id: generateUUID(),
        type: 'file',
        name: file.name,
        depth: 0,
        source: file,
        handle: handle
      })
    },

    addUrl(url: string, isLive: boolean, playAfterAdded?: boolean) {
      const node = this.findRootNodeBySource(url, isLive)
      if (node) {
        if (playAfterAdded) {
          if (node.ref) {
            node.ref.fire('play', node.ref)
          }
          else {
            this.set('nextPlayNodeId', node.id)
          }
        }
        return
      }
      const id = generateUUID()
      const params = urlUtil.parse(url)
      this.append('root', {
        id: id,
        type: 'file',
        name: params.file || url,
        depth: 0,
        source: url,
        isLive
      })
      if (playAfterAdded) {
        this.set('nextPlayNodeId', id)
      }
    },

    async addFileHandle(handle: FileHandle) {
      const file = await handle.getFile()
      await this.addFile(file, handle)
    },

    openDir() {
      // @ts-ignore
      showDirectoryPicker({
        mode: 'read',
        startIn: 'videos',
      }).then(async (dir: DirectoryHandle) => {
        this.addDir(dir)
        this.root.push(dir)
        indexDB.store(indexDB.KEY_FOLDER_ROOT, this.root)
      })
    },

    openFile() {
      const pickerOpts = {
        startIn: 'videos',
        types: [
          {
            description: 'Audios & Videos',
            accept: {
              'application/octet-stream': musicExt.map((ext) => {
                return '.' + ext
              }).concat(movExt.map((ext) => {
                return '.' + ext
              }))
            },
          }
        ],
        excludeAcceptAllOption: true,
        multiple: true
      }
      // @ts-ignore
      showOpenFilePicker(pickerOpts).then(async (fileHandles: FileHandle[]) => {
        for (let i = 0; i < fileHandles.length; i++) {
          this.addFileHandle(fileHandles[i])
          this.root.push(fileHandles[i])
        }
        indexDB.store(indexDB.KEY_FOLDER_ROOT, this.root)
      })
    },

    generateStoreUrl(url: string, isLive: boolean) {
      return `${isLive ? 'libmediaLive:' : ''}${url}`
    },

    openUrl(url: string, isLive: boolean, playAfterAdded?: boolean) {
      if (!url || !is.string(url)) {
        url = this.$refs['url'].value
      }
      if (!url) {
        return
      }
      if (isLive == null) {
        isLive = this.$refs['live'].checked
      }
      this.addUrl(url, isLive, playAfterAdded)
      this.root.push(this.generateStoreUrl(url, isLive))
      indexDB.store(indexDB.KEY_FOLDER_ROOT, this.root)
      this.$refs['url'].value = ''
      this.$refs['live'].checked = false
    },

    fileChange(event) {
      const file: File = event.originalEvent.target.files[0]
      this.addFile(file)
    },

    findNodeById(id: string, root: FileNode[]) {
      for (let i = 0; i < root.length; i++) {
        if (root[i].id === id) {
          return root[i]
        }
        if (root[i].type === 'folder') {
          let result = this.findNodeById(id, root[i].children)
          if (result) {
            return result
          }
        }
      }
    },

    async findSubtitle(node: FileNode) {
      const parent: FileNode = node.parent
      const handle: FileHandle = node.handle as FileHandle

      const subtitle: ExternalSubtitle[] = []

      if (parent) {
        const file = await handle.getFile()
        let fileNameList = file.name.split('.')
        fileNameList.pop()
        let fileName = fileNameList.join('.')
        // @ts-ignore
        for await (const h of parent.handle.values()) {
          if (h.kind === 'file') {
            const target: File = await h.getFile()
            const ext = target.name.split('.').pop()

            let targetNameList = target.name.split('.')
            targetNameList.pop()
            let targetName = targetNameList.join('.')

            if (array.has(subtitleExt, ext)
              && fileName === targetName
            ) {
              subtitle.push({
                title: targetName,
                source: target
              })
            }
          }
        }

        if (subtitle.length) {
          const player = this.get('player') as AVPlayer
          subtitle.forEach((sub) => {
            player.loadExternalSubtitle(sub)
          })
        }
      }
    },

    preventDefault(event: CustomEvent) {
      event.preventDefault()
    },

    play(node) {
      const player = this.get('player') as AVPlayer
      if (node.get('node.id') === this.playNodeId) {
        if (player.getStatus() === AVPlayerStatus.PLAYED) {
          player.pause()
          node.set('node.paused', true)
        }
        else if (player.getStatus() === AVPlayerStatus.PAUSED) {
          player.play()
          node.set('node.paused', false)
        }
        return
      }
      if (this.playNodeId) {
        let root = this.findNodeById(this.playNodeId, this.get('root'))
        while (root) {
          if (root.ref) {
            root.ref.set('node.played', false)
          }
          else {
            root.played = false
          }
          root = root.parent
        }
        this.playNodeId = null
      }
      let root = node
      while (root !== this) {
        root.set('node.played', true)
        root = root.$parent
      }

      if (player.getStatus() === AVPlayerStatus.DESTROYING
        || player.getStatus() === AVPlayerStatus.DESTROYED
      ) {
        return
      }

      if (player.getStatus() === AVPlayerStatus.STOPPED) {
        player.load(node.get('node.source'), { isLive: !!node.get('node.isLive') }).then(() => {
          player.play()
            .catch((error) => {
              this.fire('error', {
                message: `${error}`
              })
            })
          node.set('node.paused', false)
          this.findSubtitle(node.get('node'))
        })
          .catch((error) => {
            this.fire('error', {
              message: `${error}`
            })
          })
        this.playNodeId = node.get('node.id')
        this.fire('playNode', node.get('node'))
      }
      else {
        player.stop().then(() => {
          player.load(node.get('node.source'), { isLive: !!node.get('node.isLive') }).then(() => {
            player.play()
              .catch((error) => {
                this.fire('error', {
                  message: `${error}`
                })
              })
            node.set('node.paused', false)
            this.findSubtitle(node.get('node'))
          })
            .catch((error) => {
              this.fire('error', {
                message: `${error}`
              })
            })
          this.playNodeId = node.get('node.id')
          this.fire('playNode', node.get('node'))
        })
      }
    }
  },

  events: {
    play(event, node) {
      this.play(node)
    },
    delete(event, node) {
      let index = -1
      const root = this.get('root')
      for (let i = 0; i < root.length; i++) {
        if (root[i].id === node.id) {
          index = i
          break
        }
      }
      if (index > -1) {
        this.removeAt('root', index)
      }
      array.remove(this.root, node.handle || this.generateStoreUrl(node.source, node.isLive))
      indexDB.store(indexDB.KEY_FOLDER_ROOT, this.root)
    },

    tip(event, data) {
      if (data) {
        this.set('tipShow', true)
        this.set('tip', data.text)
        this.set('tipTop', data.top - this.$refs['scroll'].scrollTop + 90)
      }
      else {
        this.set('tipShow', false)
      }
    }
  },

  afterMount() {
    this.namespace = '.component_folder' + Math.random()
    indexDB.load(indexDB.KEY_FOLDER_ROOT).then(async (root) => {
      this.root = root || []
      const list = []
      for (let i = 0; i < this.root.length; i++) {
        const handle: FileSystemFileHandle | string = this.root[i]
        try {
          if (is.string(handle)) {
            let url = handle
            const isLive = /^libmediaLive:/.test(url)
            if (isLive) {
              url = url.replace(/^libmediaLive:/, '')
            }
            this.addUrl(url, isLive)
          }
          else {
            // @ts-ignore
            let permission = await handle.queryPermission({
              mode: 'read'
            })

            if (permission !== 'granted') {
              // @ts-ignore
              permission = await handle.requestPermission({
                mode: 'read'
              })
              if (permission !== 'granted') {
                throw new Error(`not has permission to access ${handle.name}`)
              }
            }
            if (handle.kind === 'file') {
              await this.addFileHandle(handle)
            }
            else if (handle.kind === 'directory') {
              await this.addDir(handle)
            }
          }
          list.push(handle)
        }
        catch (error) {
          logger.error('load file handle error, ignore it')
        }
      }
      if (list.length !== this.root.length) {
        indexDB.store(indexDB.KEY_FOLDER_ROOT, list)
      }
      this.fire('folderLoaded')
    })

    const player = this.get('player') as AVPlayer
    player.on(eventType.STOPPED + this.namespace, () => {
      if (this.playNodeId) {
        let node = this.findNodeById(this.playNodeId, this.get('root'))
        if (node) {
          if (node.ref) {
            node.ref.set('node.paused', true)
          }
          else {
            node.paused = true
          }
          let root = node
          while (root) {
            if (root.ref) {
              root.ref.set('node.played', false)
            }
            else {
              root.played = false
            }
            root = root.parent
          }
        }
      }
    })
    player.on(eventType.PAUSED + this.namespace, () => {
      if (this.playNodeId) {
        let node = this.findNodeById(this.playNodeId, this.get('root'))
        if (node) {
          if (node.ref) {
            node.ref.set('node.paused', true)
          }
          else {
            node.paused = true
          }
        }
      }
    })
    player.on(eventType.PLAYED + this.namespace, () => {
      if (this.playNodeId) {
        let node = this.findNodeById(this.playNodeId, this.get('root'))
        if (node) {
          if (node.ref) {
            node.ref.set('node.paused', false)
          }
          else {
            node.paused = false
          }
        }
      }
    })
  },

  beforeDestroy() {
    const player = this.get('player') as AVPlayer
    if (this.namespace) {
      player.off(this.namespace)
    }
  },

  afterUpdate() {
    if (this.get('nextPlayNodeId')) {
      const node = this.findNodeById(this.get('nextPlayNodeId'), this.get('root'))
      if (node) {
        this.set('nextPlayNodeId', '')
        node.ref.fire('play', node.ref)
      }
    }
  },

  components: {
    FolderNode: Node
  }
}

export default Folder
