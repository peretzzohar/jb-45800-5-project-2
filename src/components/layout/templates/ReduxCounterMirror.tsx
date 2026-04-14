import { useDispatch, useSelector } from 'react-redux'
import { decrement, increment, type AppDispatch, type RootState } from '../../../store/store'

export default function ReduxCounterMirror() {
  const count = useSelector((state: RootState) => state.counter.value)
  const dispatch = useDispatch<AppDispatch>()

  return (
    <section className='template-card'>
      <h2>Shared Redux Viewer</h2>
      <p>This component uses the same Redux state as the main counter.</p>

      <div className='selected-value'>Shared counter value: {count}</div>

      <div className='grid-actions'>
        <button type='button' className='btn btn-secondary' onClick={() => dispatch(decrement())}>
          Decrease
        </button>
        <button type='button' className='btn btn-primary' onClick={() => dispatch(increment())}>
          Increase
        </button>
      </div>
    </section>
  )
}
