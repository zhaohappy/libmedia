

export const KEY_FOLDER_ROOT = 'libmedia_folder_root'

const DB_NAME = 'libmedia_db'
const TABLE = 'store'

let db

let openPromise: Promise<void>

async function open() {
  openPromise = new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = function (event) {
      // @ts-ignore
      db = event.target.result
      if (!db.objectStoreNames.contains(TABLE)) {
        const objectStore = db.createObjectStore(TABLE, { keyPath: 'id', autoIncrement: true })
        objectStore.createIndex('name', 'name', { unique: false })
      }
    }
    request.onsuccess = function (event) {
      // @ts-ignore
      db = event.target.result
      resolve()
    }
    request.onerror = function (event) {
      reject(event)
    }
  })
  return openPromise
}

export async function load(name: string) {
  if (!db) {
    if (openPromise) {
      await openPromise
    }
    else {
      await open()
    }
  }

  return new Promise<any>((resolve, reject) => {
    const transaction = db.transaction([TABLE], 'readwrite')
    const objectStore = transaction.objectStore(TABLE)
    const index = objectStore.index('name')
    const request = index.get(name)

    request.onsuccess = function (event) {
      resolve(event.target.result?.data)
    }
    request.onerror = function (event) {
      reject(event)
    }
  })
}

export async function store(name: string, data: any) {
  if (!db) {
    if (openPromise) {
      await openPromise
    }
    else {
      await open()
    }
  }
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([TABLE], 'readwrite')
    const objectStore = transaction.objectStore(TABLE)
    const index = objectStore.index('name')
    const request = index.get(name)
    request.onsuccess = function (event) {
      if (event.target.result) {
        const request = objectStore.put({
          id: event.target.result.id,
          name,
          data
        })

        request.onsuccess = function () {
          resolve()
        }
        request.onerror = function (event) {
          reject(event)
        }
      }
      else {
        const request = objectStore.put({
          name,
          data
        })

        request.onsuccess = function () {
          resolve()
        }
        request.onerror = function (event) {
          reject(event)
        }
      }
    }
    request.onerror = function (event) {
      reject(event)
    }


  })
}
