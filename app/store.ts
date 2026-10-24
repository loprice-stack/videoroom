import { configureStore, type Action, type ThunkAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import conferenceReducer  from '../app/room/conferenceSlice'






export const store = configureStore({
  reducer: {
    conference: conferenceReducer
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'conversations/setConnection',
          'conversations/setSession',
          'calls/setVideoCallHandle',
          'calls/setPeerConnection',
          'calls/setLocalStream',
          'calls/setRemoteStream',
          'calls/setLocalSdp',
          'calls/setRemoteSdp'],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          'conversations.setConnection',
          'conversations.setSession',
          'calls.setVideoCallHandle',
          'calls.setPeerConnection',
          'calls.setLocalStream',
          'calls.setRemoteStream',
          'calls.setLocalSdp',
          'calls.setRemoteSdp'
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'conversations.setConnection',
          'conversations.setSession',
          'calls.setVideoCallHandle',
          'calls.setPeerConnection',
          'calls.setLocalStream',
          'calls.setRemoteStream',
          'calls.setLocalSdp',
          'calls.setRemoteSdp'],
      },
    }),
})





// Infer the type of `store`
export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
// Infer the `AppDispatch` type from the store itself
export type AppDispatch = AppStore['dispatch']
// Define a reusable type describing thunk functions
export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()