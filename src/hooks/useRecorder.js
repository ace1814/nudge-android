import { createContext, useContext } from 'react'

export const RecorderContext = createContext({
  openVoice: () => {},
  openText:  () => {},
})

export const useRecorder = () => useContext(RecorderContext)
