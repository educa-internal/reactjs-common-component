import { useRef, useEffect, useState } from 'react'
import { LOADING, SUCCESS, ERROR, IDLE } from '../constant'

/**
  *
  * @param {Promise} request - axios request API
  * @param {Object} payload - tham số truyền vào API
  * @param {Object} options - các lựa chọn cấu hình gọi lại api
  * @param {Boolean} options.isDisabled 
  * @returns
*/
export function useGetData (request, payload, options = {}, dependencies = []) {
  const dataRef = useRef({
    cancel: undefined,
    settled: false
  })
  const { isDisabled, payloadNotChange } = options
  let [{ status, data, error, statusCode }, setResult] = useState({
    status: isDisabled ? IDLE : LOADING,
    data: null,
    error: null
  })
  if (data === '' && statusCode === 200) {
    data = null
    statusCode = 404
  }
  const [reloadKey, setReloadKey] = useState()
  const cancelGetData = () => {
    const { cancel, settled } = dataRef.current
    if (!settled && cancel) {
      cancel()
    }
  }
  const payloadDepend = payloadNotChange ? [] : [payload]
  useEffect(async () => {
    const outerStatus = status
    dataRef.current.settled = false
    dataRef.current.cancel = undefined

    if (!isDisabled) {
      if (outerStatus !== LOADING) {
        setResult({ status: LOADING, data })
      }
      const promise = request(payload)
      dataRef.current.cancel = promise.cancel
      promise.finally(() => {
        dataRef.current.settled = true
      })
      const { data: responseData, status } = await promise
      if (status === 200 || status === 204) {
        setResult({
          data: responseData,
          status: SUCCESS,
          error: null,
          statusCode: status
        })
      } else if (status >= 400 && status <= 511) {
        setResult({
          data: null,
          status: ERROR,
          error: data,
          statusCode: status
        })
      }
    } else if (isDisabled && status !== IDLE) {
      setResult({ status: IDLE, data, error: null })
    }
    return cancelGetData
  }, [...payloadDepend, reloadKey, isDisabled, ...dependencies])

  useEffect(() => {
    return cancelGetData
  }, [])

  function reload () {
    setReloadKey(Date.now())
  }
  return { status, error, data, statusCode, reload }
}

