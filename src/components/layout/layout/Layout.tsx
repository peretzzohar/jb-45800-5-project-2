import { useState } from 'react'
import Header from '../header/Header'
import Main from '../main/Main-Nav'
import './Layout.css'


export default function Layout() {
    const [searchTerm, setSearchTerm] = useState('')

    return (
        <div className='Layout'>
            <header>
                <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            </header>
           
            <main>
                <div className='main-content-shell'>
                    <Main searchTerm={searchTerm} />
                </div>
            </main>

        </div>
    )
}