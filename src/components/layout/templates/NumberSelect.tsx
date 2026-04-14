interface NumberSelectProps {
  value: number
  onChange: (value: number) => void
}

export default function NumberSelect({ value, onChange }: NumberSelectProps) {
  const numbers = Array.from({ length: 20 }, (_, index) => index + 1)

  return (
    <section className='template-card'>
      <h2>React Number Selector</h2>
      <p>Choose any number between 1 and 20.</p>

      <div className='select-row'>
        <label htmlFor='template-number-select'>Number</label>
        <select
          id='template-number-select'
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {numbers.map((number) => (
            <option key={number} value={number}>
              {number}
            </option>
          ))}
        </select>
      </div>

      <div className='selected-value'>Selected number: {value}</div>
    </section>
  )
}
