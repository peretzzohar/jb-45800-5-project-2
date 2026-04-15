// import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
// import govService, { type GovCityRecord } from '../../../services/currencyService'

// interface CityFormState {
//   city_code: string
//   city_name_en: string
//   city_name_he: string
// }

// const emptyForm: CityFormState = {
//   city_code: '',
//   city_name_en: '',
//   city_name_he: '',
// }

// export default function GovCitiesGrid() {
//   const [rows, setRows] = useState<GovCityRecord[]>([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')
//   const [editingCode, setEditingCode] = useState<number | null>(null)
//   const [form, setForm] = useState<CityFormState>(emptyForm)

//   useEffect(() => {
//     let isMounted = true

//     const loadRows = async () => {
//       try {
//         setLoading(true)
//         setError('')

//         const records = await govService.getCityRecords(10)

//         if (isMounted) {
//           setRows(records)
//         }
//       } catch (err) {
//         console.error(err)
//         if (isMounted) {
//           setError('Unable to load grid data right now.')
//         }
//       } finally {
//         if (isMounted) {
//           setLoading(false)
//         }
//       }
//     }

//     loadRows()

//     return () => {
//       isMounted = false
//     }
//   }, [])

//   function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
//     const { name, value } = event.target
//     setForm((current) => ({
//       ...current,
//       [name]: value,
//     }))
//   }

//   function resetForm() {
//     setEditingCode(null)
//     setForm(emptyForm)
//   }

//   function handleSubmit(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault()

//     const cityNameEn = form.city_name_en.trim()
//     const cityNameHe = form.city_name_he.trim()

//     if (!cityNameEn && !cityNameHe) return

//     const fallbackCode = rows.reduce((maxCode, row) => Math.max(maxCode, row.city_code), 0) + 1
//     const cityCode = Number(form.city_code) || editingCode || fallbackCode

//     const nextRow: GovCityRecord = {
//       city_code: cityCode,
//       city_name_en: cityNameEn || cityNameHe,
//       city_name_he: cityNameHe || cityNameEn,
//       region_name: '',
//     }

//     if (editingCode === null) {
//       setRows((current) => [nextRow, ...current])
//     } else {
//       setRows((current) =>
//         current.map((row) => (row.city_code === editingCode ? nextRow : row)),
//       )
//     }

//     resetForm()
//   }

//   function handleEdit(row: GovCityRecord) {
//     setEditingCode(row.city_code)
//     setForm({
//       city_code: String(row.city_code),
//       city_name_en: row.city_name_en,
//       city_name_he: row.city_name_he,
//     })
//   }

//   function handleDelete(cityCode: number) {
//     setRows((current) => current.filter((row) => row.city_code !== cityCode))

//     if (editingCode === cityCode) {
//       resetForm()
//     }
//   }

//   return (
//     <section className='template-card template-card-full'>
//       <h2>Government Cities Grid</h2>
//       <p>Add, edit, or delete city data inside the grid.</p>

//       {loading && <p className='status-message'>Loading grid data...</p>}
//       {!loading && error && <p className='status-message error'>{error}</p>}

//       <form className='grid-form' onSubmit={handleSubmit}>
//         <input
//           name='city_code'
//           type='number'
//           placeholder='City code'
//           value={form.city_code}
//           onChange={handleInputChange}
//         />
//         <input
//           name='city_name_en'
//           type='text'
//           placeholder='English name'
//           value={form.city_name_en}
//           onChange={handleInputChange}
//         />
//         <input
//           name='city_name_he'
//           type='text'
//           placeholder='Hebrew name'
//           value={form.city_name_he}
//           onChange={handleInputChange}
//         />

//         <div className='grid-actions'>
//           <button type='submit' className='btn btn-primary'>
//             {editingCode === null ? 'Add Row' : 'Save Changes'}
//           </button>
//           {editingCode !== null && (
//             <button type='button' className='btn btn-secondary' onClick={resetForm}>
//               Cancel
//             </button>
//           )}
//         </div>
//       </form>

//       <div className='table-wrapper'>
//         <table className='data-grid'>
//           <thead>
//             <tr>
//               <th>Code</th>
//               <th>English Name</th>
//               <th>Hebrew Name</th>
//               <th>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((row) => (
//               <tr key={row.city_code}>
//                 <td>{row.city_code}</td>
//                 <td>{row.city_name_en || '-'}</td>
//                 <td>{row.city_name_he || '-'}</td>
//                 <td>
//                   <div className='row-actions'>
//                     <button
//                       type='button'
//                       className='btn btn-secondary'
//                       onClick={() => handleEdit(row)}
//                     >
//                       Edit
//                     </button>
//                     <button
//                       type='button'
//                       className='btn btn-danger'
//                       onClick={() => handleDelete(row.city_code)}
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </section>
//   )
// }
