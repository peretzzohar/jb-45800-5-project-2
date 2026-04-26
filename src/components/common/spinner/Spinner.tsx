import loadingGif from '../../../assets/loading-gif.gif'
import './Spinner.css'

type SpinnerProps = {
  label?: string
  className?: string
  size?: number
}

export default function Spinner({ label = 'Loading...', className = '', size = 48 }: SpinnerProps) {
  return (
    <div className={`spinner ${className}`.trim()} role='status' aria-live='polite'>
      <img
        className='spinner-image'
        src={loadingGif}
        alt=''
        aria-hidden='true'
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {label ? <p className='spinner-label'>{label}</p> : null}
    </div>
  )
}
