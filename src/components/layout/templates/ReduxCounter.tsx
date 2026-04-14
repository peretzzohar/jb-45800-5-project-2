import { useDispatch, useSelector } from 'react-redux'
import { decrement, increment, reset, type AppDispatch, type RootState } from '../../../store/store'

export default function ReduxCounter() {
  const count = useSelector((state: RootState) => state.counter.value)
  const dispatch = useDispatch<AppDispatch>()

  return (
    <section className='template-card'>
      <h2>Simple Redux Counter</h2>
      <p>Use Redux when state needs to be shared between many components or pages.</p>

      <div className='selected-value'>Current value: {count}</div>

      <div className='grid-actions'>
        <button type='button' className='btn btn-secondary' onClick={() => dispatch(decrement())}>
          -1
        </button>
        <button type='button' className='btn btn-primary' onClick={() => dispatch(increment())}>
          +1
        </button>
        <button type='button' className='btn btn-danger' onClick={() => dispatch(reset())}>
          Reset
        </button>
      </div>
    </section>
  )
}
