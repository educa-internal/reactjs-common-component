import { useRef, useEffect, useState, useContext, useMemo } from 'react'
import { LOADING, SUCCESS, ERROR, IDLE } from '../constant'

export const CacheStoreContext = React.createContext({ data: {} })

export function useQueryStore (...dependencies) {
  return useMemo(() => {
    return { data: {} }
  }, [...dependencies])
}

export default function useGetWithContext (key, ...args) {
  // FIXME: Hàm lỗi khi payload change, chưa debug được
  const store = useContext(CacheStoreContext)
  return useSimpleDeduplicateGetData(key, store, ...args)
}

export function useGetDataFromStore () {
  const store = useContext(CacheStoreContext)
  return {
    getDataFromStore: (key) => {
      return store.data[key]
    }
  }
}


export function useSimpleDeduplicateGetData (
  key,
  store,
  request,
  payload,
  options = {},
  dependencies = []
) {
  const dataRef = useRef({
    cancel: undefined,
    settled: false
  })

  if (!store) {
    options.isDisabled = true
  }

  const cancelGetData = () => {
    const { cancel, settled } = dataRef.current
    if (!settled && cancel) {
      if (store) {
        store[key] = null
      }
      cancel()
    }
  }

  const [{ status, data, error, statusCode }, setResult] = useState({
    status: options?.isDisabled ? IDLE : LOADING,
    data: null,
    error: null
  })
  const [reloadKey, setReloadKey] = useState()

  useEffect(async () => {
    dataRef.current.settled = false
    dataRef.current.cancel = undefined

    if (!options || !options.isDisabled) {
      let promise
      if (store[key]) {
        promise = store[key]
      } else {
        promise = request(payload)
        promise.finally(() => {
          dataRef.current.settled = true
        })
        dataRef.current.cancel = promise.cancel
        store[key] = promise
      }
      const { data: responseData, status } = await promise
      if (status === 200) {
        setResult({
          data: responseData,
          status: SUCCESS,
          error: null,
          statusCode: status
        })
      } else if (status >= 400 && status <= 511) {
        // request might be canceled, status --> undefined
        setResult({
          data: null,
          status: ERROR,
          error: data,
          statusCode: status
        })
      }
    } else if (options?.isDisabled && status !== IDLE) {
      setResult({ status: IDLE, data, error: null })
    }
    return cancelGetData
  }, [payload, reloadKey, options?.isDisabled, store, ...dependencies])

  useEffect(() => {
    return cancelGetData
  }, [])

  function reload () {
    if (store[key]) store[key] = null
    if (store.data[key]) store.data[key] = null
    setReloadKey(Date.now())
  }
  store.data[key] = data
  return { status, error, data, statusCode, reload }
}