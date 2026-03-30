import Link from 'next/link'
import React from 'react'

const Navbar = () => {
  return (
   <section className='bg-black sticky top-0 z-50'>
   <nav className='container mx-auto bg-black '>
    <div className='flex items-center justify-between py-4 '>
        <h1 className='text-2xl font-bold text-white'>EnvMate</h1>
       <Link href='/login' className='bg-white py-2 px-4 rounded-sm underline'>Get Started</Link>
    </div>


   </nav>
   </section>
  )
}

export default Navbar
