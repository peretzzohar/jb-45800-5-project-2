// import Home from '../Home/Home'
import { useState } from 'react'
import Footer from '../footer/Footer'
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
                <Main searchTerm={searchTerm} />
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    )
}